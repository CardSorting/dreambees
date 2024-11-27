import { startVideoGeneration } from './services/video-processor'
import { getJobStatus } from './utils/job-status'
import { JobStatus } from './utils/types'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getMediaConvertJobStatus } from './utils/mediaconvert'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Test pipeline can only be run on the server side')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use existing test image
const TEST_IMAGE_PATH = join(__dirname, 'test-image.jpg')

async function testPipeline() {
  try {
    // Generate a unique job ID
    const testJobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('\n=== Starting Pipeline Test ===')
    console.log('Job ID:', testJobId)

    // Read test image
    console.log('\nReading test image...')
    const imageData = readFileSync(TEST_IMAGE_PATH).toString('base64')
    console.log('Image loaded successfully')

    // Start video generation
    console.log('\nStarting video generation...')
    await startVideoGeneration({
      jobId: testJobId,
      imageData: `data:image/jpeg;base64,${imageData}`
    })
    console.log('Video generation started successfully')

    // Poll job status
    console.log('\nPolling job status...')
    let isComplete = false
    let attempts = 0
    const maxAttempts = 30 // 5 minutes with 10-second intervals

    while (!isComplete && attempts < maxAttempts) {
      const status = await getJobStatus(testJobId)
      console.log('\nCurrent Status:', {
        status: status?.status,
        progress: status?.progress,
        message: status?.message,
        error: status?.error,
        mediaConvertJobId: status?.mediaConvertJobId
      })

      // If we have a MediaConvert job ID, get detailed status
      if (status?.mediaConvertJobId) {
        try {
          const mediaConvertStatus = await getMediaConvertJobStatus(status.mediaConvertJobId)
          console.log('MediaConvert Status:', {
            status: mediaConvertStatus.status,
            progress: mediaConvertStatus.progress,
            errorMessage: mediaConvertStatus.errorMessage,
            outputUri: mediaConvertStatus.outputUri
          })
        } catch (error) {
          console.error('Failed to get MediaConvert status:', error)
        }
      }

      if (status?.error) {
        console.error('\nJob failed with error:', status.error)
        throw new Error(`Job failed: ${status.error}`)
      }

      if (status?.status === JobStatus.COMPLETED) {
        console.log('\n=== Video Generation Completed ===')
        console.log('Video URL:', status.videoUrl)
        isComplete = true
        break
      }

      if (status?.status === JobStatus.FAILED) {
        throw new Error('Job failed')
      }

      // Log progress
      if (status?.progress !== undefined) {
        console.log(`Progress: ${status.progress}%`)
      }
      if (status?.message) {
        console.log(`Message: ${status.message}`)
      }

      // Wait 10 seconds before next check
      console.log('\nWaiting 10 seconds before next check...')
      await new Promise(resolve => setTimeout(resolve, 10000))
      attempts++
    }

    if (!isComplete) {
      throw new Error('Test timed out after 5 minutes')
    }

  } catch (error: any) {
    console.error('\n=== Pipeline Test Failed ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
console.log('=== Video Generation Pipeline Test ===')
console.log('Environment:', {
  REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
  AWS_REGION: process.env.AWS_REGION,
  AWS_MEDIACONVERT_ENDPOINT: process.env.AWS_MEDIACONVERT_ENDPOINT,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET
})

testPipeline().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
