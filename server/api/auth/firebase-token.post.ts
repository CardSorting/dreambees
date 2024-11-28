import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

export default defineEventHandler(async (event) => {
  try {
    // Get the session token from Authorization header
    const authHeader = getHeader(event, 'Authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null

    if (!sessionToken) {
      throw createError({
        statusCode: 401,
        message: 'No authorization header found'
      })
    }

    try {
      // Verify the session with Clerk
      const session = await clerk.sessions.getSession(sessionToken)
      
      if (!session?.userId) {
        throw new Error('Invalid session')
      }

      // Create a custom token for Firebase using the Clerk user ID
      const firebaseToken = await getAuth().createCustomToken(session.userId)

      return { 
        firebaseToken,
        success: true 
      }

    } catch (authError: any) {
      console.error('Authentication error:', {
        message: authError.message,
        code: authError.code,
        stack: authError.stack
      })
      throw createError({
        statusCode: 401,
        message: authError.message || 'Invalid session'
      })
    }
  } catch (error: any) {
    console.error('Firebase token generation error:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    })

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate Firebase token'
    })
  }
})
