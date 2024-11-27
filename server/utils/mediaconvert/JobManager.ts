import { 
  CreateJobCommand,
  GetJobCommand,
  type CreateJobCommandInput,
  type Input,
  type H264Settings,
  type AacSettings,
  type InsertableImage
} from '@aws-sdk/client-mediaconvert'
import { MediaConvertClient } from './MediaConvertClient'
import { SubtitleProcessor } from './SubtitleProcessor'
import { URLHandler } from './URLHandler'
import { OutputPathResolver } from './OutputPathResolver'
import { 
  getJobStatus, 
  updateJobProgress, 
  markJobFailed, 
  markJobCompleted
} from '../job-status'
import { JobStatus, type JobStatusType } from '../types'

export const MediaConvertStatus = {
  SUBMITTED: 'SUBMITTED',
  PROGRESSING: 'PROGRESSING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  CANCELED: 'CANCELED'
} as const;

export type MediaConvertStatusType = typeof MediaConvertStatus[keyof typeof MediaConvertStatus];

export interface MediaConvertJobStatus {
  status: MediaConvertStatusType;
  errorMessage?: string;
  progress?: number;
  outputUri?: string;
  mediaConvertJobId?: string;
}

export interface VideoJobInput {
  imageKey: string;
  audioKey: string;
  subtitlesKey: string;
  outputKey: string;
}

export class JobManager {
  private static instance: JobManager;
  private mediaConvertClient;
  private urlHandler;
  private outputResolver;
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly MAX_OUTPUT_RETRIES = 10; // Maximum number of retries for output file
  private readonly OUTPUT_RETRY_DELAY = 5000; // 5 seconds between retries

  private constructor() {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      throw new Error('JobManager can only be instantiated on the server side')
    }
    
    this.mediaConvertClient = MediaConvertClient.getInstance().getMediaConvertClient();
    this.urlHandler = URLHandler.getInstance();
    this.outputResolver = OutputPathResolver.getInstance();
  }

  public static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
    }
    return JobManager.instance;
  }

  private async waitForOutput(jobId: string, retries = 0): Promise<string> {
    try {
      const url = await this.urlHandler.getJobOutputUrl(jobId);
      if (url) return url;
    } catch (error) {
      console.log(`Attempt ${retries + 1} to get output URL failed:`, error);
    }

    if (retries >= this.MAX_OUTPUT_RETRIES) {
      throw new Error('Max retries exceeded waiting for output file');
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, this.OUTPUT_RETRY_DELAY));
    return this.waitForOutput(jobId, retries + 1);
  }

  private createJobSettings(input: VideoJobInput): CreateJobCommandInput {
    // Define output dimensions
    const OUTPUT_WIDTH = 1080;
    const OUTPUT_HEIGHT = 1920;

    // Ensure the output key is just the filename without any nested directories
    const outputFilename = input.outputKey.split('/').pop() || input.outputKey;
    const outputPath = `output/${outputFilename}`;

    return {
      Role: process.env.AWS_MEDIACONVERT_ROLE as string,
      Settings: {
        TimecodeConfig: {
          Source: "ZEROBASED"
        },
        Inputs: [
          {
            AudioSelectors: {
              "Audio Selector 1": {
                DefaultSelection: "DEFAULT" as const
              }
            },
            VideoSelector: {
              ColorSpace: "FOLLOW",
              Rotate: "AUTO"
            },
            TimecodeSource: "ZEROBASED",
            FileInput: `s3://${process.env.AWS_S3_BUCKET}/${input.audioKey}`,
            ImageInserter: {
              InsertableImages: [{
                ImageInserterInput: `s3://${process.env.AWS_S3_BUCKET}/${input.imageKey}`,
                Layer: 0,
                ImageX: 0,
                ImageY: 0,
                StartTime: "00:00:00:00",
                FadeIn: 0,
                FadeOut: 0,
                Opacity: 100,
                ScalingBehavior: "FIT"
              } as InsertableImage]
            },
            CaptionSelectors: {
              "Captions Selector 1": {
                SourceSettings: {
                  SourceType: "SRT",
                  FileSourceSettings: {
                    SourceFile: `s3://${process.env.AWS_S3_BUCKET}/${input.subtitlesKey}`,
                    TimeDelta: 0
                  }
                }
              }
            }
          } as Input
        ],
        OutputGroups: [
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: `s3://${process.env.AWS_S3_BUCKET}/${outputPath}`
              }
            },
            Outputs: [
              {
                NameModifier: "_output",
                VideoDescription: {
                  Width: OUTPUT_WIDTH,
                  Height: OUTPUT_HEIGHT,
                  ScalingBehavior: "DEFAULT",
                  AntiAlias: "ENABLED",
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      InterlaceMode: "PROGRESSIVE",
                      NumberReferenceFrames: 3,
                      Syntax: "DEFAULT",
                      Softness: 0,
                      GopClosedCadence: 1,
                      GopSize: 90,
                      Slices: 1,
                      GopBReference: "DISABLED",
                      SlowPal: "DISABLED",
                      EntropyEncoding: "CABAC",
                      Bitrate: 5000000,
                      FramerateControl: "SPECIFIED",
                      RateControlMode: "CBR",
                      CodecProfile: "MAIN",
                      CodecLevel: "AUTO",
                      SceneChangeDetect: "ENABLED",
                      QualityTuningLevel: "SINGLE_PASS",
                      FramerateNumerator: 30,
                      FramerateDenominator: 1
                    } as H264Settings
                  }
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: "FOLLOW_INPUT",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: "NORMAL",
                        Bitrate: 96000,
                        RateControlMode: "CBR",
                        CodecProfile: "LC",
                        CodingMode: "CODING_MODE_2_0",
                        RawFormat: "NONE",
                        SampleRate: 48000,
                        Specification: "MPEG4"
                      } as AacSettings
                    }
                  }
                ],
                CaptionDescriptions: [
                  {
                    CaptionSelectorName: "Captions Selector 1",
                    DestinationSettings: SubtitleProcessor.getMediaConvertCaptionSettings()
                  }
                ],
                ContainerSettings: {
                  Container: "MP4",
                  Mp4Settings: {
                    CslgAtom: "INCLUDE",
                    FreeSpaceBox: "EXCLUDE",
                    MoovPlacement: "PROGRESSIVE_DOWNLOAD"
                  }
                }
              }
            ]
          }
        ]
      },
      UserMetadata: {
        Application: "DreamBees Video Generator"
      }
    };
  }

  public async createJob(jobId: string, input: VideoJobInput): Promise<string> {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      throw new Error('MediaConvert jobs can only be created on the server side')
    }

    console.log('Creating MediaConvert job with inputs:', input);

    try {
      const jobSettings = this.createJobSettings(input);
      const createJobCommand = new CreateJobCommand(jobSettings);
      const { Job } = await this.mediaConvertClient.send(createJobCommand);
      
      if (!Job?.Id) {
        throw new Error('MediaConvert job creation failed: No job ID returned');
      }

      const mediaConvertJobId = Job.Id;

      // Update job status with MediaConvert job ID and initial progress
      await updateJobProgress(jobId, 0, 'Video processing started', mediaConvertJobId);

      console.log('MediaConvert job created successfully:', {
        jobId: mediaConvertJobId,
        status: Job.Status,
        settings: Job.Settings
      });

      // Start monitoring the job
      this.monitorJob(jobId, mediaConvertJobId);

      return mediaConvertJobId;
    } catch (error: any) {
      console.error('MediaConvert job creation failed:', {
        error: error.message,
        stack: error.stack,
        details: error
      });
      await markJobFailed(jobId, error.message || 'Failed to create MediaConvert job');
      throw error;
    }
  }

  private async monitorJob(jobId: string, mediaConvertJobId: string): Promise<void> {
    const checkStatus = async () => {
      try {
        const status = await this.checkJobStatus(mediaConvertJobId);
        
        switch (status.status) {
          case MediaConvertStatus.COMPLETE:
            try {
              // Wait for output file with retries
              const outputUri = await this.waitForOutput(mediaConvertJobId);
              await markJobCompleted(jobId, outputUri);
            } catch (error) {
              console.error('Failed to get output after completion:', error);
              await markJobFailed(jobId, 'Failed to get video output');
            }
            break;

          case MediaConvertStatus.ERROR:
            await markJobFailed(jobId, status.errorMessage || 'Unknown error occurred');
            break;

          case MediaConvertStatus.CANCELED:
            await markJobFailed(jobId, 'Job was canceled');
            break;

          case MediaConvertStatus.PROGRESSING:
            // Ensure we have a progress value, default to previous progress if not available
            const currentStatus = await getJobStatus(jobId);
            const previousProgress = currentStatus?.progress || 0;
            const progress = status.progress !== undefined ? status.progress : previousProgress;

            await updateJobProgress(
              jobId,
              progress,
              'Processing video...',
              mediaConvertJobId
            );
            // Continue monitoring
            setTimeout(checkStatus, this.CHECK_INTERVAL);
            break;

          default:
            // For SUBMITTED or any other status, continue monitoring
            // Keep the previous progress value and ensure mediaConvertJobId is passed
            const existingStatus = await getJobStatus(jobId);
            await updateJobProgress(
              jobId,
              existingStatus?.progress || 0,
              'Initializing video processing...',
              mediaConvertJobId
            );
            setTimeout(checkStatus, this.CHECK_INTERVAL);
        }
      } catch (error: any) {
        console.error('Error monitoring job:', error);
        await markJobFailed(jobId, error.message || 'Failed to monitor job status');
      }
    };

    // Start monitoring
    checkStatus();
  }

  private async checkJobStatus(mediaConvertJobId: string): Promise<MediaConvertJobStatus> {
    try {
      const getJobCommand = new GetJobCommand({ Id: mediaConvertJobId });
      const { Job } = await this.mediaConvertClient.send(getJobCommand);
      
      if (!Job) {
        throw new Error('MediaConvert job not found');
      }

      const response: MediaConvertJobStatus = {
        status: Job.Status as MediaConvertStatusType,
        errorMessage: Job.ErrorMessage,
        progress: typeof Job.JobPercentComplete === 'number' ? Job.JobPercentComplete : undefined,
        mediaConvertJobId // Include the mediaConvertJobId in the response
      };

      if (Job.Status === MediaConvertStatus.COMPLETE) {
        try {
          // Use the new URL handling strategy with retries
          response.outputUri = await this.waitForOutput(mediaConvertJobId);
          console.log('Generated video URL:', response.outputUri);
        } catch (error) {
          console.error('Failed to get video URL:', error);
          response.status = MediaConvertStatus.ERROR;
          response.errorMessage = 'Failed to generate accessible video URL';
        }
      }

      return response;
    } catch (error: any) {
      console.error('Failed to get MediaConvert job status:', {
        jobId: mediaConvertJobId,
        error: error.message,
        stack: error.stack,
        details: error
      });
      throw error;
    }
  }

  public async getJobStatus(jobId: string): Promise<MediaConvertJobStatus> {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      throw new Error('Job status can only be checked on the server side')
    }

    const status = await getJobStatus(jobId);
    if (!status) {
      throw new Error('Job not found');
    }

    // Map job status to MediaConvert status
    let mediaConvertStatus: MediaConvertStatusType;
    switch (status.status) {
      case JobStatus.COMPLETED:
        mediaConvertStatus = MediaConvertStatus.COMPLETE;
        break;
      case JobStatus.FAILED:
        mediaConvertStatus = MediaConvertStatus.ERROR;
        break;
      case JobStatus.PROCESSING:
        mediaConvertStatus = MediaConvertStatus.PROGRESSING;
        break;
      default:
        mediaConvertStatus = MediaConvertStatus.SUBMITTED;
    }

    return {
      status: mediaConvertStatus,
      errorMessage: status.error,
      progress: status.progress,
      outputUri: status.videoUrl,
      mediaConvertJobId: status.mediaConvertJobId // Include the mediaConvertJobId in the response
    };
  }
}
