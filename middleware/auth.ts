import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/video-generator']
  
  // Initialize auth state if not already done
  if (!authStore.initialized) {
    await authStore.init()
  }
  
  // If trying to access protected route without authentication
  if (protectedRoutes.includes(to.path) && !authStore.isAuthenticated) {
    return navigateTo('/login')
  }
  
  // If authenticated user tries to access login page
  if (to.path === '/login' && authStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
