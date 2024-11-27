import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to: any) => {
  // Skip middleware on server-side
  if (process.server) return
  
  const authStore = useAuthStore()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/video-generator']
  
  try {
    // Always wait for auth initialization to complete before proceeding
    await authStore.init()
    
    // After initialization, check authentication state
    if (protectedRoutes.includes(to.path) && !authStore.isAuthenticated) {
      // Store the intended destination for redirect after login
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`)
    }
    
    // If authenticated user tries to access login page
    if (to.path === '/login' && authStore.isAuthenticated) {
      // Try to redirect to the intended destination, or fall back to home
      return navigateTo(to.query.redirect?.toString() || '/')
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    // On error, redirect to login for safety if trying to access protected route
    if (protectedRoutes.includes(to.path)) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`)
    }
  }
})
