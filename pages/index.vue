<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-indigo-600">DreamBees</h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="authStore.isAuthenticated">
              <span class="text-gray-700 mr-4">{{ authStore.currentUser?.email }}</span>
              <NuxtLink
                to="/dashboard"
                class="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
              >
                Dashboard
              </NuxtLink>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
              >
                Login
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
      <!-- Hero Section -->
      <div class="text-center">
        <h2 class="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span class="block">Welcome to DreamBees</span>
          <span class="block text-indigo-600">Your Digital Workspace</span>
        </h2>
        <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Experience the next generation of collaborative work environment. Join us to transform your ideas into reality.
        </p>
        <div class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div class="rounded-md shadow">
            <NuxtLink
              v-if="!authStore.isAuthenticated"
              to="/login"
              class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              Get Started
            </NuxtLink>
            <NuxtLink
              v-else
              to="/dashboard"
              class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              Go to Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Feature Section -->
      <div class="mt-24">
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900">Secure Authentication</h3>
            <p class="mt-2 text-gray-500">
              Powered by Firebase Authentication for secure and reliable user management.
            </p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900">Real-time Database</h3>
            <p class="mt-2 text-gray-500">
              Built with Firestore for real-time data synchronization and scalability.
            </p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900">Modern UI</h3>
            <p class="mt-2 text-gray-500">
              Beautiful and responsive design powered by Tailwind CSS and Nuxt.js.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Initialize auth state if needed
onMounted(async () => {
  if (!authStore.initialized) {
    await authStore.init()
  }
})
</script>
