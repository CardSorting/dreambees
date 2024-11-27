import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  type GetObjectCommandInput,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
})

export const s3Paths = {
  getImagePath: (jobId: string) => `images/${jobId}.jpg`,
  getAudioPath: (jobId: string) => `audio/${jobId}.mp3`,
  getSubtitlesPath: (jobId: string) => `subtitles/${jobId}.srt`,
  getOutputPath: (filename: string) => `output/${filename}`
}

export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  console.log(`Uploading to S3: ${key} (${contentType})`)
  
  try {
    // If body is a string and contentType is not text-based, assume it's base64
    let uploadBody: Buffer | string = body
    if (typeof body === 'string' && !contentType.startsWith('text/')) {
      uploadBody = Buffer.from(body, 'base64')
    }

    const command = new PutObjectCommand({
      Bucket: config.awsS3Bucket,
      Key: key,
      Body: uploadBody,
      ContentType: contentType,
      CacheControl: 'max-age=31536000' // 1 year cache for static assets
    })

    await s3Client.send(command)
    console.log(`Successfully uploaded to S3: ${key}`)
  } catch (error) {
    console.error(`Failed to upload to S3: ${key}`, error)
    throw error
  }
}

export async function getFromS3(key: string): Promise<Buffer> {
  console.log(`Getting from S3: ${key}`)
  
  try {
    const command = new GetObjectCommand({
      Bucket: config.awsS3Bucket,
      Key: key
    })

    const response = await s3Client.send(command)
    if (!response.Body) {
      throw new Error('Empty response body')
    }

    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }

    console.log(`Successfully retrieved from S3: ${key}`)
    return Buffer.concat(chunks)
  } catch (error) {
    console.error(`Failed to get from S3: ${key}`, error)
    throw error
  }
}

export async function getSignedS3Url(key: string, expiresIn: number = 3600): Promise<string> {
  console.log(`Generating signed URL for: ${key}`)
  
  try {
    const command = new GetObjectCommand({
      Bucket: config.awsS3Bucket,
      Key: key
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    console.log(`Generated signed URL for: ${key}`)
    return url
  } catch (error) {
    console.error(`Failed to generate signed URL for: ${key}`, error)
    throw error
  }
}

export function getS3Url(key: string): string {
  try {
    // Use CloudFront domain from runtime config
    const cloudFrontDomain = config.awsCloudFrontDomain
    
    if (!cloudFrontDomain) {
      console.error('CloudFront domain not configured')
      throw new Error('CloudFront domain not configured')
    }

    const url = `https://${cloudFrontDomain}/${key}`
    console.log('Generated CloudFront URL:', {
      key,
      url
    })
    
    return url
  } catch (error) {
    console.error('Failed to generate CloudFront URL:', error)
    // Fallback to direct S3 URL if CloudFront fails
    return `https://${config.awsS3Bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`
  }
}

// Helper function to validate S3 key format
export function validateS3Key(key: string): boolean {
  // Check if key is empty or contains invalid characters
  if (!key || /[^a-zA-Z0-9!_.*'()/-]/.test(key)) {
    return false
  }
  
  // Check if key starts or ends with slash
  if (key.startsWith('/') || key.endsWith('/')) {
    return false
  }
  
  return true
}

// Helper function to ensure proper path format
export function formatS3Key(key: string): string {
  // Remove any leading/trailing slashes
  key = key.replace(/^\/+|\/+$/g, '')
  
  // Replace multiple slashes with single slash
  key = key.replace(/\/+/g, '/')
  
  // Remove any undefined segments
  key = key.replace(/undefined/g, '')
  
  return key
}
