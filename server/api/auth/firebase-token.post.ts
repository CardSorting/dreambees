import { defineEventHandler, createError, parseCookies, getHeader } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

export default defineEventHandler(async (event) => {
  try {
    // Get the session token from either the __session cookie or Clerk headers
    const cookies = parseCookies(event)
    const sessionToken = 
      cookies.__session || 
      getHeader(event, 'clerk-session-id') ||
      getHeader(event, 'Authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      throw createError({
        statusCode: 401,
        message: 'No session found'
      })
    }

    // Verify the session with Clerk
    const session = await clerk.sessions.getSession(sessionToken)
    
    if (!session || !session.userId) {
      throw createError({
        statusCode: 401,
        message: 'Invalid session'
      })
    }

    // Create a custom token for Firebase using the Clerk user ID
    const firebaseToken = await getAuth().createCustomToken(session.userId)

    return {
      firebaseToken
    }

  } catch (error: any) {
    console.error('Firebase token generation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate Firebase token'
    })
  }
})
