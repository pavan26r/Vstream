require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const uploadRoutes = require('./routes/upload');
const { initializeSocket } = require('./socket/chatHandler');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

initializeSocket(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`🚀 Node.js server running on port ${PORT}`);
  });
}

startServer();
