import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuth } from 'vue-clerk'
import { useFirebaseAuth } from '~/composables/useFirebaseAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server-side
  if (process.server) return
  
  const { isLoaded, isSignedIn } = useAuth()
  const { signInToFirebase, isFirebaseAuthenticated } = useFirebaseAuth()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/video-generator']
  
  try {
    // Wait for Clerk to initialize
    if (!isLoaded.value) {
      return
    }
    
    // After initialization, check authentication state
    if (protectedRoutes.includes(to.path) && !isSignedIn.value) {
      // Store the intended destination for redirect after login
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`)
    }
    
    // If authenticated user tries to access login page
    if (to.path === '/login' && isSignedIn.value) {
      // Try to redirect to the intended destination, or fall back to home
      return navigateTo(to.query.redirect?.toString() || '/')
    }

    // If authenticated and accessing a protected route, ensure Firebase auth is set up
    if (protectedRoutes.includes(to.path) && isSignedIn.value && !isFirebaseAuthenticated.value) {
      await signInToFirebase()
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    // On error, redirect to login for safety if trying to access protected route
    if (protectedRoutes.includes(to.path)) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`)
    }
  }
})
