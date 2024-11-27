import { signInWithCustomToken, signOut } from 'firebase/auth'
import { useAuth as useClerkAuth } from 'vue-clerk'
import { ref, onMounted, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'

export function useFirebaseAuth() {
  const nuxtApp = useNuxtApp()
  const { getToken } = useClerkAuth()
  const isFirebaseAuthenticated = ref(false)
  const error = ref<string | null>(null)

  const signInToFirebase = async () => {
    try {
      error.value = null
      const token = await getToken.value()
      
      if (!token) {
        throw new Error('No auth token available')
      }

      // Get Firebase custom token from server
      const response = await $fetch<{ firebaseToken: string }>('/api/auth/firebase-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.firebaseToken) {
        throw new Error('Failed to get Firebase token')
      }

      // Sign in to Firebase with custom token
      await signInWithCustomToken(nuxtApp.$firebase.auth, response.firebaseToken)
      isFirebaseAuthenticated.value = true

    } catch (e: any) {
      console.error('Firebase auth error:', e)
      error.value = e.message
      isFirebaseAuthenticated.value = false
      throw e
    }
  }

  const signOutFromFirebase = async () => {
    try {
      await signOut(nuxtApp.$firebase.auth)
      isFirebaseAuthenticated.value = false
      error.value = null
    } catch (e: any) {
      console.error('Firebase sign out error:', e)
      error.value = e.message
      throw e
    }
  }

  let unsubscribe: (() => void) | undefined

  // Listen to Firebase auth state changes
  onMounted(() => {
    unsubscribe = nuxtApp.$firebase.auth.onAuthStateChanged((user) => {
      isFirebaseAuthenticated.value = !!user
    })
  })

  // Cleanup listener on component unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  return {
    signInToFirebase,
    signOutFromFirebase,
    isFirebaseAuthenticated,
    error
  }
}
