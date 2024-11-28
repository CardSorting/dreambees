import { defineStore } from 'pinia'
import { useAuth, useUser } from 'vue-clerk'
import { useFirebaseAuth } from '~/composables/useFirebaseAuth'

interface AuthUser {
  id: string
  email: string | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    loading: true,
    error: null as string | null,
    firestoreUserId: null as string | null
  }),

  getters: {
    isAuthenticated(): boolean {
      const { isSignedIn } = useAuth()
      return isSignedIn.value ?? false
    },

    user(): AuthUser | null {
      const { user } = useUser()
      if (!user.value) return null
      
      return {
        id: user.value.id,
        email: user.value.primaryEmailAddress?.emailAddress ?? null
      }
    },

    userId(): string | null {
      return this.user?.id ?? null
    },

    userEmail(): string | null {
      return this.user?.email ?? null
    }
  },

  actions: {
    async signOut() {
      const { signOut } = useAuth()
      const { signOutFromFirebase } = useFirebaseAuth()
      
      try {
        // Sign out from Firebase first
        await signOutFromFirebase()
        
        // Then sign out from Clerk
        await signOut.value()
        
        // Clear local state
        this.firestoreUserId = null
        this.error = null
      } catch (error: any) {
        this.error = error.message
        throw error
      }
    },

    setFirestoreUserId(id: string) {
      this.firestoreUserId = id
    },

    clearError() {
      this.error = null
    }
  }
})
