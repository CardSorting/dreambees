<script setup lang="ts">
import { useAuth } from 'vue-clerk'
import { useVideosStore } from '~/stores/videos'
import { useUserProfile } from '~/composables/useUserProfile'
import { onMounted } from 'vue'

const { isSignedIn } = useAuth()
const videosStore = useVideosStore()
const { profile, isLoading: isProfileLoading, error: profileError } = useUserProfile()

onMounted(async () => {
  if (isSignedIn.value) {
    await videosStore.fetchVideos()
    await videosStore.fetchCollections()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="py-10">
      <header>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main>
        <div class="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <!-- User Profile Section -->
          <div class="px-4 py-6 sm:px-0">
            <div v-if="isProfileLoading" class="animate-pulse">
              <div class="h-32 bg-gray-200 rounded-lg"></div>
            </div>
            
            <div v-else-if="profileError" class="bg-red-50 p-4 rounded-lg">
              <p class="text-red-700">{{ profileError }}</p>
            </div>
            
            <div v-else-if="profile" class="overflow-hidden bg-white shadow sm:rounded-lg">
              <div class="px-4 py-5 sm:px-6">
                <div class="flex items-center">
                  <img 
                    v-if="profile.imageUrl"
                    :src="profile.imageUrl" 
                    :alt="profile.firstName || 'User'"
                    class="h-12 w-12 rounded-full"
                  >
                  <div class="ml-4">
                    <h3 class="text-lg font-medium leading-6 text-gray-900">
                      Welcome, {{ profile.firstName || 'User' }}!
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">
                      {{ profile.email }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="mt-8 px-4 sm:px-0">
            <div class="overflow-hidden bg-white shadow sm:rounded-lg">
              <div class="p-6">
                <h2 class="text-lg font-medium text-gray-900">Quick Actions</h2>
                <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <NuxtLink
                    to="/video-generator"
                    class="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                  >
                    Create New Video
                  </NuxtLink>
                  <button
                    @click="videosStore.fetchVideos"
                    class="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Refresh Videos
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Videos Grid -->
          <div class="mt-8 px-4 sm:px-0">
            <div v-if="videosStore.loading" class="text-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
              <p class="mt-4 text-gray-600">Loading your videos...</p>
            </div>
            
            <div v-else-if="videosStore.error" class="text-center py-12">
              <p class="text-red-600">{{ videosStore.error }}</p>
            </div>
            
            <div v-else-if="videosStore.videos.length === 0" class="text-center py-12">
              <p class="text-gray-600">No videos yet. Create your first video!</p>
            </div>
            
            <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div 
                v-for="video in videosStore.videos" 
                :key="video.id"
                class="overflow-hidden rounded-lg bg-white shadow"
              >
                <video 
                  :src="video.url"
                  controls
                  class="w-full h-48 object-cover"
                ></video>
                <div class="p-4">
                  <p class="text-sm text-gray-500">
                    Created {{ new Date(video.createdAt).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
