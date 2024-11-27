<script setup lang="ts">
import { useUserProfile } from '~/composables/useUserProfile'
import { ref, watch } from 'vue'
import { doc, setDoc } from 'firebase/firestore'
import { useNuxtApp } from '#app'

const { profile, isLoading, error, refreshProfile } = useUserProfile()
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Form data
const formData = ref({
  displayName: '',
  notificationsEnabled: true,
  theme: 'light'
})

// Initialize form with profile data
watch(() => profile.value, (newProfile) => {
  if (newProfile?.customData) {
    formData.value = {
      displayName: newProfile.customData.displayName || '',
      notificationsEnabled: newProfile.customData.notificationsEnabled ?? true,
      theme: newProfile.customData.theme || 'light'
    }
  }
}, { immediate: true })

const saveSettings = async () => {
  if (!profile.value) return

  isSaving.value = true
  saveError.value = null
  successMessage.value = null

  try {
    const { $firebase } = useNuxtApp()
    const userRef = doc($firebase.firestore, `users/${profile.value.id}`)
    
    await setDoc(userRef, {
      customData: {
        displayName: formData.value.displayName,
        notificationsEnabled: formData.value.notificationsEnabled,
        theme: formData.value.theme
      },
      updatedAt: new Date().toISOString()
    }, { merge: true })

    successMessage.value = 'Settings saved successfully'
    await refreshProfile()
  } catch (e: any) {
    console.error('Error saving settings:', e)
    saveError.value = e.message || 'Failed to save settings'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-10">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div class="space-y-6">
        <!-- Header -->
        <div>
          <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">Settings</h1>
          <p class="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div v-if="isLoading" class="animate-pulse">
          <div class="h-32 bg-gray-200 rounded-lg"></div>
        </div>

        <div v-else-if="error" class="bg-red-50 p-4 rounded-lg">
          <p class="text-red-700">{{ error }}</p>
        </div>

        <template v-else-if="profile">
          <!-- Profile Section -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h2 class="text-lg font-medium leading-6 text-gray-900">Profile</h2>
              
              <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div class="sm:col-span-4">
                  <label for="displayName" class="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <div class="mt-1">
                    <input
                      id="displayName"
                      v-model="formData.displayName"
                      type="text"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences Section -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h2 class="text-lg font-medium leading-6 text-gray-900">Preferences</h2>
              
              <div class="mt-6">
                <div class="flex items-center">
                  <input
                    id="notifications"
                    v-model="formData.notificationsEnabled"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  >
                  <label for="notifications" class="ml-3 block text-sm font-medium text-gray-700">
                    Enable notifications
                  </label>
                </div>

                <div class="mt-6">
                  <label for="theme" class="block text-sm font-medium text-gray-700">Theme</label>
                  <select
                    id="theme"
                    v-model="formData.theme"
                    class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end">
            <button
              type="button"
              :disabled="isSaving"
              @click="saveSettings"
              class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <template v-if="isSaving">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </template>
              <template v-else>
                Save Changes
              </template>
            </button>
          </div>

          <!-- Messages -->
          <div v-if="successMessage" class="rounded-md bg-green-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
              </div>
            </div>
          </div>

          <div v-if="saveError" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-red-800">{{ saveError }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
