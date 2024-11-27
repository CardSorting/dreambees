import { H3Event, defineEventHandler, getHeader, createError } from 'h3'
import { verifyAuthToken } from '../utils/firebase-admin'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Auth middleware can only be used on the server side')
}

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/video-status/completed'
];

export default defineEventHandler(async (event: H3Event) => {
  // Skip auth for non-API routes
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Skip auth for public endpoints
  if (PUBLIC_ENDPOINTS.includes(event.path)) {
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

    // Extract token
    const token = authHeader.split('Bearer ')[1]?.trim()
    if (!token) {
      throw createError({
        statusCode: 401,
        message: 'Token is missing from authorization header'
      })
    }

    // Verify the token using Firebase Admin
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
