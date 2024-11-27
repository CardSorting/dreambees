<script setup lang="ts">
import { useAuth } from 'vue-clerk'
import { useRoute } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { useClerkFirestore } from '~/composables/useClerkFirestore'
import { useFirebaseAuth } from '~/composables/useFirebaseAuth'
import { useUserProfile } from '~/composables/useUserProfile'

const { isSignedIn, isLoaded } = useAuth()
const route = useRoute()
const { syncUserToFirestore } = useClerkFirestore()
const { signInToFirebase, signOutFromFirebase, isFirebaseAuthenticated, error: firebaseError } = useFirebaseAuth()
const { profile } = useUserProfile()

// Determine if current route is an auth page
const isAuthPage = computed(() => {
  return ['/login', '/signup'].includes(route.path)
})

// Show loading state while Clerk is initializing
const showLoading = computed(() => {
  return !isLoaded.value && !isAuthPage.value
})

// Handle Clerk authentication changes
watch(isSignedIn, async (newValue) => {
  if (newValue) {
    try {
      // Sync user data to Firestore
      await syncUserToFirestore()
      // Sign in to Firebase
      await signInToFirebase()
    } catch (error) {
      console.error('Authentication sync error:', error)
    }
  } else {
    // Sign out from Firebase when user signs out from Clerk
    try {
      await signOutFromFirebase()
    } catch (error) {
      console.error('Firebase sign out error:', error)
    }
  }
})

// Initial authentication check
onMounted(async () => {
  if (isSignedIn.value) {
    try {
      await syncUserToFirestore()
      await signInToFirebase()
    } catch (error) {
      console.error('Initial authentication sync error:', error)
    }
  }
})
</script>

<template>
  <ClerkProvider>
    <!-- Loading state -->
    <div v-if="showLoading" class="min-h-screen flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
    </div>

    <!-- Firebase error alert -->
    <div v-if="firebaseError" class="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ firebaseError }}</span>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Show navigation only when not on auth pages -->
      <nav v-if="!isAuthPage" class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <!-- Left side navigation -->
            <div class="flex">
              <NuxtLink to="/" class="flex-shrink-0 flex items-center">
                <span class="text-xl font-bold text-indigo-600">DreamBees</span>
              </NuxtLink>
            </div>

            <!-- Right side navigation -->
            <div class="flex items-center space-x-4">
              <template v-if="isSignedIn">
                <!-- Main navigation links -->
                <NuxtLink 
                  to="/dashboard"
                  class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                  :class="{ 'text-indigo-600': route.path === '/dashboard' }"
                >
                  Dashboard
                </NuxtLink>
                <NuxtLink 
                  to="/video-generator"
                  class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                  :class="{ 'text-indigo-600': route.path === '/video-generator' }"
                >
                  Create Video
                </NuxtLink>

                <!-- User menu -->
                <div class="relative ml-3">
                  <div class="flex items-center">
                    <NuxtLink 
                      to="/settings"
                      class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                      :class="{ 'text-indigo-600': route.path === '/settings' }"
                    >
                      Settings
                    </NuxtLink>
                    <ClerkUserButton />
                  </div>
                </div>
              </template>
              <template v-else>
                <NuxtLink 
                  to="/login"
                  class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </NuxtLink>
                <NuxtLink 
                  to="/signup"
                  class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign Up
                </NuxtLink>
              </template>
            </div>
          </div>
        </div>
      </nav>

      <!-- Page content -->
      <NuxtPage />
    </div>
  </ClerkProvider>
</template>
