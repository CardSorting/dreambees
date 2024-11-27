import { defineEventHandler, H3Event } from 'h3'
import { getJobStatus } from '../../utils/job-status'
import { ERROR_MESSAGES } from '../../../utils/video-generator-utils'
import { Redis } from '@upstash/redis'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Video status completed API can only be used on the server side')
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const redis = new Redis({
      url: process.env.REDIS_URL as string,
      token: process.env.REDIS_TOKEN as string,
    })

    // Get user ID from auth context (set by middleware)
    const userId = event.context.auth?.uid
    if (!userId) {
      return {
        success: false,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: 'Unauthorized'
      }
    }

    // Get user's job IDs
    const userJobsKey = `user_jobs:${userId}`
    const jobsStr = await redis.get<string>(userJobsKey)
    const userJobIds = jobsStr ? JSON.parse(jobsStr) : []
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
