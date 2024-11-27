import { ref, onUnmounted } from 'vue'
import { getJobStatus } from '~/server/utils/job-status'
import { JobStatus, type JobStatusType } from '~/server/utils/types'

interface JobStatusCallbacks {
  onComplete?: (videoUrl: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, message: string) => void;
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
      const jobStatus = await getJobStatus(jobId)
      if (!jobStatus) {
        console.error('Error polling job status: Job not found')
        return
      }

      status.value = jobStatus.status
      message.value = jobStatus.message || ''
      progress.value = jobStatus.progress || 0
      error.value = jobStatus.error
      videoUrl.value = jobStatus.videoUrl

      // Handle callbacks
      if (jobStatus.status === JobStatus.COMPLETED && jobStatus.videoUrl && callbacks?.onComplete) {
        callbacks.onComplete(jobStatus.videoUrl)
      } else if (jobStatus.status === JobStatus.FAILED && jobStatus.error && callbacks?.onError) {
        callbacks.onError(jobStatus.error)
      } else if (jobStatus.status === JobStatus.PROCESSING && callbacks?.onProgress) {
        callbacks.onProgress(jobStatus.progress || 0, jobStatus.message || '')
      }

      // Stop polling if job is complete or failed
      if (jobStatus.status === JobStatus.COMPLETED || jobStatus.status === JobStatus.FAILED) {
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
