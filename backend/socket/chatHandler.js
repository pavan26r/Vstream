const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

const initializeSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.user.username} connected`);

    socket.on('join_video', async ({ videoId }) => {
      socket.join(`video:${videoId}`);
      const history = await pool.query(`
        SELECT cm.message, cm.created_at, u.username
        FROM chat_messages cm
        JOIN users u ON cm.user_id=u.id
        WHERE cm.video_id=$1
        ORDER BY cm.created_at DESC LIMIT 50
      `, [videoId]);
      socket.emit('chat_history', history.rows.reverse());
    });

    socket.on('send_message', async ({ videoId, message }) => {
      if (!message || message.length > 500) return;
      await pool.query(
        'INSERT INTO chat_messages (video_id, user_id, message) VALUES ($1,$2,$3)',
        [videoId, socket.user.id, message]
      );
      io.to(`video:${videoId}`).emit('new_message', {
        username: socket.user.username,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('leave_video', ({ videoId }) => socket.leave(`video:${videoId}`));
    socket.on('disconnect', () => console.log(`🔌 User ${socket.user.username} disconnected`));
  });
};

module.exports = { initializeSocket };
