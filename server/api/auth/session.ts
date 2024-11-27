import { defineEventHandler, readBody, createError } from 'h3';
import { auth } from '../../utils/firebase-admin';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    if (!body || !body.idToken) {
      console.error('Missing ID token in request body:', body);
      throw createError({
        statusCode: 400,
        message: 'ID token is required'
      });
    }

    const { idToken } = body;

    try {
      // First verify the ID token
      console.log('Verifying ID token...');
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log('Token verified successfully:', { uid: decodedToken.uid });

      // Then create the session cookie (5 days)
      console.log('Creating session cookie...');
      const expiresIn = 60 * 60 * 24 * 5 * 1000;
      const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
      console.log('Session cookie created successfully');

      // Set cookie
      event.node.res.setHeader('Set-Cookie', [
        `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Path=/; SameSite=Lax${
          process.env.NODE_ENV === 'production' ? '; Secure' : ''
        }`
      ]);

      return { success: true };
    } catch (authError: any) {
      console.error('Authentication error:', {
        message: authError.message,
        code: authError.code,
        stack: authError.stack,
        name: authError.name,
        cause: authError.cause
      });
      throw createError({
        statusCode: 401,
        message: authError.message || 'Invalid ID token'
      });
    }
  } catch (error: any) {
    console.error('Session creation error:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      statusCode: error.statusCode,
      name: error.name,
      cause: error.cause
    });

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create session'
    });
  }
});
