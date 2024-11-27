import { defineStore } from 'pinia'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { type FirebaseError } from 'firebase/app'
import { useFirebase } from '~/composables/useFirebase'

const getErrorMessage = (error: FirebaseError) => {
  switch (error.code) {
    // Login errors
    case 'auth/invalid-email':
      return 'Invalid email address format.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or create a new account.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.'
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.'
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later or reset your password.'
    
    // Registration errors
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in or use a different email.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a mix of letters, numbers, and symbols.'
    case 'auth/operation-not-allowed':
      return 'Email/password registration is not enabled. Please contact support.'
    
    // Network errors
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.'
    
    // Default error
    default:
      return 'An error occurred during authentication. Please try again.'
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: false,
    error: null as string | null,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user
  },

  actions: {
    async init() {
      if (this.initialized) return this.user;

      const { auth } = useFirebase()
      
      return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          this.user = user
          this.initialized = true
          resolve(user)
        })
      })
    },

    async login(email: string, password: string) {
      this.loading = true
      this.error = null
      const { auth } = useFirebase()

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        this.user = userCredential.user
      } catch (error: any) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(email: string, password: string) {
      this.loading = true
      this.error = null
      const { auth } = useFirebase()

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        this.user = userCredential.user
      } catch (error: any) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      const { auth } = useFirebase()
      try {
        await signOut(auth)
        this.user = null
        this.initialized = false
      } catch (error: any) {
        this.error = 'Failed to sign out. Please try again.'
        throw error
      }
    }
  }
})
