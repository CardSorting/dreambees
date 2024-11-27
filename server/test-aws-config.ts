import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), '../.env')
})

async function testAwsConfig() {
  console.log('Testing AWS Configuration...')
  
  // Log environment variables (redacted)
  console.log('\nEnvironment Variables:')
  console.log('AWS_REGION:', process.env.AWS_REGION)
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'not set')
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '***' + process.env.AWS_SECRET_ACCESS_KEY.slice(-4) : 'not set')
  console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET)

  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })

    // Test connection by listing buckets
    console.log('\nTesting S3 connection...')
    const command = new ListBucketsCommand({})
    const response = await s3Client.send(command)
    
    console.log('\nS3 Buckets:')
    response.Buckets?.forEach(bucket => {
      console.log(`- ${bucket.Name}`)
    })

    console.log('\nAWS configuration test successful!')
  } catch (error) {
    console.error('\nAWS configuration test failed:', error)
  }
}

testAwsConfig()
