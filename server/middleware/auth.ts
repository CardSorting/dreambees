import { H3Event, createError } from 'h3'
import { verifyAuthToken } from '~/server/utils/firebase-admin'

export default defineEventHandler(async (event: H3Event) => {
  // Skip auth for non-API routes
  if (!event.path.startsWith('/api/')) {
    return
  }

  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return createError({
        statusCode: 401,
        message: 'Missing or invalid authorization header'
      })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return createError({
        statusCode: 401,
        message: 'No token provided'
      })
    }

    // Verify the token
    const result = await verifyAuthToken(token)
    if (!result.success) {
      return createError({
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
    console.error('Authentication error:', {
      message: error.message,
      stack: error.stack
    })
    
    return createError({
      statusCode: 401,
      message: 'Authentication failed'
    })
  }
})
