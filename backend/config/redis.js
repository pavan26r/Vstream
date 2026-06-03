const { createClient } = require('redis');

let redisClient;

const connectRedis = async () => {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  await redisClient.connect();
};

const getRedis = () => redisClient;

module.exports = { connectRedis, getRedis };
