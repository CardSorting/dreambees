// Job status types
export const JobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];

export interface JobStatus {
  status: JobStatusType;
  message?: string;
  progress?: number;
  error?: string;
  videoUrl?: string;
  mediaConvertJobId?: string;
}

// Queue types
export interface JobStatusUpdate {
  message?: string;
  error?: string;
  progress?: number;
  videoUrl?: string;
  mediaConvertJobId?: string;
}

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
