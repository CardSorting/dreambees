import { createVideoJob } from '../utils/mediaconvert'
import { updateJobProgress, markJobFailed } from '../utils/job-status'
import { generateScript, generateSpeech, generateTranscription } from '../utils/script-generator'
import { 
  processImageUpload, 
  processAudioUpload, 
  processSubtitlesUpload,
  createAudioFileFromBuffer,
  getApproximateAudioDuration,
  cleanupMediaFiles
} from '../utils/media-processor'
import { improveSubtitles, analyzeSyncPoints } from '../utils/subtitles'
import { s3Paths } from '../utils/s3'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Video processor can only be used on the server side')
}

interface VideoGenerationInput {
  jobId: string
  imageData: string // base64 encoded image
}

export async function startVideoGeneration(input: VideoGenerationInput) {
  const { jobId, imageData } = input
  
  try {
    console.log(`[${jobId}] Starting video generation process...`)

    // 1. Process and upload image
    console.log(`[${jobId}] Processing and uploading image...`)
    await updateJobProgress(jobId, 0, 'Processing image...')
    const imageFile = await processImageUpload(imageData, jobId)
    console.log(`[${jobId}] Image uploaded successfully:`, imageFile.key)

    // 2. Generate script from image
    console.log(`[${jobId}] Generating script from image...`)
    await updateJobProgress(jobId, 20, 'Analyzing image...')
    const { script, segments } = await generateScript(imageFile.key)
    console.log(`[${jobId}] Script generated successfully:`, {
      scriptLength: script.length,
      segmentsCount: segments.length
    })

    // 3. Generate speech from script
    console.log(`[${jobId}] Generating speech from script...`)
    await updateJobProgress(jobId, 40, 'Generating audio...')
    const audioBuffer = await generateSpeech(segments.join(' '))
    console.log(`[${jobId}] Speech generated successfully. Buffer size:`, audioBuffer.length)
    
    const audioFile = await processAudioUpload(audioBuffer, jobId)
    console.log(`[${jobId}] Audio uploaded successfully:`, audioFile.key)

    // 4. Generate and process subtitles with word-level timing
    console.log(`[${jobId}] Generating subtitles...`)
    await updateJobProgress(jobId, 60, 'Generating subtitles...')
    const audioFileObj = await createAudioFileFromBuffer(audioBuffer)
    console.log(`[${jobId}] Audio file created for transcription`)
    
    const transcriptionResult = await generateTranscription(audioFileObj)
    console.log(`[${jobId}] Transcription generated with word timings:`, {
      textLength: transcriptionResult.text.length,
      wordCount: transcriptionResult.words.length,
      firstFewWords: transcriptionResult.words.slice(0, 3)
    })
    
    // 5. Improve subtitle timing and synchronization using word timings
    console.log(`[${jobId}] Processing subtitle timing...`)
    const audioDuration = await getApproximateAudioDuration(audioBuffer)
    console.log(`[${jobId}] Audio duration:`, audioDuration)
    
    const subtitleOptions = {
      minDuration: 400,       // 400ms minimum for single words (increased from 300ms)
      maxDuration: 3000,      // 3 seconds maximum for longer words (increased from 2000ms)
      charReadingSpeed: 80,   // 80ms per character (slowed down from 50ms)
      pauseBetweenBlocks: 200,// 200ms between words (increased from 100ms)
      sentencePause: 500,     // 500ms pause for sentences (increased from 300ms)
      audioDuration           // Total audio duration
    };

    console.log(`[${jobId}] Generating subtitles with options:`, subtitleOptions);
    const improvedSubtitlesResult = improveSubtitles(
      transcriptionResult.text,
      subtitleOptions,
      transcriptionResult.words
    );

    if (!improvedSubtitlesResult.success) {
      console.error(`[${jobId}] Failed to improve subtitles:`, improvedSubtitlesResult.error);
      throw new Error(`Failed to improve subtitles: ${improvedSubtitlesResult.error.message}`);
    }
    console.log(`[${jobId}] Subtitles improved with word-level timing`);

    // Check subtitle synchronization
    const syncAnalysisResult = analyzeSyncPoints(improvedSubtitlesResult.data, audioDuration);
    if (!syncAnalysisResult.success) {
      console.error(`[${jobId}] Failed to analyze subtitle sync:`, syncAnalysisResult.error);
      throw new Error(`Failed to analyze subtitle sync: ${syncAnalysisResult.error.message}`);
    }
    
    console.log(`[${jobId}] Subtitle sync analysis:`, syncAnalysisResult.data);
    
    if (syncAnalysisResult.data.syncScore < 80) {
      console.warn(`[${jobId}] Low subtitle sync score:`, syncAnalysisResult.data.syncScore);
      console.warn(`[${jobId}] Sync suggestions:`, syncAnalysisResult.data.suggestions);
      
      // If sync score is very low, try to regenerate with more conservative timing
      if (syncAnalysisResult.data.syncScore < 50) {
        console.log(`[${jobId}] Attempting to regenerate subtitles with more conservative timing`);
        subtitleOptions.minDuration = 500;       // Even longer minimum duration
        subtitleOptions.pauseBetweenBlocks = 250;// Larger gaps between words
        subtitleOptions.sentencePause = 600;     // Longer sentence pauses
        
        const retryResult = improveSubtitles(
          transcriptionResult.text,
          subtitleOptions,
          transcriptionResult.words
        );
        
        if (retryResult.success) {
          console.log(`[${jobId}] Successfully regenerated subtitles with conservative timing`);
          improvedSubtitlesResult.data = retryResult.data;
        }
      }
    }

    // Upload processed subtitles
    console.log(`[${jobId}] Uploading processed subtitles...`);
    const subtitlesFile = await processSubtitlesUpload(improvedSubtitlesResult.data, jobId);
    console.log(`[${jobId}] Subtitles uploaded successfully:`, subtitlesFile.key);

    // 6. Start video generation
    console.log(`[${jobId}] Starting MediaConvert job...`);
    await updateJobProgress(jobId, 80, 'Creating video...');
    
    // Simplify output key construction to avoid path issues
    // Just use the jobId as the base filename in the output directory
    const outputKey = s3Paths.getOutputPath(`${jobId}.mp4`);
    
    console.log(`[${jobId}] MediaConvert job configuration:`, {
      imageKey: imageFile.key,
      audioKey: audioFile.key,
      subtitlesKey: subtitlesFile.key,
      outputKey
    });

    const mediaConvertJobId = await createVideoJob(jobId, {
      imageKey: imageFile.key,
      audioKey: audioFile.key,
      subtitlesKey: subtitlesFile.key,
      outputKey
    });
    console.log(`[${jobId}] MediaConvert job created:`, mediaConvertJobId);

    // Update progress to indicate MediaConvert job started
    await updateJobProgress(jobId, 90, 'Processing video...', mediaConvertJobId);
    console.log(`[${jobId}] Video generation process initiated successfully`);

  } catch (error: any) {
    console.error(`[${jobId}] Video generation error:`, {
      message: error.message,
      stack: error.stack,
      details: error
    });
    
    await markJobFailed(jobId, error.message || 'Video generation failed');
    console.log(`[${jobId}] Job marked as failed`);
    
    // Attempt to clean up any uploaded files
    try {
      console.log(`[${jobId}] Cleaning up uploaded files...`);
      await cleanupMediaFiles(jobId);
      console.log(`[${jobId}] Cleanup completed`);
    } catch (cleanupError) {
      console.error(`[${jobId}] Cleanup failed:`, cleanupError);
    }
    
    throw error;
  }
}
