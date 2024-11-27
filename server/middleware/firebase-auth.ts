import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { createClerkClient } from '@clerk/backend'
import type { AuthContext } from '../types/auth'
import { isValidAuthContext } from '../types/auth'

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

export default defineEventHandler(async (event) => {
  // Skip auth for public routes and auth routes
  if (event.node.req.url?.startsWith('/api/auth') || 
      event.node.req.url?.startsWith('/_nuxt') ||
      event.node.req.url === '/') {
    return
  }

  try {
    const sessionToken = getHeader(event, 'Authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      throw createError({
        statusCode: 401,
        message: 'No session token provided'
      })
    }

    try {
      // Verify the session with Clerk
      const session = await clerk.sessions.getSession(sessionToken)
      
      if (!session || !session.userId) {
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
