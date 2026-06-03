import os
import boto3
import subprocess
import tempfile
import json
import requests
import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

QUALITY_PRESETS = [
    {
        'name': '1080p',
        'width': 1920,
        'height': 1080,
        'video_bitrate': '5000k',
        'audio_bitrate': '192k',
        'segment_time': 6,
    },
    {
        'name': '720p',
        'width': 1280,
        'height': 720,
        'video_bitrate': '2800k',
        'audio_bitrate': '128k',
        'segment_time': 6,
    },
    {
        'name': '480p',
        'width': 854,
        'height': 480,
        'video_bitrate': '1400k',
        'audio_bitrate': '128k',
        'segment_time': 6,
    },
]


def get_s3_client():
    return boto3.client(
        's3',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def get_sqs_client():
    return boto3.client(
        'sqs',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def transcode_video(self, video_id: str, raw_s3_key: str, user_id: str):
    """
    Main transcoding task:
    1. Download raw video from S3
    2. Generate thumbnail with FFmpeg
    3. Transcode to 1080p, 720p, 480p HLS
    4. Upload all files to S3 processed bucket
    5. Create master HLS playlist
    6. Notify Node.js webhook
    """
    logger.info(f"🎬 Starting transcode for video {video_id}")
    s3 = get_s3_client()

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            # Step 1: Download raw video
            local_raw = os.path.join(tmpdir, 'raw_video')
            logger.info(f"⬇️  Downloading {raw_s3_key} from S3...")
            s3.download_file(settings.S3_RAW_BUCKET, raw_s3_key, local_raw)

            # Step 2: Get duration
            duration = get_video_duration(local_raw)
            logger.info(f"📊 Video duration: {duration}s")

            # Step 3: Generate thumbnail
            thumbnail_path = os.path.join(tmpdir, 'thumbnail.jpg')
            generate_thumbnail(local_raw, thumbnail_path, at_second=min(5, duration // 2))
            thumbnail_key = f"thumbnails/{user_id}/{video_id}/thumb.jpg"
            s3.upload_file(
                thumbnail_path,
                settings.S3_PROCESSED_BUCKET,
                thumbnail_key,
                ExtraArgs={'ContentType': 'image/jpeg'},
            )

            # Step 4: Transcode each quality
            qualities_result = []
            for preset in QUALITY_PRESETS:
                quality_name = preset['name']
                logger.info(f"🔧 Transcoding to {quality_name}...")

                output_dir = os.path.join(tmpdir, quality_name)
                os.makedirs(output_dir, exist_ok=True)

                playlist_file = os.path.join(output_dir, 'playlist.m3u8')
                segment_pattern = os.path.join(output_dir, 'segment%04d.ts')

                ffmpeg_cmd = [
                    'ffmpeg', '-i', local_raw,
                    '-vf', (
                        f"scale={preset['width']}:{preset['height']}"
                        f":force_original_aspect_ratio=decrease,"
                        f"pad={preset['width']}:{preset['height']}:(ow-iw)/2:(oh-ih)/2"
                    ),
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-b:v', preset['video_bitrate'],
                    '-maxrate', preset['video_bitrate'],
                    '-bufsize', str(int(preset['video_bitrate'].replace('k', '')) * 2) + 'k',
                    '-c:a', 'aac',
                    '-b:a', preset['audio_bitrate'],
                    '-ar', '44100',
                    '-hls_time', str(preset['segment_time']),
                    '-hls_playlist_type', 'vod',
                    '-hls_segment_filename', segment_pattern,
                    '-hls_flags', 'independent_segments',
                    '-f', 'hls',
                    playlist_file,
                    '-y',
                ]

                result = subprocess.run(
                    ffmpeg_cmd,
                    capture_output=True,
                    text=True,
                    timeout=1800,
                )

                if result.returncode != 0:
                    logger.error(f"FFmpeg error: {result.stderr[-1000:]}")
                    raise Exception(f"FFmpeg failed for {quality_name}")

                # Step 5: Upload HLS files to S3
                s3_base_key = f"processed/{user_id}/{video_id}/{quality_name}"
                total_size = 0

                for filename in os.listdir(output_dir):
                    local_path = os.path.join(output_dir, filename)
                    s3_key = f"{s3_base_key}/{filename}"
                    total_size += os.path.getsize(local_path)
                    content_type = 'application/x-mpegURL' if filename.endswith('.m3u8') else 'video/MP2T'
                    s3.upload_file(
                        local_path,
                        settings.S3_PROCESSED_BUCKET,
                        s3_key,
                        ExtraArgs={'ContentType': content_type, 'CacheControl': 'max-age=31536000'},
                    )

                qualities_result.append({
                    'quality': quality_name,
                    'playlistKey': f"{s3_base_key}/playlist.m3u8",
                    'fileSizeBytes': total_size,
                })
                logger.info(f"✅ {quality_name} done and uploaded")

            # Step 6: Master playlist
            master_playlist = create_master_playlist(qualities_result)
            master_key = f"processed/{user_id}/{video_id}/master.m3u8"
            s3.put_object(
                Bucket=settings.S3_PROCESSED_BUCKET,
                Key=master_key,
                Body=master_playlist.encode('utf-8'),
                ContentType='application/x-mpegURL',
            )

            # Step 7: Notify Node.js
            notify_node_webhook(video_id, qualities_result, thumbnail_key, duration)
            logger.info(f"🎉 Video {video_id} processing complete!")
            return {'status': 'success', 'videoId': video_id}

        except subprocess.TimeoutExpired:
            logger.error(f"FFmpeg timeout for {video_id}")
            raise self.retry(exc=Exception("FFmpeg timeout"))
        except Exception as exc:
            logger.error(f"Transcode error for {video_id}: {exc}")
            raise self.retry(exc=exc)


def get_video_duration(filepath: str) -> int:
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filepath]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    data = json.loads(result.stdout)
    return int(float(data['format']['duration']))


def generate_thumbnail(filepath: str, output: str, at_second: int = 5):
    cmd = [
        'ffmpeg', '-i', filepath,
        '-ss', str(at_second),
        '-vframes', '1',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
        '-q:v', '2', output, '-y',
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)


def create_master_playlist(qualities: list) -> str:
    lines = ['#EXTM3U', '#EXT-X-VERSION:3']
    bandwidth_map = {'1080p': 5500000, '720p': 3000000, '480p': 1500000}
    resolution_map = {'1080p': '1920x1080', '720p': '1280x720', '480p': '854x480'}
    for q in qualities:
        name = q['quality']
        lines.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth_map.get(name, 2000000)},'
            f'RESOLUTION={resolution_map.get(name, "1280x720")},NAME="{name}"'
        )
        lines.append(f"{name}/playlist.m3u8")
    return '\n'.join(lines)


def notify_node_webhook(video_id: str, qualities: list, thumbnail_key: str, duration: int):
    try:
        response = requests.post(
            settings.NODE_WEBHOOK_URL,
            json={'videoId': video_id, 'qualities': qualities, 'thumbnailKey': thumbnail_key, 'duration': duration},
            headers={'x-webhook-secret': settings.WEBHOOK_SECRET},
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"✅ Node.js notified for video {video_id}")
    except requests.RequestException as e:
        logger.error(f"Failed to notify Node.js: {e}")


@shared_task
def poll_sqs_queue():
    """Celery Beat task: polls SQS every 10s for new transcode jobs from Node.js."""
    sqs = get_sqs_client()
    try:
        response = sqs.receive_message(
            QueueUrl=settings.SQS_QUEUE_URL,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=5,
            VisibilityTimeout=1800,
        )
        messages = response.get('Messages', [])
        if not messages:
            return

        for msg in messages:
            try:
                body = json.loads(msg['Body'])
                video_id = body['videoId']
                raw_s3_key = body['rawS3Key']
                user_id = body['userId']
                logger.info(f"📨 New transcode job from SQS: {video_id}")
                transcode_video.delay(video_id, raw_s3_key, user_id)
                sqs.delete_message(
                    QueueUrl=settings.SQS_QUEUE_URL,
                    ReceiptHandle=msg['ReceiptHandle'],
                )
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Invalid SQS message: {e}")
    except Exception as e:
        logger.error(f"SQS poll error: {e}")
