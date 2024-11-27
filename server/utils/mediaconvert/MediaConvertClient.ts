import { MediaConvert } from '@aws-sdk/client-mediaconvert'
import { S3 } from '@aws-sdk/client-s3'
import { useRuntimeConfig } from '#imports'

class MediaConvertClientSingleton {
  private static instance: MediaConvertClientSingleton;
  private mediaConvertClient: MediaConvert;
  private s3Client: S3;

  private constructor() {
    const config = useRuntimeConfig()

    this.mediaConvertClient = new MediaConvert({
      endpoint: config.awsMediaConvertEndpoint,
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
      }
    });

    this.s3Client = new S3({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
      }
    });
  }

  public static getInstance(): MediaConvertClientSingleton {
    if (!MediaConvertClientSingleton.instance) {
      MediaConvertClientSingleton.instance = new MediaConvertClientSingleton();
    }
    return MediaConvertClientSingleton.instance;
  }

  public getMediaConvertClient(): MediaConvert {
    return this.mediaConvertClient;
  }

  public getS3Client(): S3 {
    return this.s3Client;
  }
}

export const MediaConvertClient = MediaConvertClientSingleton;
