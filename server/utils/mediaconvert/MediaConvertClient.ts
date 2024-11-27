import { MediaConvertClient as AWSMediaConvertClient } from '@aws-sdk/client-mediaconvert'
import { S3Client } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env')
})

export class MediaConvertClient {
  private static instance: MediaConvertClient
  private mediaConvertClient: AWSMediaConvertClient
  private s3Client: S3Client

  private constructor() {
    if (!process.env.AWS_MEDIACONVERT_ENDPOINT) {
      throw new Error('AWS_MEDIACONVERT_ENDPOINT environment variable is required')
    }

    this.mediaConvertClient = new AWSMediaConvertClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      },
      endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT
    })

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })
  }

  public static getInstance(): MediaConvertClient {
    if (!MediaConvertClient.instance) {
      MediaConvertClient.instance = new MediaConvertClient()
    }
    return MediaConvertClient.instance
  }

  public getMediaConvertClient(): AWSMediaConvertClient {
    return this.mediaConvertClient
  }

  public getS3Client(): S3Client {
    return this.s3Client
  }
}
