<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Initialize auth state when the app starts
onMounted(async () => {
  try {
    await authStore.init()
  } catch (error) {
    console.error('Failed to initialize auth:', error)
  }
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
