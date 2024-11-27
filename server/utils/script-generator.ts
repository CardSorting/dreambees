import OpenAI from 'openai'
import { getSignedS3Url } from './s3'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Redis } from '@upstash/redis'

// Load environment variables
dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), '../../.env')
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

export interface ScriptGenerationResult {
  script: string;
  segments: string[];
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  text: string;
  words: WordTiming[];
  length?: number;
  toString(): string;
}

const CACHE_EXPIRY = 60 * 60 * 24 * 7 // 7 days in seconds

export async function generateScript(imageKey: string): Promise<ScriptGenerationResult> {
  try {
    // Check cache first
    const cacheKey = `script:${imageKey}`
    const cachedResult = await redis.get<ScriptGenerationResult>(cacheKey)
    
    if (cachedResult) {
      console.log('Using cached script for:', imageKey)
      return cachedResult
    }

    // If not in cache, generate new script
    console.log('Generating new script for:', imageKey)
    
    // Get a signed URL that OpenAI can access
    const signedImageUrl = await getSignedS3Url(imageKey, 300) // 5 minutes expiry

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Generate a creative short-form video script based on this image. The script should be engaging and suitable for social media, about 30-60 seconds long. Break it into natural speaking segments." 
            },
            {
              type: "image_url",
              image_url: {
                url: signedImageUrl,
                detail: "high"
              }
            }
          ],
        },
      ],
      max_tokens: 500
    })

    const script = visionResponse.choices[0]?.message?.content
    if (!script) {
      throw new Error('Failed to generate script from image')
    }

    // Break script into segments for better speech synthesis
    const segments = script.split(/(?<=[.!?])\s+/)
      .filter(segment => segment.trim().length > 0)
      .map(segment => segment.trim())

    const result: ScriptGenerationResult = {
      script,
      segments
    }

    // Cache the result
    await redis.setex(cacheKey, CACHE_EXPIRY, result)

    return result
  } catch (error: any) {
    console.error('Script generation error:', error)
    if (error.status === 400) {
      throw new Error('Failed to analyze image. Please ensure the image is valid and try again.')
    } else if (error.status === 401) {
      throw new Error('Authentication error with AI service. Please try again later.')
    } else if (error.status === 429) {
      throw new Error('AI service quota exceeded. Please try again later.')
    } else if (error.status === 500) {
      throw new Error('AI service error. Please try again later.')
    }
    throw new Error('Failed to generate script: ' + (error.message || 'Unknown error'))
  }
}

export async function generateSpeech(text: string): Promise<Buffer> {
  try {
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text
    })

    return Buffer.from(await speechResponse.arrayBuffer())
  } catch (error: any) {
    console.error('Speech generation error:', error)
    if (error.status === 400) {
      throw new Error('Invalid text for speech generation. Please try again.')
    } else if (error.status === 401) {
      throw new Error('Authentication error with AI service. Please try again later.')
    } else if (error.status === 429) {
      throw new Error('AI service quota exceeded. Please try again later.')
    } else if (error.status === 500) {
      throw new Error('AI service error. Please try again later.')
    }
    throw new Error('Failed to generate speech: ' + (error.message || 'Unknown error'))
  }
}

export async function generateTranscription(audioFile: File): Promise<TranscriptionResult> {
  try {
    // Use Whisper with word-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    });

    // Extract word timings from the response
    const words: WordTiming[] = (transcription as any).words?.map((word: any) => ({
      word: word.word,
      start: word.start * 1000, // Convert to milliseconds
      end: word.end * 1000
    })) || [];

    // Create result object with toString method
    const result: TranscriptionResult = {
      text: transcription.text,
      words,
      length: transcription.text.length,
      toString() {
        return this.text;
      }
    };

    return result;
  } catch (error: any) {
    console.error('Transcription error:', error)
    if (error.status === 400) {
      throw new Error('Invalid audio file for transcription. Please try again.')
    } else if (error.status === 401) {
      throw new Error('Authentication error with AI service. Please try again later.')
    } else if (error.status === 429) {
      throw new Error('AI service quota exceeded. Please try again later.')
    } else if (error.status === 500) {
      throw new Error('AI service error. Please try again later.')
    }
    throw new Error('Failed to generate transcription: ' + (error.message || 'Unknown error'))
  }
}
