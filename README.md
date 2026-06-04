# 🎬 Distributed Video Processing & Streaming Platform

Mini-Netflix/Twitch clone with distributed transcoding.

## Tech Stack
- **Frontend**: React + HLS.js + Socket.io (live chat)
- **Backend API**: Node.js + Express + Socket.io
- **Processing**: Django + Celery + FFmpeg
- **Message Queue**: AWS SQS (Node ↔ Django bridge)
- **Storage**: AWS S3 (raw + processed)
- **CDN**: AWS CloudFront (HLS streaming)
- **DB**: PostgreSQL
- **Cache/Broker**: Redis
- **Containers**: Docker + Docker Compose

---



## Video Upload Flow
```
User uploads file (React)
  → Node.js: S3 Multipart upload (10MB chunks)
  → Node.js: sends job to SQS
  → Django Celery Beat: polls SQS every 10s
  → Celery Worker: FFmpeg transcodes to 1080p/720p/480p HLS
  → S3: HLS segments uploaded
  → Django: notifies Node.js webhook
  → Node.js: DB updated, video marked ready
  → User: streams via CloudFront CDN
```

---

## Scale Workers
```bash
# Scale up Celery workers for heavy load
docker-compose up --scale celery_worker=5 -d
```

---

## Useful Commands
```bash
# View logs
docker-compose logs -f node_app
docker-compose logs -f celery_worker

# Check Celery task status
http://localhost:5555

# Stop everything
docker-compose down

# Stop and delete volumes
docker-compose down -v
```
