import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { useRuntimeConfig } from '#app'

export function useFirebase() {
  const config = useRuntimeConfig()

  // Firebase configuration
  const firebaseConfig = {
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  const firestore = getFirestore(app)

  return {
    app,
    firestore
  }
}

// Plugin to make Firebase available throughout the app
export default defineNuxtPlugin((nuxtApp) => {
  const { app, firestore } = useFirebase()

  // Provide Firebase instances to the app
  nuxtApp.provide('firebase', {
    app,
    firestore
  })
})
