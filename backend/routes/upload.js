const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });
const uploadSessions = new Map();

const storage = multer.diskStorage({
  destination: '/tmp/chunks',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Init upload
router.post('/init', authenticate, async (req, res) => {
  const { filename, fileSize, mimeType, title, description } = req.body;
  const videoId = uuidv4();
  const rawS3Key = `raw/${req.user.id}/${videoId}/${filename}`;
  try {
    const { UploadId } = await s3.send(new CreateMultipartUploadCommand({
      Bucket: process.env.S3_RAW_BUCKET,
      Key: rawS3Key,
      ContentType: mimeType,
    }));
    await pool.query(
      `INSERT INTO videos (id, user_id, title, description, raw_s3_key, status) VALUES ($1, $2, $3, $4, $5, 'uploading')`,
      [videoId, req.user.id, title, description, rawS3Key]
    );
    uploadSessions.set(videoId, { uploadId: UploadId, rawS3Key, parts: [] });
    res.json({ videoId, uploadId: UploadId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Upload chunk
router.post('/chunk', authenticate, upload.single('chunk'), async (req, res) => {
  const { videoId, partNumber, uploadId } = req.body;
  const session = uploadSessions.get(videoId);
  if (!session) return res.status(400).json({ error: 'Invalid upload session' });
  try {
    const fileBuffer = await fs.readFile(req.file.path);
    const { ETag } = await s3.send(new UploadPartCommand({
      Bucket: process.env.S3_RAW_BUCKET,
      Key: session.rawS3Key,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber),
      Body: fileBuffer,
    }));
    session.parts.push({ ETag, PartNumber: parseInt(partNumber) });
    await fs.unlink(req.file.path);
    res.json({ success: true, partNumber, ETag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
});

// Complete upload
router.post('/complete', authenticate, async (req, res) => {
  const { videoId, uploadId } = req.body;
  const session = uploadSessions.get(videoId);
  if (!session) return res.status(400).json({ error: 'Invalid upload session' });
  try {
    const sortedParts = session.parts.sort((a, b) => a.PartNumber - b.PartNumber);
    await s3.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_RAW_BUCKET,
      Key: session.rawS3Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: sortedParts },
    }));
    await pool.query("UPDATE videos SET status='queued', updated_at=NOW() WHERE id=$1", [videoId]);
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ videoId, rawS3Key: session.rawS3Key, userId: req.user.id, timestamp: new Date().toISOString() }),
      MessageGroupId: 'transcode',
      MessageDeduplicationId: videoId,
    }));
    uploadSessions.delete(videoId);
    res.json({ success: true, videoId, status: 'queued' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

module.exports = router;
