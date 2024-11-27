import { defineEventHandler, readBody, createError } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { verifyAuthToken } from '../../utils/firebase-admin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!body || !body.idToken) {
      console.error('Missing ID token in request body:', body)
      throw createError({
        statusCode: 400,
        message: 'ID token is required'
      })
    }

    const { idToken } = body

    // First verify the token
    const verificationResult = await verifyAuthToken(idToken)
    if (!verificationResult.success) {
      console.error('Token verification failed:', verificationResult.error)
      throw createError({
        statusCode: 401,
        message: verificationResult.error || 'Invalid ID token'
      })
    }

    try {
      // Create session cookie
      const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn })

      // Set cookie
      event.node.res.setHeader('Set-Cookie', [
        `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Path=/; SameSite=Lax${
          process.env.NODE_ENV === 'production' ? '; Secure' : ''
        }`
      ])

      return { 
        success: true,
        user: {
          uid: verificationResult.uid,
          email: verificationResult.email
        }
      }
    } catch (error: any) {
      console.error('Firebase session creation error:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      })

      // Check for specific Firebase errors
      if (error.code === 'auth/invalid-id-token') {
        throw createError({
          statusCode: 401,
          message: 'Invalid ID token'
        })
      }

      throw error
    }
  } catch (error: any) {
    console.error('Session creation error:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      statusCode: error.statusCode
    })

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create session'
    })
  }
})
