<template>
  <div>
    <ClientOnly>
      <div v-if="!initialized" class="fixed inset-0 flex items-center justify-center bg-white">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
      <NuxtPage v-else />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const initialized = ref(false)

// Initialize auth state when the app starts
onMounted(async () => {
  try {
    console.log('Initializing app auth state...')
    await authStore.init()
    console.log('App auth state initialized')
  } catch (error) {
    console.error('Failed to initialize auth:', error)
  } finally {
    initialized.value = true
  }
})

// Watch for auth state changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  console.log('Auth state changed in app.vue:', isAuthenticated ? 'authenticated' : 'not authenticated')
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#__nuxt {
  height: 100%;
}
</style>
