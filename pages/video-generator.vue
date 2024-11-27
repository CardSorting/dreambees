<script setup lang="ts">
import { ref } from 'vue'
import type { VideoGenerationState, VideoGenerationError } from '~/utils/video-generator-utils'
import { 
  VideoGenerationManager,
  validateImageFile,
  readFileAsDataURL,
  urlUtils,
  PROGRESS_STAGES,
  STATUS_MESSAGES
} from '~/utils/video-generator-utils'
import { useAuthStore } from '~/stores/auth'
import { useJobStatus } from '~/composables/useJobStatus'

// API Response Types
interface VideoGenerationResponse {
  success: boolean;
  jobId?: string;
  code?: string;
  message?: string;
  retryable?: boolean;
}

definePageMeta({
  middleware: ['auth']
})

const authStore = useAuthStore()

// State management
const state: VideoGenerationState = {
  isProcessing: ref(false),
  processingProgress: ref(0),
  processingStatus: ref(''),
  error: ref(''),
  canRetry: ref(false),
  currentJobId: ref(null),
  videoUrl: ref('')
}

const videoManager = new VideoGenerationManager(state)
const selectedImage = ref<File | null>(null)
const imagePreview = ref('')
const videoLoadError = ref(false)
const videoPlayer = ref<HTMLVideoElement | null>(null)

// Job status polling
const jobStatus = useJobStatus({
  onComplete: (videoUrl) => {
    videoManager.completeGeneration(videoUrl)
  },
  onError: (error) => {
    videoManager.handleError({
      code: 'GENERATION_FAILED',
      message: error,
      retryable: true
    })
  },
  onProgress: (progress, message) => {
    videoManager.updateProgress(
      'PROCESSING',
      message,
      progress
    )
  }
})

// Image handling
const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    const error = validateImageFile(file)
    if (error) {
      videoManager.handleError(error)
      return
    }
    
    selectedImage.value = file
    imagePreview.value = urlUtils.createObjectURL(file)
  }
}

const handleImageError = () => {
  videoManager.handleError({
    code: 'IMAGE_LOAD_ERROR',
    message: 'Failed to load image preview',
    retryable: false
  })
  imagePreview.value = ''
}

const handleVideoError = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.error('Video error:', video.error);
  videoLoadError.value = true;
}

const handleVideoLoaded = () => {
  videoLoadError.value = false;
}

const removeImage = () => {
  if (imagePreview.value) {
    urlUtils.revokeObjectURL(imagePreview.value)
  }
  selectedImage.value = null
  imagePreview.value = ''
  state.error.value = ''
  state.canRetry.value = false
}

// Video generation
const generateVideo = async () => {
  if (!selectedImage.value) return
  
  try {
    videoManager.initializeGeneration()
    videoLoadError.value = false
    
    // Convert image to base64
    const imageData = await readFileAsDataURL(selectedImage.value)
    
    videoManager.updateProgress('UPLOAD', STATUS_MESSAGES.UPLOADING)

    // Get auth token
    const token = await authStore.currentUser?.getIdToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    // Send to API
    const response = await $fetch<VideoGenerationResponse>('/api/video-generator', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      },
      body: { 
        imageData,
        previousJobId: state.currentJobId.value 
      }
    })

    if (!response.success || !response.jobId) {
      throw new Error(response.message || 'Failed to generate video')
    }

    state.currentJobId.value = response.jobId
    videoManager.updateProgress('ANALYSIS', STATUS_MESSAGES.ANALYZING)

    // Start polling job status
    jobStatus.startPolling(response.jobId)

  } catch (e: any) {
    videoManager.handleError(e)
  }
}

const retryGeneration = () => {
  state.error.value = ''
  state.canRetry.value = false
  generateVideo()
}

const dismissError = () => {
  state.error.value = ''
  state.canRetry.value = false
}

const downloadVideo = async () => {
  if (!state.videoUrl.value) return
  
  try {
    await urlUtils.downloadFromURL(state.videoUrl.value, 'generated-video.mp4')
  } catch (e: any) {
    videoManager.handleError({
      code: 'DOWNLOAD_ERROR',
      message: 'Failed to download video. Please try again.',
      retryable: true
    })
  }
}

// Cleanup
onUnmounted(() => {
  if (imagePreview.value) {
    urlUtils.revokeObjectURL(imagePreview.value)
  }
  if (videoPlayer.value) {
    videoPlayer.value.pause();
    videoPlayer.value.src = '';
  }
  videoManager.cleanup()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">AI Video Generator</h1>
        <NuxtLink 
          to="/dashboard"
          class="text-indigo-600 hover:text-indigo-700 flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Back to Dashboard
        </NuxtLink>
      </div>
      
      <!-- Error Message -->
      <div v-if="state.error.value" class="mb-8">
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ state.error.value }}</p>
              <div v-if="state.canRetry.value" class="mt-2">
                <button 
                  @click="retryGeneration"
                  class="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
            <div class="ml-auto pl-3">
              <div class="-mx-1.5 -my-1.5">
                <button 
                  @click="dismissError"
                  class="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span class="sr-only">Dismiss</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Upload Section -->
      <div class="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg">
        <div v-if="!selectedImage" class="text-center">
          <label class="cursor-pointer inline-flex items-center space-x-2">
            <span class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              Choose Image
            </span>
            <input 
              type="file" 
              class="hidden" 
              accept="image/*"
              @change="handleImageUpload"
            >
          </label>
          <p class="mt-2 text-sm text-gray-500">Supported formats: JPG, PNG (Max 10MB)</p>
        </div>
        <div v-else class="relative">
          <img 
            :src="imagePreview" 
            class="max-h-64 mx-auto rounded"
            alt="Selected image"
            @error="handleImageError"
          >
          <button 
            @click="removeImage"
            class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Generate Button -->
      <div class="text-center mb-8">
        <button 
          @click="generateVideo"
          :disabled="!selectedImage || state.isProcessing.value"
          :class="[
            'px-6 py-3 rounded-lg font-semibold transition-colors duration-200',
            !selectedImage || state.isProcessing.value 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          ]"
        >
          <span class="flex items-center justify-center">
            <svg 
              v-if="state.isProcessing.value"
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ state.isProcessing.value ? 'Generating...' : 'Generate Video' }}
          </span>
        </button>
      </div>

      <!-- Processing Status -->
      <div v-if="state.isProcessing.value" class="mb-8">
        <div class="bg-indigo-50 p-4 rounded-lg">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-indigo-700">{{ state.processingStatus.value }}</p>
            </div>
          </div>
          <div class="mt-3">
            <div class="h-2 bg-indigo-200 rounded">
              <div 
                class="h-full bg-indigo-600 rounded transition-all duration-300" 
                :style="{ width: `${state.processingProgress.value}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Video Preview -->
      <div v-if="state.videoUrl.value" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Generated Video</h2>
        <div class="bg-black rounded-lg overflow-hidden">
          <video 
            ref="videoPlayer"
            controls 
            class="w-full max-w-2xl mx-auto"
            :key="state.videoUrl.value"
            @error="handleVideoError"
            @loadeddata="handleVideoLoaded"
          >
            <source :src="state.videoUrl.value" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
        <div class="mt-4 text-center space-y-2">
          <p v-if="videoLoadError" class="text-red-600 text-sm">
            Unable to play video. Please try downloading instead.
          </p>
          <button 
            @click="downloadVideo"
            class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Download Video
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
