import { useAuth, useUser } from 'vue-clerk'
import { doc, onSnapshot } from 'firebase/firestore'
import { useNuxtApp } from '#app'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  customData?: Record<string, any>;
}

export function useUserProfile() {
  const nuxtApp = useNuxtApp()
  const { isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  
  const firestoreData = ref<Record<string, any> | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Computed profile that combines Clerk and Firestore data
  const profile = computed<UserProfile | null>(() => {
    if (!isSignedIn.value || !clerkUser.value) return null

    return {
      id: clerkUser.value.id,
      email: clerkUser.value.primaryEmailAddress?.emailAddress ?? null,
      firstName: clerkUser.value.firstName,
      lastName: clerkUser.value.lastName,
      imageUrl: clerkUser.value.imageUrl,
      createdAt: firestoreData.value?.createdAt ?? new Date().toISOString(),
      updatedAt: firestoreData.value?.updatedAt ?? new Date().toISOString(),
      customData: firestoreData.value?.customData
    }
  })

  let unsubscribe: (() => void) | undefined

  // Subscribe to Firestore updates
  const subscribeToFirestore = () => {
    if (!isSignedIn.value || !clerkUser.value) {
      isLoading.value = false
      return
    }

    try {
      const userRef = doc(nuxtApp.$firebase.firestore, `users/${clerkUser.value.id}`)
      
      // Cleanup previous subscription if exists
      if (unsubscribe) {
        unsubscribe()
      }

      unsubscribe = onSnapshot(userRef, 
        (doc) => {
          if (doc.exists()) {
            firestoreData.value = doc.data()
          } else {
            firestoreData.value = null
          }
          isLoading.value = false
        },
        (err) => {
          console.error('Error subscribing to user profile:', err)
          error.value = 'Failed to load user profile'
          isLoading.value = false
        }
      )
    } catch (err) {
      console.error('Error setting up Firestore subscription:', err)
      error.value = 'Failed to setup profile sync'
      isLoading.value = false
    }
  }

  // Watch for auth state and user changes
  watch([isSignedIn, clerkUser], ([newIsSignedIn, newUser]) => {
    if (newIsSignedIn && newUser) {
      error.value = null
      isLoading.value = true
      subscribeToFirestore()
    } else {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = undefined
      }
      firestoreData.value = null
      isLoading.value = false
    }
  }, { immediate: true })

  // Cleanup on unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = undefined
    }
  })

  const refreshProfile = () => {
    if (isSignedIn.value && clerkUser.value) {
      error.value = null
      isLoading.value = true
      subscribeToFirestore()
    }
  }

  return {
    profile,
    isLoading,
    error,
    refreshProfile
  }
}
