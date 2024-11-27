import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { type FirebaseError } from 'firebase/app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  
  // Initialize Firebase with runtime config
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
    measurementId: config.public.firebaseMeasurementId
  }

  try {
    // Validate required config
    const requiredFields = [
      'firebaseApiKey',
      'firebaseAuthDomain',
      'firebaseProjectId'
    ]
    
    for (const field of requiredFields) {
      if (!config.public[field]) {
        throw new Error(`Missing required Firebase config: ${field}`)
      }
    }

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const firestore = getFirestore(app)

    // Set persistence to LOCAL
    await setPersistence(auth, browserLocalPersistence)

    return {
      provide: {
        firebase: {
          app,
          auth,
          firestore
        }
      }
    }
  } catch (error) {
    // Log only essential error information
    const firebaseError = error as FirebaseError
    console.error('Firebase initialization error:', firebaseError.message)
    throw error
  }
})
