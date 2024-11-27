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

// Only expose necessary user data to the client
interface PublicUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

const createPublicUser = (user: User | null): PublicUser | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  };
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as PublicUser | null,
    loading: false,
    error: null as string | null,
    initialized: false,
    initializationPromise: null as Promise<User | null> | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && state.initialized,
    currentUser: (state) => state.user
  },

  actions: {
    async init() {
      if (this.initialized) {
        return this.user;
      }

      if (this.initializationPromise) {
        return this.initializationPromise;
      }
      
      try {
        const { auth } = useFirebase()
        
        this.initializationPromise = new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            this.user = createPublicUser(user)
            this.initialized = true
            this.initializationPromise = null
            unsubscribe()
            resolve(user)
          }, () => {
            this.initialized = true
            this.initializationPromise = null
            resolve(null)
          })
        })

        return await this.initializationPromise

      } catch (error) {
        this.initialized = true
        this.initializationPromise = null
        throw error
      }
    },

    async login(email: string, password: string) {
      this.loading = true
      this.error = null
      const { auth } = useFirebase()

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        this.user = createPublicUser(userCredential.user)
        return this.user
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
        this.user = createPublicUser(userCredential.user)
        return this.user
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
    },

    cleanup() {
      this.initialized = false
      this.initializationPromise = null
      this.user = null
    }
  }
})
