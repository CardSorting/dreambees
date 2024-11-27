import { startWorker } from './workers/video-generator.worker'
import { cleanup } from './utils/queue'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), '../.env')
})

async function main() {
  try {
    console.log('Starting video generation worker...')
    await startWorker()
    console.log('Worker started successfully')

    // Keep the process running
    process.stdin.resume()

    // Handle graceful shutdown
    const shutdownHandler = async () => {
      console.log('Shutting down worker...')
      await cleanup()
      process.exit(0)
    }

    process.on('SIGINT', shutdownHandler)
    process.on('SIGTERM', shutdownHandler)

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error)
      await cleanup()
      process.exit(1)
    })

    process.on('unhandledRejection', async (error) => {
      console.error('Unhandled rejection:', error)
      await cleanup()
      process.exit(1)
    })

  } catch (error) {
    console.error('Failed to start worker:', error)
    await cleanup()
    process.exit(1)
  }
}

// Start the worker
main().catch(async (error) => {
  console.error('Fatal error:', error)
  await cleanup()
  process.exit(1)
})
