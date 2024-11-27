import { defineEventHandler, createError, getHeader } from 'h3'
import { createClerkClient } from '@clerk/backend'
import { AuthContext } from '../types/auth'

// Create a new Clerk client instance
const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

export default defineEventHandler(async (event) => {
  // Skip auth for public routes
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
      const session = await clerk.sessions.getSession(sessionToken)
      
      if (!session || !session.userId) {
        throw new Error('Invalid session')
      }

      // Add user to event context for use in API routes
      event.context.auth = {
        uid: session.userId,
        firebaseToken: sessionToken // Use the session token as the firebase token
      }
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
