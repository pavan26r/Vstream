const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(`
      SELECT v.*, u.username, u.avatar_url,
             ARRAY_AGG(vq.quality) FILTER (WHERE vq.quality IS NOT NULL) as available_qualities
      FROM videos v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN video_qualities vq ON v.id = vq.video_id
      WHERE v.status = 'ready'
      GROUP BY v.id, u.username, u.avatar_url
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ videos: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const videoResult = await pool.query(
      'SELECT v.*, u.username FROM videos v LEFT JOIN users u ON v.user_id=u.id WHERE v.id=$1',
      [req.params.id]
    );
    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });
    const qualitiesResult = await pool.query(
      'SELECT quality, hls_playlist_url FROM video_qualities WHERE video_id=$1',
      [req.params.id]
    );
    const streamUrls = {};
    qualitiesResult.rows.forEach(q => {
      streamUrls[q.quality] = `${process.env.CLOUDFRONT_DOMAIN}/${q.hls_playlist_url}`;
    });
    // Also add master playlist URL
    const videoId = req.params.id;
    const userId = videoResult.rows[0].user_id;
    streamUrls['master'] = `${process.env.CLOUDFRONT_DOMAIN}/processed/${userId}/${videoId}/master.m3u8`;

    await pool.query('UPDATE videos SET views_count=views_count+1 WHERE id=$1', [req.params.id]);
    res.json({ video: videoResult.rows[0], streamUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// My videos (authenticated)
router.get('/user/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM videos WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook from Django when processing done
router.post('/webhook/processed', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) return res.status(403).json({ error: 'Unauthorized' });
  const { videoId, qualities, thumbnailKey, duration } = req.body;
  try {
    await pool.query(
      "UPDATE videos SET status='ready', thumbnail_url=$1, duration=$2, updated_at=NOW() WHERE id=$3",
      [thumbnailKey, duration, videoId]
    );
    for (const q of qualities) {
      await pool.query(
        'INSERT INTO video_qualities (video_id, quality, hls_playlist_url, file_size_bytes) VALUES ($1,$2,$3,$4)',
        [videoId, q.quality, q.playlistKey, q.fileSizeBytes]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
