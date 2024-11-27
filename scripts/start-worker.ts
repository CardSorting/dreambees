import { startWorker } from '../server/workers/video-generator.worker';
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Worker script can only be run on the server side')
}

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(dirname(__dirname), '.env') });

async function testRedisConnection() {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
    throw new Error('Redis environment variables not set');
  }

  const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  });

  try {
    // Test Redis connection
    const testKey = 'test_connection';
    await redis.set(testKey, 'test');
    const result = await redis.get(testKey);
    await redis.del(testKey);

    if (result === 'test') {
      console.log('Redis connection test successful');
    } else {
      throw new Error('Redis test value mismatch');
    }
  } catch (error) {
    console.error('Redis connection test failed:', error);
    throw error;
  }
}

console.log('Testing Redis connection...');
testRedisConnection()
  .then(() => {
    console.log('Starting video generation worker...');
    return startWorker();
  })
  .catch(error => {
    console.error('Startup error:', error);
    process.exit(1);
  });
