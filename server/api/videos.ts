import { Redis } from '@upstash/redis'
import type { JobStatus } from '../utils/types'
import { verifyAuthToken } from '~/server/utils/firebase-admin'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const redis = new Redis({
      url: config.redisUrl,
      token: config.redisToken,
    })

    // Get and verify auth token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    const token = authHeader.split('Bearer ')[1]
    const authResult = await verifyAuthToken(token)
    
    if (!authResult.success) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    const userId = authResult.uid

    // Get all job statuses for user
    const userJobsKey = `user_jobs:${userId}`
    const jobIds = await redis.smembers(userJobsKey)

    // Get status for each job
    const videos = []
    for (const jobId of jobIds) {
      const statusKey = `job_status:${jobId}`
      const status = await redis.get<JobStatus>(statusKey)
      
      if (status && status.status === 'completed' && status.videoUrl) {
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
    console.error('Failed to fetch videos:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch videos'
    })
  }
})
