import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MediaConvertClient } from './MediaConvertClient'
import { OutputPathResolver, type OutputLocation } from './OutputPathResolver'

export class URLHandler {
  private static instance: URLHandler;
  private s3Client;
  private outputResolver;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  private constructor() {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      throw new Error('URLHandler can only be instantiated on the server side')
    }
    
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
      console.warn('URL accessibility check failed:', error);
      return false;
    }
  }

  private async getSignedS3Url(key: string): Promise<string> {
    try {
      console.log('Generating signed URL for:', key);
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET as string,
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
    const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN as string;
    return `https://${cloudFrontDomain}/${key}`;
  }

  /**
   * Get accessible URL for a MediaConvert job output with retries
   */
  public async getJobOutputUrl(jobId: string, retryCount = 0): Promise<string> {
    try {
      // Get the actual output location from the resolver
      const output = await this.outputResolver.resolveOutputPath(jobId);
      if (!output) {
        if (retryCount < this.MAX_RETRIES) {
          console.log(`Output not found, retry ${retryCount + 1}/${this.MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.getJobOutputUrl(jobId, retryCount + 1);
        }
        throw new Error('Output file not found after retries');
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
      if (retryCount < this.MAX_RETRIES) {
        console.log(`Error getting URL, retry ${retryCount + 1}/${this.MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.getJobOutputUrl(jobId, retryCount + 1);
      }
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
