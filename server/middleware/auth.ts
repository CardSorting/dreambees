import { H3Event, defineEventHandler, createError } from 'h3'
import { verifySessionCookie } from '../utils/firebase-admin'
import { AuthContext } from '../types/auth'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Auth middleware can only be used on the server side')
}

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/video-status/completed',
  '/api/auth/session',
  '/api/auth/logout'
];

declare module 'h3' {
  interface H3EventContext {
    auth: AuthContext;
  }
}

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

    // Verify session cookie
    const result = await verifySessionCookie(sessionCookie)
    
    if (!result.success) {
      // Clear invalid session cookie
      event.node.res.setHeader('Set-Cookie', [
        'session=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax' + 
        (process.env.NODE_ENV === 'production' ? '; Secure' : '')
      ])

      throw createError({
        statusCode: 401,
        message: result.error || 'Invalid session'
      })
    }

    // Add user info to event context
    event.context.auth = {
      uid: result.uid || 'anonymous',  // Provide default value
      firebaseToken: sessionCookie  // Use the session cookie as the firebase token
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
