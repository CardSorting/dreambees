import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MediaConvertClient } from './MediaConvertClient'
import { OutputPathResolver, type OutputLocation } from './OutputPathResolver'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env')
})

export class URLHandler {
  private static instance: URLHandler;
  private s3Client;
  private outputResolver;

  private constructor() {
    this.s3Client = MediaConvertClient.getInstance().getS3Client();
    this.outputResolver = OutputPathResolver.getInstance();
  }

  public static getInstance(): URLHandler {
    if (!URLHandler.instance) {
      URLHandler.instance = new URLHandler();
    }
    return URLHandler.instance;
  }

  private async isUrlAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async getSignedS3Url(key: string): Promise<string> {
    try {
      console.log('Generating signed URL for:', key);
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        ResponseContentDisposition: 'inline'
      });
      
      // Get a signed URL that expires in 1 hour
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      console.log('Generated signed S3 URL:', signedUrl);
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed S3 URL:', error);
      throw error;
    }
  }

  private getCloudFrontUrl(key: string): string {
    const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || 'd2kp8efsbrxae1.cloudfront.net';
    return `https://${cloudFrontDomain}/${key}`;
  }

  /**
   * Get accessible URL for a MediaConvert job output
   */
  public async getJobOutputUrl(jobId: string): Promise<string> {
    try {
      // Get the actual output location from the resolver
      const output = await this.outputResolver.resolveOutputPath(jobId);
      if (!output) {
        throw new Error('Output file not found');
      }

      console.log('Found output location:', output);

      // Try CloudFront first
      const cloudFrontUrl = this.getCloudFrontUrl(output.key);
      console.log('Attempting CloudFront URL:', cloudFrontUrl);

      if (await this.isUrlAccessible(cloudFrontUrl)) {
        console.log('CloudFront URL is accessible');
        return cloudFrontUrl;
      }

      // Fall back to signed S3 URL
      console.log('CloudFront URL not accessible, falling back to signed S3 URL');
      return await this.getSignedS3Url(output.key);
    } catch (error) {
      console.error('Failed to get job output URL:', error);
      throw error;
    }
  }

  /**
   * Convert S3 URI to accessible URL
   * This is kept for backward compatibility
   */
  public async convertS3UrlToCloudFront(
    s3Uri: string, 
    maxRetries = 3, 
    retryDelay = 2000
  ): Promise<string> {
    try {
      // Parse the S3 URI
      const parsed = this.outputResolver.parseS3Uri(s3Uri);
      if (!parsed) {
        throw new Error('Invalid S3 URI format');
      }

      // Try CloudFront first
      const cloudFrontUrl = this.getCloudFrontUrl(parsed.key);
      console.log('Attempting CloudFront URL:', cloudFrontUrl);

      // Check if CloudFront URL is accessible with retries
      for (let i = 0; i < maxRetries; i++) {
        if (await this.isUrlAccessible(cloudFrontUrl)) {
          console.log('CloudFront URL is accessible');
          return cloudFrontUrl;
        }
        console.log(`CloudFront URL not accessible, attempt ${i + 1}/${maxRetries}`);
        await this.delay(retryDelay);
      }

      // Fall back to signed S3 URL
      console.log('CloudFront URL not accessible after retries, falling back to signed S3 URL');
      return await this.getSignedS3Url(parsed.key);
    } catch (error) {
      console.error('Failed to convert S3 URL:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
