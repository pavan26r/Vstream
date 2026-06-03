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

## Quick Start

### Step 1 — AWS Setup
```bash
# Create S3 buckets
aws s3 mb s3://your-raw-videos-bucket --region ap-south-1
aws s3 mb s3://your-processed-videos-bucket --region ap-south-1

# Create SQS FIFO queue
aws sqs create-queue \
  --queue-name transcode-queue.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true \
  --region ap-south-1
```
Then create a CloudFront distribution pointing to your processed bucket.

### Step 2 — Configure .env
Edit `.env` with your actual AWS credentials and resource names.

### Step 3 — Start Everything
```bash
docker-compose up --build -d
```

### Step 4 — Run Migrations
```bash
docker-compose exec django_app python manage.py migrate
```

### Step 5 — Start React Frontend
```bash
cd frontend
npm install
npm start
```

---

## Services & Ports
| Service        | Port | URL                        |
|---------------|------|----------------------------|
| React Frontend | 3000 | http://localhost:3000      |
| Node.js API    | 5000 | http://localhost:5000      |
| Django         | 8000 | http://localhost:8000      |
| Flower Monitor | 5555 | http://localhost:5555      |
| PostgreSQL     | 5432 | localhost:5432             |
| Redis          | 6379 | localhost:6379             |

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
