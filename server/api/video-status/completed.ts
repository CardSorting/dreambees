import { defineEventHandler, getHeader } from 'h3'
import { getJobStatus } from '../../utils/job-status'
import { ERROR_MESSAGES } from '../../../utils/video-generator-utils'
import { Redis } from '@upstash/redis'
import { verifyAuthToken } from '../../utils/firebase-admin'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Video status completed API can only be used on the server side')
}

export default defineEventHandler(async (event) => {
  try {
    const redis = new Redis({
      url: process.env.REDIS_URL as string,
      token: process.env.REDIS_TOKEN as string,
    })

    // Get and verify auth token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Unauthorized'
      }
    }

    const token = authHeader.split('Bearer ')[1]
    const authResult = await verifyAuthToken(token)
    
    if (!authResult.success) {
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Unauthorized'
      }
    }

    const userId = authResult.uid

    // Get user's job IDs
    const userJobsKey = `user_jobs:${userId}`
    const userJobIds = await redis.smembers(userJobsKey)
    const videos = []

    // Get status for each job
    for (const jobId of userJobIds) {
      const status = await getJobStatus(jobId)
      
      if (status?.status === 'completed' && status.videoUrl) {
        videos.push({
          id: jobId,
          url: status.videoUrl,
          createdAt: jobId.split('_')[1] // Extract timestamp from jobId
        })
      }
    }

    // Sort by creation date, newest first
    videos.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

    return {
      success: true,
      videos
    }

  } catch (error: any) {
    console.error('Failed to fetch completed videos:', error)
    return {
      success: false,
      ...ERROR_MESSAGES.SERVER_ERROR,
      message: error.message || 'Failed to fetch completed videos'
    }
  }
})
