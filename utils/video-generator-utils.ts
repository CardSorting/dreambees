import type { Ref } from 'vue'

export interface VideoGenerationState {
  isProcessing: Ref<boolean>
  processingProgress: Ref<number>
  processingStatus: Ref<string>
  error: Ref<string>
  canRetry: Ref<boolean>
  currentJobId: Ref<string | null>
  videoUrl: Ref<string>
}

export interface VideoGenerationError {
  code: string
  message: string
  retryable: boolean
}

// Error codes and their user-friendly messages
export const ERROR_MESSAGES = {
  NETWORK: {
    code: 'NETWORK_ERROR',
    message: 'Please check your internet connection and try again',
    retryable: true
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    message: 'The operation timed out. Please try again',
    retryable: true
  },
  INVALID_IMAGE: {
    code: 'INVALID_IMAGE',
    message: 'The image format is not supported',
    retryable: false
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'Image size must be less than 10MB',
    retryable: false
  },
  PROCESSING_ERROR: {
    code: 'PROCESSING_ERROR',
    message: 'There was an error processing your image',
    retryable: true
  },
  GENERATION_FAILED: {
    code: 'GENERATION_FAILED',
    message: 'Video generation failed',
    retryable: true
  },
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'You have exceeded your quota',
    retryable: false
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Server error occurred',
    retryable: true,
    allowCustomMessage: true // Allow custom error messages
  }
} as const

// Status messages for different stages
export const STATUS_MESSAGES = {
  UPLOADING: 'Uploading image...',
  ANALYZING: 'Analyzing image...',
  GENERATING_AUDIO: 'Generating audio...',
  CREATING_VIDEO: 'Creating video...',
  PROCESSING: 'Processing video...',
  QUEUED: 'Waiting in queue...',
  COMPLETED: 'Video ready!',
  FAILED: 'Generation failed'
} as const

// Progress stages
export const PROGRESS_STAGES = {
  START: 0,
  UPLOAD: 20,
  ANALYSIS: 40,
  GENERATION: 60,
  PROCESSING: 80,
  COMPLETE: 100
} as const

// Utility class to manage video generation state
export class VideoGenerationManager {
  private state: VideoGenerationState
  private abortController: AbortController | null = null

  constructor(state: VideoGenerationState) {
    this.state = state
  }

  // Initialize state for new generation
  initializeGeneration() {
    this.abortController?.abort()
    this.abortController = new AbortController()
    this.state.isProcessing.value = true
    this.state.error.value = ''
    this.state.canRetry.value = false
    this.state.processingProgress.value = PROGRESS_STAGES.START
    this.state.processingStatus.value = STATUS_MESSAGES.UPLOADING
  }

  // Update progress state with optional custom progress percentage
  updateProgress(stage: keyof typeof PROGRESS_STAGES, status: string, customProgress?: number) {
    if (customProgress !== undefined) {
      this.state.processingProgress.value = customProgress
    } else {
      this.state.processingProgress.value = PROGRESS_STAGES[stage]
    }
    this.state.processingStatus.value = status
  }

  // Handle errors
  handleError(error: Error | VideoGenerationError) {
    let errorDetails: VideoGenerationError

    if ('code' in error) {
      errorDetails = error as VideoGenerationError
    } else {
      // Map common errors to our error types
      if (!navigator.onLine) {
        errorDetails = ERROR_MESSAGES.NETWORK
      } else if (error.name === 'TimeoutError') {
        errorDetails = ERROR_MESSAGES.TIMEOUT
      } else {
        errorDetails = {
          ...ERROR_MESSAGES.SERVER_ERROR,
          message: error.message || ERROR_MESSAGES.SERVER_ERROR.message
        }
      }
    }

    this.state.error.value = errorDetails.message
    this.state.canRetry.value = errorDetails.retryable
    this.state.isProcessing.value = false
    this.state.processingProgress.value = PROGRESS_STAGES.START
    this.state.processingStatus.value = STATUS_MESSAGES.FAILED
  }

  // Complete generation
  completeGeneration(videoUrl: string) {
    this.state.processingProgress.value = PROGRESS_STAGES.COMPLETE
    this.state.processingStatus.value = STATUS_MESSAGES.COMPLETED
    this.state.videoUrl.value = videoUrl
    this.state.isProcessing.value = false
    this.state.currentJobId.value = null
  }

  // Get abort signal for fetch requests
  get signal() {
    return this.abortController?.signal
  }

  // Cleanup resources
  cleanup() {
    this.abortController?.abort()
  }
}

// Polling configuration with exponential backoff
export interface PollingConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  maxRetries: 60, // 5 minutes maximum with varying delays
  initialDelay: 1000, // Start with 1 second
  maxDelay: 10000, // Max 10 seconds between polls
  backoffFactor: 1.5 // Increase delay by 50% each time
}

// Utility function to handle polling with exponential backoff
export async function pollWithBackoff<T>(
  pollFn: () => Promise<T>,
  checkResult: (result: T) => boolean,
  config: PollingConfig = DEFAULT_POLLING_CONFIG
): Promise<T> {
  let retries = 0
  let delay = config.initialDelay

  while (retries < config.maxRetries) {
    const result = await pollFn()
    
    if (checkResult(result)) {
      return result
    }

    await new Promise(resolve => setTimeout(resolve, delay))
    delay = Math.min(config.maxDelay, delay * config.backoffFactor)
    retries++
  }

  throw new Error('Polling timed out')
}

// Validate image file
export function validateImageFile(file: File): VideoGenerationError | null {
  if (file.size > 10 * 1024 * 1024) {
    return ERROR_MESSAGES.FILE_TOO_LARGE
  }
  
  if (!file.type.startsWith('image/')) {
    return ERROR_MESSAGES.INVALID_IMAGE
  }

  return null
}

// Handle file reading with proper error handling
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// Safe URL operations
export const urlUtils = {
  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob)
  },
  
  revokeObjectURL(url: string) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  },
  
  async downloadFromURL(url: string, filename: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Download failed')
    
    const blob = await response.blob()
    const objectUrl = this.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    this.revokeObjectURL(objectUrl)
  }
}
