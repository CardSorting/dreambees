import { defineEventHandler, createError } from 'h3';
import { getAuth } from 'firebase-admin/auth';
import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
});

export default defineEventHandler(async (event) => {
  try {
    // Get the session from the auth context that was set by our clerk middleware
    const { auth } = event.context;
    
    if (!auth?.uid) {
      throw createError({
        statusCode: 401,
        message: 'No authenticated user found'
      });
    }

    try {
      // Verify the user exists in Clerk
      const user = await clerk.users.getUser(auth.uid);
      
      if (!user) {
        throw new Error('User not found in Clerk');
      }

      // Create a custom token for Firebase
      const customToken = await getAuth().createCustomToken(auth.uid);

      return { 
        success: true,
        firebaseToken: customToken
      };
      
    } catch (authError: any) {
      console.error('Authentication error:', {
        message: authError.message,
        code: authError.code,
        stack: authError.stack
      });
      throw createError({
        statusCode: 401,
        message: authError.message || 'Authentication failed'
      });
    }
  } catch (error: any) {
    console.error('Session error:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to process session'
    });
  }
});
