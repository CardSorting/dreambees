import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QUEUES, publishMessage } from '../server/utils/queue.ts';
import { JobStatus } from '../server/utils/types.ts';

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(dirname(__dirname), '.env') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
  console.error('Redis environment variables not set');
  process.exit(1);
}

// Initialize Redis
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testRedisConnection() {
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

async function monitorJobStatus(jobId, maxAttempts = 30) {
  const statusKey = `job_status:${jobId}`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await redis.get(statusKey);
      if (!status) {
        console.log('No status found for job:', jobId);
        await delay(10000);
        continue;
      }

      // Parse status if it's a string, otherwise use as is
      const parsedStatus = typeof status === 'string' ? JSON.parse(status) : status;
      console.log('Job status:', parsedStatus);

      if (parsedStatus.status === JobStatus.COMPLETED && parsedStatus.videoUrl) {
        return parsedStatus;
      }

      if (parsedStatus.status === JobStatus.FAILED) {
        throw new Error(`Job failed: ${parsedStatus.error || 'Unknown error'}`);
      }

      // Wait 10 seconds before next attempt
      await delay(10000);
    } catch (error) {
      console.error('Error monitoring job status:', error);
      throw error;
    }
  }
  throw new Error('Timeout waiting for job completion');
}

async function testQueueFlow() {
  try {
    console.log('Testing Redis connection...');
    await testRedisConnection();

    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log('Logging in test user...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'Test123!');
    console.log('Login successful:', userCredential.user.uid);

    // Create a test image (1x1 pixel transparent PNG base64)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Clear any existing status for this job
    const statusKey = `job_status:${jobId}`;
    await redis.del(statusKey);

    // Clear the queue before testing
    while (await redis.lpop(QUEUES.VIDEO_GENERATION)) {
      // Keep popping until queue is empty
    }

    // Publish message to video generation queue
    console.log('Publishing video generation message...');
    const message = {
      jobId,
      userId: userCredential.user.uid,
      data: {
        type: 'generate_video',
        imageData: testImage
      },
      timestamp: Date.now()
    };

    // Verify queue is empty before publishing
    const queueLength = await redis.llen(QUEUES.VIDEO_GENERATION);
    console.log('Current queue length:', queueLength);

    await publishMessage(QUEUES.VIDEO_GENERATION, JSON.stringify(message));

    // Verify message was published
    const newQueueLength = await redis.llen(QUEUES.VIDEO_GENERATION);
    console.log('Queue length after publish:', newQueueLength);

    if (newQueueLength <= queueLength) {
      throw new Error('Message not added to queue');
    }

    console.log('Message published successfully, monitoring job status...');
    const finalStatus = await monitorJobStatus(jobId);
    console.log('Final job status:', finalStatus);

  } catch (error) {
    console.error('Error in queue flow test:', error);
    if (error.code === 'auth/invalid-api-key') {
      console.error('Invalid API key. Please check your environment variables.');
    }
    process.exit(1);
  }
}

testQueueFlow();
