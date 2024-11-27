import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { startVideoGeneration } from './services/video-processor'
import { consumeQueue, QUEUES, type QueueMessage } from './utils/queue'

// Load environment variables
dotenv.config()

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testWorkflow() {
  try {
    console.log('Starting workflow test...')

    // 1. Set up status monitoring
    console.log('Setting up status monitoring...')
    consumeQueue('VIDEO_STATUS', (message: QueueMessage) => {
      if (message.type === 'STATUS_UPDATE') {
        console.log('\nStatus Update:', {
          jobId: message.jobId,
          ...message.data
        })
      }
      return Promise.resolve()
    })

    // 2. Read test image
    console.log('\nReading test image...')
    const imagePath = join(__dirname, 'test-image.jpg')
    const imageBuffer = readFileSync(imagePath)
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

    // 3. Start video generation
    console.log('\nStarting video generation...')
    const jobId = `test-${Date.now()}`
    await startVideoGeneration({
      jobId,
      imageData: base64Image
    })

    console.log('\nTest complete! Check the status updates above for results.')
    console.log('Job ID:', jobId)

  } catch (error) {
    console.error('Test failed:', error)
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Run the test
console.log('Press Ctrl+C to exit after the test completes\n')
testWorkflow()
