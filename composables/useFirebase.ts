import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

export const useFirebase = () => {
  const { $firebase } = useNuxtApp()
  
  if (!$firebase) {
    throw new Error('Firebase plugin not initialized')
  }

  return {
    auth: $firebase.auth as Auth,
    firestore: $firebase.firestore as Firestore
  }
}
