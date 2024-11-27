import { ref, onUnmounted } from 'vue'
import { getJobStatus } from '~/server/utils/job-status'
import { JobStatus, type JobStatusType } from '~/server/utils/types'

export function useJobStatus(jobId: string) {
  const status = ref<JobStatusType>(JobStatus.PROCESSING)
  const message = ref<string>('Initializing...')
  const progress = ref<number>(0)
  const error = ref<string | undefined>()
  const videoUrl = ref<string | undefined>()
  const isPolling = ref(false)
  let pollInterval: NodeJS.Timeout | null = null

  async function poll() {
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

      // Stop polling if job is complete or failed
      if (jobStatus.status === JobStatus.COMPLETED || jobStatus.status === JobStatus.FAILED) {
        stopPolling()
      }
    } catch (err) {
      console.error('Error polling job status:', err)
    }
  }

  function startPolling(interval = 5000) {
    if (isPolling.value) return

    isPolling.value = true
    poll() // Initial poll

    // Set up interval
    pollInterval = setInterval(poll, interval)
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
