import { defineEventHandler, readBody } from 'h3'
import { startVideoGeneration } from '../services/video-processor'
import { ERROR_MESSAGES, type VideoGenerationError } from '../../utils/video-generator-utils'
import { Redis } from '@upstash/redis'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Video generator API can only be used on the server side')
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
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Service temporarily unavailable'
      };
    }

    // Verify required configuration
    if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
      console.error('Missing required configuration');
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Service configuration error'
      };
    }

    const body = await readBody(event)
    
    if (!body.imageData) {
      return {
        success: false,
        ...ERROR_MESSAGES.INVALID_IMAGE
      }
    }

    // Get user ID from auth context (set by middleware)
    const userId = event.context.auth?.uid
    if (!userId) {
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Unauthorized'
      }
    }

    // Remove data URL prefix if present
    const imageData = body.imageData.replace(/^data:image\/\w+;base64,/, '')
    
    // Validate base64 string
    try {
      Buffer.from(imageData, 'base64')
    } catch {
      return {
        success: false,
        ...ERROR_MESSAGES.INVALID_IMAGE
      }
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Associate job with user using Redis set
    try {
      const userJobsKey = `user_jobs:${userId}`
      await redis.set(userJobsKey, JSON.stringify([jobId]))
    } catch (error) {
      console.error('Failed to associate job with user:', error);
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Failed to initialize job'
      };
    }

    // If this is a retry and we have a previous job ID, clean it up
    if (body.isRetry && body.previousJobId) {
      try {
        const userJobsKey = `user_jobs:${userId}`
        const currentJobs = JSON.parse(await redis.get<string>(userJobsKey) || '[]')
        const updatedJobs = currentJobs.filter((id: string) => id !== body.previousJobId)
        await redis.set(userJobsKey, JSON.stringify(updatedJobs))
      } catch (error) {
        console.error('Failed to cleanup previous job:', error);
        // Continue anyway as this is not critical
      }
    }

    // Start video generation process
    await startVideoGeneration({
      jobId,
      imageData: body.imageData
    })

    return {
      success: true,
      jobId
    }

  } catch (error: any) {
    console.error('Video generation error:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    // Map known error types to user-friendly messages
    let errorDetails: VideoGenerationError
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      errorDetails = ERROR_MESSAGES.FILE_TOO_LARGE
    } else if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      errorDetails = ERROR_MESSAGES.INVALID_IMAGE
    } else if (error.message?.includes('quota')) {
      errorDetails = ERROR_MESSAGES.QUOTA_EXCEEDED
    } else if (error.message?.includes('timeout')) {
      errorDetails = ERROR_MESSAGES.TIMEOUT
    } else if (error.message?.includes('Redis') || error.message?.includes('ECONNREFUSED')) {
      errorDetails = {
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Service temporarily unavailable'
      }
    } else {
      errorDetails = ERROR_MESSAGES.SERVER_ERROR
    }

    return {
      success: false,
      ...errorDetails
    }
  }
})
