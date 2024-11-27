import { useAuth } from 'vue-clerk'
import { defineNuxtRouteMiddleware, navigateTo } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check for public routes
  const publicRoutes = ['/', '/login', '/signup']
  if (publicRoutes.includes(to.path)) {
    return
  }

  const { isSignedIn, isLoaded } = useAuth()

  // Wait for Clerk to initialize
  if (!isLoaded.value) {
    return
  }

  // Redirect to login if not authenticated
  if (!isSignedIn.value) {
    return navigateTo('/login')
  }
})
