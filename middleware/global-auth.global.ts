import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server-side
  if (process.server) return
  
  const authStore = useAuthStore()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/video-generator']
  
  try {
    // Wait for auth initialization only if not already initialized
    if (!authStore.initialized) {
      await authStore.init()
    }

    // Double check initialization after waiting
    if (!authStore.initialized) {
      console.error('Auth failed to initialize')
      if (protectedRoutes.includes(to.path)) {
        return navigateTo('/login')
      }
      return
    }
    
    // If trying to access protected route without authentication
    if (protectedRoutes.includes(to.path) && !authStore.isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      return navigateTo('/login')
    }
    
    // If authenticated user tries to access login page
    if (to.path === '/login' && authStore.isAuthenticated) {
      console.log('Already authenticated, redirecting to dashboard')
      return navigateTo('/dashboard')
    }

    // Log only serializable auth state properties
    const authStateLog = {
      initialized: authStore.initialized,
      isAuthenticated: authStore.isAuthenticated,
      path: to.path,
      userId: authStore.user?.uid || null,
      email: authStore.user?.email || null
    }
    console.log('Auth state:', authStateLog)

  } catch (error) {
    console.error('Auth middleware error:', error instanceof Error ? error.message : 'Unknown error')
    // On error, redirect to login for safety
    if (protectedRoutes.includes(to.path)) {
      return navigateTo('/login')
    }
  }
})
