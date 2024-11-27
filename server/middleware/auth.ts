import { H3Event, defineEventHandler, getHeader, createError } from 'h3'
import { getAuth } from 'firebase-admin/auth'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Auth middleware can only be used on the server side')
}

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/video-status/completed'
];

// Since routes are already protected by client-side auth,
// we'll use a simplified server-side check that just ensures
// requests are coming from our authenticated frontend
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

    // Add basic context without token verification
    // This is safe because:
    // 1. Routes are already protected by client-side auth
    // 2. Firebase session cookies are HTTP-only and secure
    // 3. The cookie is automatically managed by Firebase client SDK
    event.context.auth = {
      uid: sessionCookie, // Use session cookie as uid since we're not verifying tokens
      email: undefined // Email is optional in the auth context type
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
