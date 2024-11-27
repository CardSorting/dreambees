import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { GetJobCommand } from '@aws-sdk/client-mediaconvert'
import { Redis } from '@upstash/redis'
import { MediaConvertClient } from './MediaConvertClient'
import { useRuntimeConfig } from '#imports'

export interface OutputLocation {
  key: string;
  bucket: string;
  s3Uri: string;
  size?: number;
  lastModified?: Date;
}

// Helper function to get Redis client
function getRedisClient() {
  // Ensure we're on the server side
  if (process.server) {
    const config = useRuntimeConfig()
    return new Redis({
      url: config.redisUrl,
      token: config.redisToken,
    })
  }
  throw new Error('Redis operations can only be performed on the server side')
}

export class OutputPathResolver {
  private static instance: OutputPathResolver;
  private s3Client;
  private mediaConvertClient;
  private redis: Redis;
  private config;

  private constructor() {
    if (!process.server) {
      throw new Error('OutputPathResolver can only be instantiated on the server side')
    }
    
    this.config = useRuntimeConfig()
    const client = MediaConvertClient.getInstance();
    this.s3Client = client.getS3Client();
    this.mediaConvertClient = client.getMediaConvertClient();
    this.redis = getRedisClient();
  }

  public static getInstance(): OutputPathResolver {
    if (!OutputPathResolver.instance) {
      OutputPathResolver.instance = new OutputPathResolver();
    }
    return OutputPathResolver.instance;
  }

  /**
   * Get the actual output path from MediaConvert job
   */
  private async getJobOutputPath(jobId: string): Promise<string | null> {
    try {
      const command = new GetJobCommand({ Id: jobId });
      const { Job } = await this.mediaConvertClient.send(command);

      if (!Job?.Settings?.OutputGroups?.[0]?.OutputGroupSettings?.FileGroupSettings?.Destination) {
        return null;
      }

      const s3Uri = Job.Settings.OutputGroups[0].OutputGroupSettings.FileGroupSettings.Destination;
      const parsed = this.parseS3Uri(s3Uri);
      if (!parsed) return null;

      // Get the output details
      const outputDetails = Job.Settings.OutputGroups[0].Outputs?.[0];
      if (!outputDetails) return null;

      // Get the base filename from the destination path
      const basePath = parsed.key.endsWith('/') ? parsed.key.slice(0, -1) : parsed.key;
      const baseFilename = basePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';

      // Construct the final filename with the _output suffix
      const nameModifier = outputDetails.NameModifier || '_output';
      const extension = outputDetails.Extension || '.mp4';
      
      // The final path should be in the output directory
      return `output/${baseFilename}${nameModifier}${extension}`;
    } catch (error) {
      console.error('Error getting job output path:', error);
      return null;
    }
  }

  /**
   * Find the actual output file for a MediaConvert job
   */
  public async resolveOutputPath(jobId: string): Promise<OutputLocation | null> {
    try {
      // First check cache
      const cached = await this.getCachedOutputLocation(jobId);
      if (cached) {
        // Verify the file still exists
        if (await this.verifyOutput(cached.key)) {
          return cached;
        }
      }

      // Get the actual output path from the job
      const outputPath = await this.getJobOutputPath(jobId);
      if (!outputPath) {
        console.log('No output path found in job:', jobId);
        return null;
      }

      console.log('Found output path from job:', outputPath);

      // Verify the output file exists
      if (await this.verifyOutput(outputPath)) {
        const output: OutputLocation = {
          key: outputPath,
          bucket: this.config.awsS3Bucket,
          s3Uri: this.getS3Uri(outputPath)
        };

        // Get additional file details
        const details = await this.getFileDetails(outputPath);
        if (details) {
          output.size = details.size;
          output.lastModified = details.lastModified;
        }

        // Cache the result
        await this.cacheOutputLocation(jobId, output);
        return output;
      }

      // If exact file not found, try listing the directory to find similar files
      const outputDir = outputPath.split('/').slice(0, -1).join('/');
      const files = await this.listDirectory(outputDir);
      
      if (files && files.length > 0) {
        // Find a file that matches our expected pattern
        const expectedBase = outputPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
        const matchingFile = files.find(file => {
          const filename = file.key.split('/').pop() || '';
          return filename.startsWith(expectedBase);
        });

        if (matchingFile) {
          console.log('Found matching output file:', matchingFile.key);
          // Cache the result
          await this.cacheOutputLocation(jobId, matchingFile);
          return matchingFile;
        }
      }

      console.log('Output file not found:', outputPath);
      return null;
    } catch (error) {
      console.error('Error resolving output path:', error);
      return null;
    }
  }

  /**
   * List files in a directory
   */
  private async listDirectory(prefix: string): Promise<OutputLocation[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.awsS3Bucket,
        Prefix: prefix,
        MaxKeys: 10
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return [];

      return response.Contents.map(file => ({
        key: file.Key!,
        bucket: this.config.awsS3Bucket,
        s3Uri: this.getS3Uri(file.Key!),
        size: file.Size,
        lastModified: file.LastModified
      }));
    } catch (error) {
      console.error('Error listing directory:', error);
      return [];
    }
  }

  /**
   * Get file details from S3
   */
  private async getFileDetails(key: string): Promise<{ size?: number; lastModified?: Date } | null> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.awsS3Bucket,
        Prefix: key,
        MaxKeys: 1
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents || response.Contents.length === 0) {
        return null;
      }

      const file = response.Contents[0];
      return {
        size: file.Size,
        lastModified: file.LastModified
      };
    } catch (error) {
      console.error('Error getting file details:', error);
      return null;
    }
  }

  /**
   * Verify if an output file exists
   */
  public async verifyOutput(key: string): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.awsS3Bucket,
        Prefix: key,
        MaxKeys: 1
      });

      const response = await this.s3Client.send(command);
      return !!(response.Contents && response.Contents.length > 0);
    } catch (error) {
      console.error('Error verifying output:', error);
      return false;
    }
  }

  /**
   * Get the S3 URI for a given key
   */
  public getS3Uri(key: string): string {
    return `s3://${this.config.awsS3Bucket}/${key}`;
  }

  /**
   * Parse an S3 URI into its components
   */
  public parseS3Uri(uri: string): { bucket: string; key: string } | null {
    try {
      const match = uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
      if (!match) {
        return null;
      }
      return {
        bucket: match[1],
        key: match[2]
      };
    } catch (error) {
      console.error('Error parsing S3 URI:', error);
      return null;
    }
  }

  /**
   * Store output location in Redis for future reference
   */
  private async cacheOutputLocation(jobId: string, location: OutputLocation): Promise<void> {
    try {
      const cacheKey = `mediaconvert_output:${jobId}`;
      await this.redis.set(cacheKey, JSON.stringify(location));
      console.log('Cached output location for job:', jobId);
    } catch (error) {
      console.error('Error caching output location:', error);
    }
  }

  /**
   * Get cached output location from Redis
   */
  private async getCachedOutputLocation(jobId: string): Promise<OutputLocation | null> {
    try {
      const cacheKey = `mediaconvert_output:${jobId}`;
      const cached = await this.redis.get<string>(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached output location:', error);
      return null;
    }
  }
}
