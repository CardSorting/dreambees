import { H3Event, defineEventHandler, createError } from 'h3'
import { getAuth } from 'firebase-admin/auth'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Auth middleware can only be used on the server side')
}

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/video-status/completed',
  '/api/auth/session',
  '/api/auth/logout'
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
    const sessionCookie = event.node.req.headers.cookie?.split(';')
      .find((c: string) => c.trim().startsWith('session='))
      ?.split('=')[1];

    if (!sessionCookie) {
      throw createError({
        statusCode: 401,
        message: 'Session cookie is missing'
      })
    }

    try {
      // Verify session cookie with Firebase Admin
      const decodedClaims = await getAuth().verifySessionCookie(
        sessionCookie,
        true // Check if cookie is revoked
      )
      
      // Add user info to event context
      event.context.auth = {
        uid: decodedClaims.uid,
        email: decodedClaims.email
      }
    } catch (error) {
      console.error('Session verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: event.path
      })

      // Clear invalid session cookie
      event.node.res.setHeader('Set-Cookie', [
        'session=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax' + 
        (process.env.NODE_ENV === 'production' ? '; Secure' : '')
      ])

      throw createError({
        statusCode: 401,
        message: 'Invalid session'
      })
    }

  } catch (error: any) {
    console.error('Authentication error:', {
      path: event.path,
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    });

    throw createError({
      statusCode: error.statusCode || 401,
      message: error.message || 'Authentication failed'
    })
  }
})
