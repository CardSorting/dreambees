export const JobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];

export interface JobStatusUpdate {
  message?: string;
  progress?: number;
  error?: string;
  videoUrl?: string;
  mediaConvertJobId?: string;
}

export interface JobStatus {
  status: JobStatusType;
  message?: string;
  progress?: number;
  error?: string;
  videoUrl?: string;
  mediaConvertJobId?: string;
}
