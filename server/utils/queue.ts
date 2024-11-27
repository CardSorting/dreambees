import { Redis } from '@upstash/redis'
import { JobStatus, type JobStatusType, type JobStatusUpdate, type QueueMessage } from './types'

// Re-export QueueMessage type
export type { QueueMessage } from './types'

export const QUEUES = {
  VIDEO_GENERATION: 'video-generation',
  STATUS_UPDATES: 'status-updates'
}

// Helper function to get Redis client
function getRedisClient() {
  // Ensure we're on the server side
  if (typeof process !== 'undefined' && process.release?.name === 'node') {
    return new Redis({
      url: process.env.REDIS_URL as string,
      token: process.env.REDIS_TOKEN as string,
    })
  }
  throw new Error('Redis operations can only be performed on the server side')
}

export async function publishMessage(queue: string, message: any): Promise<void> {
  try {
    const redis = getRedisClient()
    // Ensure message is properly stringified
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`Publishing message to queue ${queue}:`, messageStr);
    await redis.rpush(queue, messageStr);
  } catch (error) {
    console.error('Failed to publish message:', error)
    throw error
  }
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatusType,
  details: JobStatusUpdate = {}
): Promise<void> {
  try {
    const redis = getRedisClient()
    const statusKey = `job_status:${jobId}`;
    
    // Get existing status to preserve values
    const existingStatus = await redis.get<string>(statusKey);
    let existingData = {};
    
    if (existingStatus) {
      try {
        // Handle both string and object cases
        existingData = typeof existingStatus === 'string' 
          ? JSON.parse(existingStatus)
          : existingStatus;
      } catch (e) {
        console.warn('Failed to parse existing status:', existingStatus);
      }
    }

    // Only update progress if new value is higher or status is completed
    let progress = details.progress;
    if (typeof progress === 'number' && 
        typeof (existingData as any).progress === 'number' && 
        status !== JobStatus.COMPLETED) {
      progress = Math.max(progress, (existingData as any).progress);
    }
    
    const statusUpdate = {
      ...existingData,
      status,
      timestamp: Date.now(),
      ...details,
      progress: progress !== undefined ? progress : (existingData as any).progress
    };
    
    // Store status directly in Redis
    await redis.set(statusKey, JSON.stringify(statusUpdate));
    console.log(`Updated status for job ${jobId}:`, statusUpdate);
    
    // Also publish to status updates queue
    await publishMessage(QUEUES.STATUS_UPDATES, {
      jobId,
      ...statusUpdate
    });
  } catch (error) {
    console.error('Failed to update job status:', error)
    throw error
  }
}

export async function consumeQueue<T>(
  queue: string,
  handler: (message: QueueMessage<T>) => Promise<void>,
  options: { prefetch?: number } = {}
): Promise<void> {
  try {
    const redis = getRedisClient()
    console.log(`Started consuming from queue: ${queue}`)
    
    // Continuous polling
    while (true) {
      try {
        // Try to get a message from the queue
        const messageStr = await redis.lpop<string>(queue)
        
        if (messageStr) {
          console.log(`Raw message received from queue ${queue}:`, messageStr);
          try {
            // Try to parse if it's a string, otherwise use as is
            const content = typeof messageStr === 'string' && messageStr.startsWith('{') 
              ? JSON.parse(messageStr) 
              : messageStr;
              
            console.log(`Parsed message:`, content);
            await handler(content as QueueMessage<T>);
            console.log(`Successfully processed message`);
          } catch (error) {
            console.error('Error processing message:', {
              error: error instanceof Error ? error.message : error,
              messageStr
            });
            // Requeue the message on error
            await redis.rpush(queue, messageStr);
            console.log('Message requeued due to error');
          }
        } else {
          // No message available, wait before polling again
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error('Error processing queue:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  } catch (error) {
    console.error('Failed to start queue consumer:', error)
    throw error
  }
}

// Cleanup function (Redis client doesn't need explicit cleanup)
export async function cleanup(): Promise<void> {
  // No cleanup needed for Redis
}
