import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // Firebase configuration
  const firebaseConfig = {
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const firestore = getFirestore(app)

  // Provide Firebase instances to the app
  nuxtApp.provide('firebase', {
    app,
    auth,
    firestore
  })

  // Return plugin type definitions
  return {
    provide: {
      firebase: {
        app,
        auth,
        firestore
      }
    }
  }
})

// Type declarations
declare module '#app' {
  interface NuxtApp {
    $firebase: {
      app: ReturnType<typeof initializeApp>
      auth: ReturnType<typeof getAuth>
      firestore: ReturnType<typeof getFirestore>
    }
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $firebase: {
      app: ReturnType<typeof initializeApp>
      auth: ReturnType<typeof getAuth>
      firestore: ReturnType<typeof getFirestore>
    }
  }
}
