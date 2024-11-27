import { getMediaConvertJobStatus, MediaConvertStatus } from './mediaconvert'
import { updateJobStatus as updateQueueJobStatus } from './queue'
import { Redis } from '@upstash/redis'
import { JobStatus, type JobStatusType, type JobStatusUpdate } from '@/types/job'

// Helper function to get Redis client
function getRedisClient() {
  // In Node.js, process.release.name will be 'node'
  if (typeof process !== 'undefined' && process.release?.name === 'node') {
    return new Redis({
      url: process.env.REDIS_URL as string,
      token: process.env.REDIS_TOKEN as string,
    })
  }
  throw new Error('Redis operations can only be performed on the server side')
}

const JOB_STATUS_PREFIX = 'job_status:'

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  try {
    const redis = getRedisClient()
    // Get current status from Redis
    const statusKey = `${JOB_STATUS_PREFIX}${jobId}`
    const currentStatus: JobStatus | null = await redis.get(statusKey)

    // If no status exists, return default processing status
    if (!currentStatus) {
      const defaultStatus: JobStatus = {
        status: JobStatus.PROCESSING,
        message: 'Initializing...',
        progress: 0,
        timestamp: Date.now()
      }
      return defaultStatus
    }

    // Try to get MediaConvert status if we have a job ID
    if (currentStatus.mediaConvertJobId) {
      try {
        const mediaConvertStatus = await getMediaConvertJobStatus(currentStatus.mediaConvertJobId)
        if (mediaConvertStatus) {
          // Keep track of the previous progress
          const previousProgress = currentStatus.progress || 0;
          
          switch (mediaConvertStatus.status) {
            case MediaConvertStatus.COMPLETE:
              currentStatus.status = JobStatus.COMPLETED
              currentStatus.videoUrl = mediaConvertStatus.outputUri
              currentStatus.progress = 100
              break
            case MediaConvertStatus.ERROR:
              currentStatus.status = JobStatus.FAILED
              currentStatus.error = mediaConvertStatus.errorMessage
              break
            case MediaConvertStatus.PROGRESSING:
              currentStatus.status = JobStatus.PROCESSING
              // Only update progress if MediaConvert provides a value
              if (typeof mediaConvertStatus.progress === 'number') {
                currentStatus.progress = mediaConvertStatus.progress
              } else {
                // Keep the previous progress if no new value
                currentStatus.progress = previousProgress
              }
              currentStatus.message = 'Processing video...'
              break
            case MediaConvertStatus.CANCELED:
              currentStatus.status = JobStatus.FAILED
              currentStatus.error = 'Video processing was canceled'
              break
            default:
              currentStatus.status = JobStatus.PROCESSING
              currentStatus.message = 'Initializing video processing...'
              // Preserve previous progress
              currentStatus.progress = previousProgress
          }

          // Update timestamp
          currentStatus.timestamp = Date.now()

          // Update Redis with latest status
          await redis.set(statusKey, currentStatus)
        }
      } catch (error) {
        console.error('Error getting MediaConvert status:', error)
        // Don't update status on MediaConvert error, keep existing status
      }
    }
    
    // Update queue with current status
    await updateQueueJobStatus(jobId, currentStatus.status, {
      message: currentStatus.message,
      progress: currentStatus.progress,
      error: currentStatus.error,
      videoUrl: currentStatus.videoUrl,
      mediaConvertJobId: currentStatus.mediaConvertJobId,
      timestamp: currentStatus.timestamp
    })
    
    return currentStatus

  } catch (error) {
    console.error('Error getting job status:', error)
    return {
      status: JobStatus.FAILED,
      error: 'Failed to get job status',
      progress: 0,
      timestamp: Date.now()
    }
  }
}

export async function updateJobProgress(
  jobId: string, 
  progress: number, 
  message: string,
  mediaConvertJobId?: string
): Promise<void> {
  const redis = getRedisClient()
  const statusKey = `${JOB_STATUS_PREFIX}${jobId}`
  
  try {
    // Get existing status first
    const existingStatus: JobStatus | null = await redis.get(statusKey)
    
    // Only update progress if it's greater than existing progress
    const currentProgress = existingStatus?.progress || 0
    const newProgress = progress > currentProgress ? progress : currentProgress
    
    const currentStatus: JobStatus = {
      ...(existingStatus || {}), // Preserve all existing fields
      status: JobStatus.PROCESSING,
      progress: newProgress,
      message,
      timestamp: Date.now(),
      mediaConvertJobId: mediaConvertJobId || existingStatus?.mediaConvertJobId,
      // Preserve error and videoUrl if they exist
      error: existingStatus?.error,
      videoUrl: existingStatus?.videoUrl
    }
    
    // Update Redis with new status
    await redis.set(statusKey, currentStatus)
    
    // Update queue with all fields
    const update: JobStatusUpdate = {
      progress: newProgress,
      message,
      mediaConvertJobId: currentStatus.mediaConvertJobId,
      timestamp: currentStatus.timestamp,
      error: currentStatus.error,
      videoUrl: currentStatus.videoUrl
    }
    await updateQueueJobStatus(jobId, JobStatus.PROCESSING, update)
  } catch (error) {
    console.error('Error updating job progress:', error)
    throw error
  }
}

export async function markJobFailed(
  jobId: string, 
  error: string
): Promise<void> {
  const redis = getRedisClient()
  const statusKey = `${JOB_STATUS_PREFIX}${jobId}`
  
  try {
    // Get existing status first
    const existingStatus: JobStatus | null = await redis.get(statusKey)
    
    const currentStatus: JobStatus = {
      ...(existingStatus || {}),
      status: JobStatus.FAILED,
      error,
      timestamp: Date.now(),
      // Preserve the last progress value and other fields
      progress: existingStatus?.progress || 0,
      mediaConvertJobId: existingStatus?.mediaConvertJobId,
      videoUrl: existingStatus?.videoUrl,
      message: existingStatus?.message
    }
    
    // Update Redis with failed status
    await redis.set(statusKey, currentStatus)
    
    // Update queue with all fields
    const update: JobStatusUpdate = { 
      error,
      progress: currentStatus.progress,
      timestamp: currentStatus.timestamp,
      mediaConvertJobId: currentStatus.mediaConvertJobId,
      videoUrl: currentStatus.videoUrl,
      message: currentStatus.message
    }
    await updateQueueJobStatus(jobId, JobStatus.FAILED, update)
  } catch (error) {
    console.error('Error marking job as failed:', error)
    throw error
  }
}

export async function markJobCompleted(
  jobId: string, 
  videoUrl: string
): Promise<void> {
  const redis = getRedisClient()
  const statusKey = `${JOB_STATUS_PREFIX}${jobId}`
  
  try {
    // Get existing status first
    const existingStatus: JobStatus | null = await redis.get(statusKey)
    
    const currentStatus: JobStatus = {
      ...(existingStatus || {}),
      status: JobStatus.COMPLETED,
      videoUrl,
      progress: 100,
      timestamp: Date.now(),
      // Preserve other fields
      mediaConvertJobId: existingStatus?.mediaConvertJobId,
      message: existingStatus?.message,
      error: undefined // Clear any errors
    }
    
    // Update Redis with completed status
    await redis.set(statusKey, currentStatus)
    
    // Update queue with all fields
    const update: JobStatusUpdate = { 
      videoUrl,
      progress: 100,
      timestamp: currentStatus.timestamp,
      mediaConvertJobId: currentStatus.mediaConvertJobId,
      message: currentStatus.message
    }
    await updateQueueJobStatus(jobId, JobStatus.COMPLETED, update)
  } catch (error) {
    console.error('Error marking job as completed:', error)
    throw error
  }
}

// Helper function to determine if a job is in a final state
export function isJobComplete(status: JobStatus): boolean {
  return status.status === JobStatus.COMPLETED || status.status === JobStatus.FAILED
}

// Helper function to determine if a job can be retried
export function canRetryJob(status: JobStatus): boolean {
  return status.status === JobStatus.FAILED && 
    !status.error?.includes('quota') && 
    !status.error?.includes('invalid') &&
    !status.error?.includes('unauthorized')
}
