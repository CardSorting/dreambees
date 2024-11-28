import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useAuth } from 'vue-clerk'

export default defineNuxtRouteMiddleware(async (to: any) => {
  // Skip middleware on server-side
  if (process.server) return
  
  const authStore = useAuthStore()
  const { isLoaded, isSignedIn } = useAuth()
  
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

    // If authenticated and accessing a protected route, ensure we have a Firebase token
    if (protectedRoutes.includes(to.path) && isSignedIn.value && !authStore.firebaseToken) {
      await authStore.refreshFirebaseToken()
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    // On error, redirect to login for safety if trying to access protected route
    if (protectedRoutes.includes(to.path)) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`)
    }
  }
})
