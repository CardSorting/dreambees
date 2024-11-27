import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth'
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

    console.log('Initializing Firebase...')

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const firestore = getFirestore(app)

    // Set persistence to LOCAL
    await setPersistence(auth, browserLocalPersistence)

    // Add auth state change listener for debugging
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        // Log only serializable user data
        const userInfo = user ? {
          email: user.email,
          uid: user.uid,
          emailVerified: user.emailVerified
        } : null;
        console.log('Firebase auth state changed:', userInfo ? `logged in as ${userInfo.email}` : 'logged out')
      },
      (error) => {
        // Log only serializable error properties
        console.error('Firebase auth error:', {
          code: error instanceof Error ? (error as FirebaseError).code : 'unknown',
          message: error.message
        })
      }
    )

    // Clean up listener on app unmount
    nuxtApp.hook('app:beforeMount', () => {
      unsubscribe()
    })

    console.log('Firebase initialized successfully')

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
    // Log only serializable error properties
    const firebaseError = error as FirebaseError
    console.error('Failed to initialize Firebase:', {
      message: firebaseError.message,
      ...(firebaseError.code && { code: firebaseError.code })
    })
    throw error
  }
})
