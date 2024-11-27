import { defineEventHandler } from 'h3'
import { getJobStatus } from '../../utils/job-status'
import { ERROR_MESSAGES, STATUS_MESSAGES } from '../../../utils/video-generator-utils'
import { Redis } from '@upstash/redis'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Video status API can only be used on the server side')
}

function validateVideoUrl(url: string | undefined, cloudFrontDomain: string): string | undefined {
  if (!url) return undefined;
  
  try {
    // Check if the URL is valid
    new URL(url);
    
    // Ensure it's not using undefined in the path
    if (url.includes('undefined')) {
      console.error('Invalid video URL containing undefined:', url);
      return undefined;
    }
    
    // Ensure it has the correct file extension
    if (!url.toLowerCase().endsWith('.mp4')) {
      console.error('Invalid video URL format:', url);
      return undefined;
    }
    
    // Ensure it has the correct domain
    if (!cloudFrontDomain) {
      console.error('CloudFront domain is not configured');
      return undefined;
    }
    
    if (!url.includes(cloudFrontDomain)) {
      console.error('Video URL does not match CloudFront domain:', url);
      return undefined;
    }
    
    return url;
  } catch (error) {
    console.error('Error validating video URL:', error);
    return undefined;
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Initialize Redis
    let redis: Redis;
    try {
      redis = new Redis({
        url: process.env.REDIS_URL as string,
        token: process.env.REDIS_TOKEN as string,
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: STATUS_MESSAGES.FAILED
      };
    }

    // Verify required configuration
    if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN || !process.env.AWS_CLOUDFRONT_DOMAIN) {
      console.error('Missing required configuration');
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: STATUS_MESSAGES.FAILED
      };
    }

    const jobId = event.context.params?.jobId
    if (!jobId) {
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Job ID is required'
      }
    }

    // Get user ID from auth context (set by middleware)
    const userId = event.context.auth?.uid
    if (!userId) {
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Unauthorized'
      }
    }

    // Verify job ownership
    try {
      const userJobsKey = `user_jobs:${userId}`
      const jobsStr = await redis.get<string>(userJobsKey)
      const userJobs = jobsStr ? JSON.parse(jobsStr) : []
      
      if (!userJobs.includes(jobId)) {
        return {
          success: false,
          status: 'failed',
          ...ERROR_MESSAGES.SERVER_ERROR,
          message: 'Job not found'
        }
      }
    } catch (error) {
      console.error('Failed to verify job ownership:', error);
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: STATUS_MESSAGES.FAILED
      };
    }

    const status = await getJobStatus(jobId)
    if (!status) {
      return {
        success: false,
        status: 'failed',
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Job not found'
      }
    }

    // Map internal status to user-friendly messages
    switch (status.status) {
      case 'completed': {
        const validatedUrl = validateVideoUrl(status.videoUrl, process.env.AWS_CLOUDFRONT_DOMAIN as string);
        if (!validatedUrl) {
          return {
            success: false,
            status: 'failed',
            ...ERROR_MESSAGES.GENERATION_FAILED,
            message: 'Video URL validation failed'
          };
        }

        return {
          success: true,
          status: 'completed',
          message: STATUS_MESSAGES.COMPLETED,
          progress: 100,
          videoUrl: validatedUrl
        };
      }

      case 'failed':
        return {
          success: false,
          status: 'failed',
          ...ERROR_MESSAGES.GENERATION_FAILED,
          message: status.error || STATUS_MESSAGES.FAILED
        }

      case 'processing':
        return {
          success: true,
          status: 'processing',
          message: status.message || STATUS_MESSAGES.PROCESSING,
          progress: status.progress || 0
        }

      case 'queued':
        return {
          success: true,
          status: 'processing',
          message: STATUS_MESSAGES.QUEUED,
          progress: 0
        }

      default:
        return {
          success: false,
          status: 'failed',
          ...ERROR_MESSAGES.SERVER_ERROR,
          message: STATUS_MESSAGES.FAILED
        }
    }

  } catch (error: any) {
    console.error('Status check error:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    return {
      success: false,
      status: 'failed',
      ...ERROR_MESSAGES.SERVER_ERROR,
      message: STATUS_MESSAGES.FAILED
    }
  }
})
