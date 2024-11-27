import { Redis } from '@upstash/redis'
import { defineEventHandler, createError } from 'h3'
import type { JobStatus } from '../utils/types'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Videos API can only be used on the server side')
}

export default defineEventHandler(async (event) => {
  try {
    const redis = new Redis({
      url: process.env.REDIS_URL as string,
      token: process.env.REDIS_TOKEN as string,
    })

    // Get user ID from auth context (set by middleware)
    const userId = event.context.auth?.uid
    if (!userId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    // Get all jobs for user
    const userJobsKey = `user_jobs:${userId}`
    const jobsStr = await redis.get<string>(userJobsKey)
    const jobIds = jobsStr ? JSON.parse(jobsStr) : []

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
