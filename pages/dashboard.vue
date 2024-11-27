<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="text-xl font-bold text-indigo-600">DreamBees</NuxtLink>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NuxtLink
                to="/dashboard"
                class="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                to="/video-generator"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Video Generator
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center">
            <span class="text-gray-700 mr-4">{{ authStore.currentUser?.email }}</span>
            <button
              @click="handleLogout"
              class="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Collections and Videos Section -->
      <div class="bg-white shadow rounded-lg">
        <!-- Header -->
        <div class="border-b border-gray-200 px-6 py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <h2 class="text-2xl font-bold text-gray-900">
                {{ currentCollectionName }}
              </h2>
              <button
                v-if="videosStore.currentCollection"
                @click="videosStore.setCurrentCollection(null)"
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to All Videos
              </button>
            </div>
            <div class="flex space-x-4">
              <button
                @click="isNewCollectionModalOpen = true"
                class="text-indigo-600 hover:text-indigo-700 px-4 py-2 border border-indigo-600 rounded-md"
              >
                New Collection
              </button>
              <NuxtLink
                to="/video-generator"
                class="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
              >
                Create New Video
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="videosStore.loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="videosStore.error" class="text-center py-8">
          <p class="text-red-600">{{ videosStore.error }}</p>
          <button
            @click="refreshData"
            class="mt-4 text-indigo-600 hover:text-indigo-500"
          >
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div 
          v-else-if="!videosStore.currentCollection && videosStore.videos.length === 0" 
          class="text-center py-8"
        >
          <p class="text-gray-600">You haven't created any videos yet.</p>
          <NuxtLink
            to="/video-generator"
            class="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
          >
            Create Your First Video
          </NuxtLink>
        </div>

        <!-- Content -->
        <div v-else class="p-6">
          <!-- Collections List (when not in a collection) -->
          <div v-if="!videosStore.currentCollection && videosStore.collections.length > 0" class="mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Collections</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="collection in videosStore.collections"
                :key="collection.id"
                @click="videosStore.setCurrentCollection(collection.id)"
                class="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div class="flex justify-between items-center">
                  <h4 class="font-medium text-gray-900">{{ collection.name }}</h4>
                  <span class="text-sm text-gray-500">{{ collection.videoCount }} videos</span>
                </div>
                <p class="text-sm text-gray-500 mt-1">
                  Created {{ new Date(collection.createdAt).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Videos Grid -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              {{ videosStore.currentCollection ? 'Collection Videos' : 'All Videos' }}
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="video in videosStore.videosByCollection"
                :key="video.id"
                class="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <video
                  :src="video.url"
                  class="w-full aspect-[9/16] object-cover"
                  controls
                ></video>
                <div class="p-4">
                  <div class="flex justify-between items-start mb-2">
                    <p class="text-sm text-gray-500">
                      Created {{ new Date(video.createdAt).toLocaleDateString() }}
                    </p>
                    <div class="relative">
                      <button
                        @click="toggleVideoMenu(video.id)"
                        class="text-gray-500 hover:text-gray-700"
                      >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      <!-- Video Actions Menu -->
                      <div
                        v-if="activeVideoMenu === video.id"
                        class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                      >
                        <div class="py-1">
                          <a
                            :href="video.url"
                            target="_blank"
                            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download Video
                          </a>
                          <button
                            v-if="!video.collectionId"
                            @click="openAddToCollectionModal(video)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Add to Collection
                          </button>
                          <button
                            v-else
                            @click="removeFromCollection(video)"
                            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            Remove from Collection
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- New Collection Modal -->
    <div v-if="isNewCollectionModalOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Collection</h3>
        <input
          v-model="newCollectionName"
          type="text"
          placeholder="Collection Name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
        >
        <div class="flex justify-end space-x-4">
          <button
            @click="isNewCollectionModalOpen = false"
            class="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            @click="createCollection"
            class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            :disabled="!newCollectionName"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Add to Collection Modal -->
    <div v-if="isAddToCollectionModalOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Add to Collection</h3>
        <div class="space-y-2 mb-4">
          <div
            v-for="collection in videosStore.collections"
            :key="collection.id"
            @click="addToCollection(selectedVideo!, collection.id)"
            class="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
          >
            {{ collection.name }}
          </div>
        </div>
        <div class="flex justify-end">
          <button
            @click="closeAddToCollectionModal"
            class="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useVideosStore } from '~/stores/videos'

definePageMeta({
  middleware: ['auth']
})

const authStore = useAuthStore()
const videosStore = useVideosStore()

// State
const isNewCollectionModalOpen = ref(false)
const isAddToCollectionModalOpen = ref(false)
const newCollectionName = ref('')
const selectedVideo = ref<any>(null)
const activeVideoMenu = ref<string | null>(null)

// Computed
const currentCollectionName = computed(() => {
  if (!videosStore.currentCollection) return 'Your Videos'
  const collection = videosStore.collections.find(c => c.id === videosStore.currentCollection)
  return collection ? collection.name : 'Your Videos'
})

// Methods
const refreshData = async () => {
  await Promise.all([
    videosStore.fetchVideos(),
    videosStore.fetchCollections()
  ])
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    navigateTo('/')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const createCollection = async () => {
  if (!newCollectionName.value) return
  
  try {
    await videosStore.createCollection(newCollectionName.value)
    isNewCollectionModalOpen.value = false
    newCollectionName.value = ''
  } catch (error) {
    console.error('Failed to create collection:', error)
  }
}

const toggleVideoMenu = (videoId: string) => {
  activeVideoMenu.value = activeVideoMenu.value === videoId ? null : videoId
}

const openAddToCollectionModal = (video: any) => {
  selectedVideo.value = video
  isAddToCollectionModalOpen.value = true
  activeVideoMenu.value = null
}

const closeAddToCollectionModal = () => {
  isAddToCollectionModalOpen.value = false
  selectedVideo.value = null
}

const addToCollection = async (video: any, collectionId: string) => {
  try {
    await videosStore.addVideoToCollection(video.id, collectionId)
    closeAddToCollectionModal()
  } catch (error) {
    console.error('Failed to add video to collection:', error)
  }
}

const removeFromCollection = async (video: any) => {
  try {
    if (video.collectionId) {
      await videosStore.removeVideoFromCollection(video.id, video.collectionId)
    }
    activeVideoMenu.value = null
  } catch (error) {
    console.error('Failed to remove video from collection:', error)
  }
}

// Initial data fetch
onMounted(async () => {
  await refreshData()
})

// Cleanup
onUnmounted(() => {
  activeVideoMenu.value = null
})
</script>

<style>
.router-link-active {
  border-color: rgb(99 102 241);
  color: rgb(17 24 39);
}
</style>
