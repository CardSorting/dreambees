import { defineEventHandler, readBody, createError } from 'h3'
import { createSessionCookie } from '../../utils/firebase-admin'

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

    // Create session cookie (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000
    const result = await createSessionCookie(idToken, expiresIn)

    if (!result.success) {
      console.error('Failed to create session cookie:', result.error)
      throw createError({
        statusCode: 401,
        message: result.error || 'Invalid ID token'
      })
    }

    // Set cookie
    event.node.res.setHeader('Set-Cookie', [
      `session=${result.sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Path=/; SameSite=Lax${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    ])

    return { success: true }
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
