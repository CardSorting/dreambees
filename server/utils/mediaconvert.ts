import { 
  JobManager, 
  SubtitleProcessor,
  MediaConvertStatus,
  type MediaConvertStatusType,
  type MediaConvertJobStatus,
  type VideoJobInput
} from './mediaconvert/index';

// Export types and constants
export { 
  MediaConvertStatus,
  type MediaConvertStatusType,
  type MediaConvertJobStatus,
  type VideoJobInput
};

// Create video processing job
export async function createVideoJob(jobId: string, input: VideoJobInput): Promise<string> {
  const jobManager = JobManager.getInstance();
  return await jobManager.createJob(jobId, input);
}

// Get job status
export async function getMediaConvertJobStatus(jobId: string): Promise<MediaConvertJobStatus> {
  const jobManager = JobManager.getInstance();
  return await jobManager.getJobStatus(jobId);
}

// Process subtitles
export function processSubtitles(srtContent: string): string {
  return SubtitleProcessor.processSubtitles(srtContent);
}

// Get default subtitle settings
export function getDefaultSubtitleSettings() {
  return SubtitleProcessor.getDefaultSettings();
}

// Get MediaConvert caption settings
export function getMediaConvertCaptionSettings(settings = {}) {
  return SubtitleProcessor.getMediaConvertCaptionSettings(settings);
}
