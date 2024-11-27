import { defineEventHandler, createError } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

export default defineEventHandler(async (event) => {
  try {
    // Get the session token from the Authorization header
    const sessionToken = event.node.req.headers.authorization?.replace('Bearer ', '')
    
    if (!sessionToken) {
      throw createError({
        statusCode: 401,
        message: 'No session token provided'
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
