import { ref, onUnmounted } from 'vue'
import { JobStatus, type JobStatusType } from '~/types/job'

interface JobStatusCallbacks {
  onComplete?: (videoUrl: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, message: string) => void;
}

interface JobStatusResponse {
  success: boolean;
  status: JobStatusType;
  message?: string;
  progress?: number;
  error?: string;
  videoUrl?: string;
}

export function useJobStatus(callbacks?: JobStatusCallbacks) {
  const status = ref<JobStatusType>(JobStatus.PROCESSING)
  const message = ref<string>('Initializing...')
  const progress = ref<number>(0)
  const error = ref<string | undefined>()
  const videoUrl = ref<string | undefined>()
  const isPolling = ref(false)
  let pollInterval: NodeJS.Timeout | null = null

  async function poll(jobId: string) {
    try {
      // Use session-based auth with credentials
      const response = await fetch(`/api/video-status/${jobId}`, {
        credentials: 'include' // Include cookies in the request
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data: JobStatusResponse = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to get job status')
      }

      status.value = data.status
      message.value = data.message || ''
      progress.value = data.progress || 0
      error.value = data.error
      videoUrl.value = data.videoUrl

      // Handle callbacks
      if (data.status === JobStatus.COMPLETED && data.videoUrl && callbacks?.onComplete) {
        callbacks.onComplete(data.videoUrl)
      } else if (data.status === JobStatus.FAILED && data.error && callbacks?.onError) {
        callbacks.onError(data.error)
      } else if (data.status === JobStatus.PROCESSING && callbacks?.onProgress) {
        callbacks.onProgress(data.progress || 0, data.message || '')
      }

      // Stop polling if job is complete or failed
      if (data.status === JobStatus.COMPLETED || data.status === JobStatus.FAILED) {
        stopPolling()
      }
    } catch (err) {
      console.error('Error polling job status:', err)
      if (callbacks?.onError) {
        callbacks.onError('Failed to check job status')
      }
    }
  }

  function startPolling(jobId: string, interval = 5000) {
    if (isPolling.value) return

    isPolling.value = true
    poll(jobId) // Initial poll

    // Set up interval
    pollInterval = setInterval(() => poll(jobId), interval)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    isPolling.value = false
  }

  // Clean up on component unmount
  onUnmounted(() => {
    stopPolling()
  })

  return {
    status,
    message,
    progress,
    error,
    videoUrl,
    isPolling,
    startPolling,
    stopPolling,
    poll
  }
}
