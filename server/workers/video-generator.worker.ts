import { consumeQueue, QUEUES } from '../utils/queue'
import { type QueueMessage, type VideoGenerationMessage } from '../utils/types'
import { startVideoGeneration } from '../services/video-processor'

async function handleVideoGeneration(message: QueueMessage<VideoGenerationMessage>) {
  console.log('Handling video generation message:', {
    jobId: message.jobId,
    userId: message.userId,
    type: message.data.type,
    timestamp: message.timestamp
  });

  try {
    console.log('Starting video generation process...');
    await startVideoGeneration({
      jobId: message.jobId,
      imageData: message.data.imageData
    });
    console.log('Video generation completed for job:', message.jobId);
  } catch (error) {
    console.error('Video generation worker error:', {
      jobId: message.jobId,
      error: error instanceof Error ? error.message : error
    });
    throw error; // Let the queue handler handle the error
  }
}

export async function startWorker() {
  try {
    console.log('Starting video generation worker with process ID:', process.pid);
    await consumeQueue<VideoGenerationMessage>(
      QUEUES.VIDEO_GENERATION,
      async (message) => {
        console.log('Worker received message:', {
          jobId: message.jobId,
          userId: message.userId,
          type: message.data?.type,
          timestamp: message.timestamp
        });

        if (!message.data || message.data.type !== 'generate_video') {
          console.error('Invalid message format:', {
            jobId: message.jobId,
            data: message.data
          });
          throw new Error(`Unknown message type: ${message.data?.type}`);
        }

        console.log('Message validation passed, processing video generation...');
        await handleVideoGeneration(message);
        console.log('Video generation handler completed successfully');
      },
      { prefetch: 1 }
    );
  } catch (error) {
    console.error('Failed to start video generation worker:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Worker received SIGINT signal');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Worker received SIGTERM signal');
  process.exit(0);
});

// Start the worker if this file is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  console.log('Starting worker in standalone mode');
  startWorker().catch(error => {
    console.error('Worker startup error:', error);
    process.exit(1);
  });
}
