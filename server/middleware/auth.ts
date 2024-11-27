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

  // Skip auth for completed videos endpoint (public access)
  if (event.path === '/api/video-status/completed') {
    return
  }

  try {
    const authHeader = getHeader(event, 'authorization')
    
    // Check if authorization header exists
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        message: 'Authorization header is missing'
      })
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Invalid authorization format. Expected Bearer token'
      })
    }

    // Extract and validate token
    const token = authHeader.split('Bearer ')[1]?.trim()
    if (!token) {
      throw createError({
        statusCode: 401,
        message: 'Token is missing from authorization header'
      })
    }

    // Basic token format validation
    if (!token.includes('.') || token.split('.').length !== 3) {
      throw createError({
        statusCode: 401,
        message: 'Invalid token format. Expected JWT format'
      })
    }

    // Verify the token
    const result = await verifyAuthToken(token)
    if (!result.success) {
      throw createError({
        statusCode: 401,
        message: result.error || 'Token verification failed'
      })
    }

    // Add user info to event context for use in route handlers
    event.context.auth = {
      uid: result.uid,
      email: result.email
    }

  } catch (error: any) {
    // Log the error with more details for debugging
    console.error('Authentication error:', {
      path: event.path,
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    });

    // Throw a sanitized error response
    throw createError({
      statusCode: error.statusCode || 401,
      message: error.message || 'Authentication failed'
    })
  }
})
