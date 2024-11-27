import { JobStatus, type JobStatusType } from '@/types/job'

export { JobStatus, type JobStatusType }

// Queue types
export interface QueueMessage<T = unknown> {
  jobId: string;
  userId: string;
  data: T;
  timestamp: number;
}

// Video generation types
export interface VideoGenerationMessage {
  type: 'generate_video';
  imageData: string;
}
