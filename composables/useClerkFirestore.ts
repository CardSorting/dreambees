import { useAuth, useUser } from 'vue-clerk'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useNuxtApp } from '#app'
import { ref, watch } from 'vue'

export function useClerkFirestore() {
  const nuxtApp = useNuxtApp()
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const error = ref<string | null>(null)
  const isSyncing = ref(false)

  const syncUserToFirestore = async () => {
    if (!isSignedIn.value || !user.value) {
      error.value = 'User not authenticated'
      return false
    }

    isSyncing.value = true
    error.value = null

    try {
      const userRef = doc(nuxtApp.$firebase.firestore, `users/${user.value.id}`)
      const userDoc = await getDoc(userRef)

      const userData = {
        email: user.value.primaryEmailAddress?.emailAddress,
        firstName: user.value.firstName,
        lastName: user.value.lastName,
        imageUrl: user.value.imageUrl,
        updatedAt: new Date().toISOString()
      }

      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          ...userData,
          createdAt: new Date().toISOString()
        })
        console.log('Created new user document in Firestore')
      } else {
        // Update existing user document
        await setDoc(userRef, userData, { merge: true })
        console.log('Updated existing user document in Firestore')
      }

      return true
    } catch (e: any) {
      console.error('Error syncing user to Firestore:', e)
      error.value = e.message || 'Failed to sync user data'
      return false
    } finally {
      isSyncing.value = false
    }
  }

  // Watch for user changes and sync to Firestore
  watch([isSignedIn, user], ([newIsSignedIn, newUser]) => {
    if (newIsSignedIn && newUser) {
      syncUserToFirestore().catch((e) => {
        console.error('Error in user sync watcher:', e)
        error.value = 'Failed to sync user data automatically'
      })
    }
  }, { immediate: true })

  return {
    syncUserToFirestore,
    error,
    isSyncing
  }
}
