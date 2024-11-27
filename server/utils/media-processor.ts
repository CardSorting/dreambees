import { uploadToS3, s3Paths } from './s3'
import sharp from 'sharp'
import { useRuntimeConfig } from '#imports'

interface UploadedFile {
  key: string;
  url: string;
}

function getCloudFrontUrl(key: string): string {
  if (!process.server) {
    throw new Error('Media processing can only be performed on the server side')
  }
  const config = useRuntimeConfig()
  return `https://${config.awsCloudFrontDomain}/${key}`
}

export async function processImageUpload(
  imageData: string,
  jobId: string
): Promise<UploadedFile> {
  if (!process.server) {
    throw new Error('Image processing can only be performed on the server side')
  }

  try {
    console.log(`Processing image upload for job: ${jobId}`)
    
    // Remove data URL prefix if present and get the correct content type
    let contentType = 'image/jpeg'
    let base64Data = imageData
    
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        contentType = matches[1]
        base64Data = matches[2]
      } else {
        base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      }
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Simply convert to PNG format without any resizing or transformations
    console.log(`Converting image to PNG format...`)
    const pngBuffer = await sharp(imageBuffer)
      .png()
      .toBuffer()

    // Upload original image for backup
    const originalKey = s3Paths.getImagePath(jobId)
    await uploadToS3(originalKey, imageBuffer, contentType)

    // Upload PNG version for MediaConvert
    const pngKey = s3Paths.getImagePath(jobId).replace('.jpg', '.png')
    console.log(`Uploading PNG image with content type: image/png`)
    await uploadToS3(pngKey, pngBuffer, 'image/png')

    return {
      key: pngKey,
      url: getCloudFrontUrl(pngKey)
    }
  } catch (error) {
    console.error('Failed to process image upload:', error)
    throw error
  }
}

export async function processAudioUpload(
  audioBuffer: Buffer,
  jobId: string
): Promise<UploadedFile> {
  if (!process.server) {
    throw new Error('Audio processing can only be performed on the server side')
  }

  try {
    console.log(`Processing audio upload for job: ${jobId}`)

    // Upload to S3
    const key = s3Paths.getAudioPath(jobId)
    await uploadToS3(key, audioBuffer, 'audio/mpeg')

    return {
      key,
      url: getCloudFrontUrl(key)
    }
  } catch (error) {
    console.error('Failed to process audio upload:', error)
    throw error
  }
}

export async function processSubtitlesUpload(
  subtitles: string,
  jobId: string
): Promise<UploadedFile> {
  if (!process.server) {
    throw new Error('Subtitles processing can only be performed on the server side')
  }

  try {
    console.log(`Processing subtitles upload for job: ${jobId}`)

    // Convert string to Buffer with UTF-8 encoding for proper SRT file format
    const subtitlesBuffer = Buffer.from(subtitles, 'utf-8')

    // Upload to S3
    const key = s3Paths.getSubtitlesPath(jobId)
    await uploadToS3(key, subtitlesBuffer, 'application/x-subrip')

    return {
      key,
      url: getCloudFrontUrl(key)
    }
  } catch (error) {
    console.error('Failed to process subtitles upload:', error)
    throw error
  }
}

export async function createAudioFileFromBuffer(audioBuffer: Buffer): Promise<File> {
  if (!process.server) {
    throw new Error('Audio file creation can only be performed on the server side')
  }

  return new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' })
}

export async function getApproximateAudioDuration(audioBuffer: Buffer): Promise<number> {
  if (!process.server) {
    throw new Error('Audio duration calculation can only be performed on the server side')
  }

  // Approximate duration based on MP3 bitrate (assuming 128kbps)
  const BITRATE = 128000 // bits per second
  const duration = (audioBuffer.length * 8) / BITRATE
  return Math.round(duration * 1000) // Convert to milliseconds
}

export async function cleanupMediaFiles(jobId: string): Promise<void> {
  if (!process.server) {
    throw new Error('Media file cleanup can only be performed on the server side')
  }

  try {
    console.log(`Cleaning up media files for job: ${jobId}`)
    // Note: In this implementation, we're relying on S3 lifecycle rules to clean up files
    // You could implement explicit deletion here if needed
  } catch (error) {
    console.error('Failed to cleanup media files:', error)
    // Don't throw error here as this is a cleanup operation
  }
}
