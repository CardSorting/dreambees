import { signInWithCustomToken, signOut } from 'firebase/auth'
import { ref, onMounted, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'
import { useAuthFetch } from './useAuthFetch'

export function useFirebaseAuth() {
  const nuxtApp = useNuxtApp()
  const isFirebaseAuthenticated = ref(false)
  const error = ref<string | null>(null)

  const signInToFirebase = async () => {
    try {
      error.value = null

      // Get Firebase custom token from server
      const { data: response } = await useAuthFetch<{ firebaseToken: string }>('/api/auth/firebase-token', {
        method: 'POST'
      })

      if (!response.value?.firebaseToken) {
        throw new Error('Failed to get Firebase token')
      }

      // Sign in to Firebase with custom token
      await signInWithCustomToken(nuxtApp.$firebase.auth, response.value.firebaseToken)
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
