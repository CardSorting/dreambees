import { H3Event, defineEventHandler, getHeader, createError } from 'h3'
import { verifyAuthToken } from '../utils/firebase-admin'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Auth middleware can only be used on the server side')
}

export default defineEventHandler(async (event: H3Event) => {
  // Skip auth for non-API routes
  if (!event.path.startsWith('/api/')) {
    return
  }

  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Missing or invalid authorization header'
      })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      throw createError({
        statusCode: 401,
        message: 'No token provided'
      })
    }

    // Verify the token
    const result = await verifyAuthToken(token)
    if (!result.success) {
      throw createError({
        statusCode: 401,
        message: result.error || 'Invalid or expired token'
      })
    }

    // Add user info to event context for use in route handlers
    event.context.auth = {
      uid: result.uid,
      email: result.email
    }

  } catch (error: any) {
    console.error('Authentication error:', error.message);
    throw createError({
      statusCode: 401,
      message: error.message || 'Authentication failed'
    })
  }
})
