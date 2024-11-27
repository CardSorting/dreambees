import { MediaConvert } from '@aws-sdk/client-mediaconvert'
import { S3 } from '@aws-sdk/client-s3'

class MediaConvertClientSingleton {
  private static instance: MediaConvertClientSingleton;
  private mediaConvertClient: MediaConvert;
  private s3Client: S3;

  private constructor() {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      throw new Error('MediaConvertClient can only be instantiated on the server side')
    }

    this.mediaConvertClient = new MediaConvert({
      endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT as string,
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
      }
    });

    this.s3Client = new S3({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
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
