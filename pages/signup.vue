<script setup lang="ts">
import { useAuth } from 'vue-clerk'
import { onMounted, watch } from 'vue'

const { isSignedIn } = useAuth()

// Redirect to dashboard if already signed in
onMounted(() => {
  if (isSignedIn.value) {
    navigateTo('/dashboard')
  }
})

// Watch for sign in state changes
watch(isSignedIn, (newValue) => {
  if (newValue) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>
      
      <div class="mt-8">
        <ClerkSignUp 
          :routing="'path'"
          :path="'/signup'"
          :redirect-url="'/dashboard'"
          :appearance="{
            elements: {
              rootBox: 'mx-auto',
              card: 'rounded-lg shadow-md',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'rounded-lg',
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
              footerActionLink: 'text-indigo-600 hover:text-indigo-700'
            }
          }"
        />
      </div>
    </div>
  </div>
</template>
