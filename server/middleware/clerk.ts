import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import type { AuthContext } from '../types/auth'
import { isValidAuthContext } from '../types/auth'
import { createClerkClient } from '@clerk/backend'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  const clerk = createClerkClient({ 
    secretKey: config.clerk.secretKey 
  })

  // Skip auth for public routes
  if (event.node.req.url?.startsWith('/api/auth/') || 
      event.node.req.url?.startsWith('/_nuxt/') ||
      event.node.req.url === '/') {
    return
  }

  try {
    // Get the session token from Authorization header
    const authHeader = getHeader(event, 'Authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null

    if (!sessionToken) {
      // Instead of throwing error, just return - let the endpoint handle auth if needed
      return
    }

    try {
      // Get the session from Clerk
      const session = await clerk.sessions.getSession(sessionToken)
      
      if (!session?.userId) {
        throw new Error('Invalid session')
      }

      // Create a custom token for Firebase using the Clerk user ID
      const customToken = await getAuth().createCustomToken(session.userId)

      // Create auth context
      const authContext: AuthContext = {
        uid: session.userId,
        firebaseToken: customToken
      }

      // Validate auth context
      if (!isValidAuthContext(authContext)) {
        throw new Error('Invalid auth context')
      }

      // Add the auth context to the event
      event.context.auth = authContext

    } catch (error) {
      console.error('Session verification error:', error)
      throw createError({
        statusCode: 401,
        message: 'Invalid session'
      })
    }

  } catch (error: any) {
    console.error('Auth middleware error:', error)
    throw createError({
      statusCode: 401,
      message: error.message || 'Unauthorized'
    })
  }
})
