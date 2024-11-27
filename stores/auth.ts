import { defineStore } from 'pinia'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  setPersistence,
  browserLocalPersistence
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

interface SerializableUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}

const createSerializableUser = (user: User | null): SerializableUser | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as SerializableUser | null,
    loading: false,
    error: null as string | null,
    initialized: false,
    initializationPromise: null as Promise<User | null> | null,
    authStateUnsubscribe: null as (() => void) | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && state.initialized,
    currentUser: (state) => state.user
  },

  actions: {
    async init() {
      // If already initialized, return current user
      if (this.initialized) {
        return this.user;
      }

      // If initialization is in progress, return the existing promise
      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      console.log('Initializing auth store...')
      
      try {
        const { auth } = useFirebase()

        // Set persistence to LOCAL
        await setPersistence(auth, browserLocalPersistence)
        
        // Create new initialization promise
        this.initializationPromise = new Promise((resolve) => {
          // Clean up any existing listener
          if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe()
          }

          // Set up new listener
          this.authStateUnsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? 'logged in' : 'logged out')
            this.user = createSerializableUser(user)
            this.initialized = true
            this.initializationPromise = null
            resolve(user)
          }, (error) => {
            console.error('Auth state change error:', error)
            this.initialized = true
            this.initializationPromise = null
            resolve(null)
          })
        })

        const user = await this.initializationPromise
        console.log('Auth initialization complete:', user ? 'logged in' : 'logged out')
        return user

      } catch (error) {
        console.error('Auth initialization error:', error)
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
        this.user = createSerializableUser(userCredential.user)
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
        this.user = createSerializableUser(userCredential.user)
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
        this.initializationPromise = null
        // Don't remove the auth state listener
      } catch (error: any) {
        this.error = 'Failed to sign out. Please try again.'
        throw error
      }
    },

    // Cleanup method
    cleanup() {
      if (this.authStateUnsubscribe) {
        this.authStateUnsubscribe()
        this.authStateUnsubscribe = null
      }
      this.initialized = false
      this.initializationPromise = null
      this.user = null
    }
  }
})
