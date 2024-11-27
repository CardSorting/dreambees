import * as admin from 'firebase-admin';
import { join } from 'path';
import { readFileSync } from 'fs';

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Firebase Admin can only be used on the server side');
}

const FIREBASE_CERT_PATH = join(process.cwd(), 'credentials', 'firebase-service-account.json');

async function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      const serviceAccount = JSON.parse(readFileSync(FIREBASE_CERT_PATH, 'utf8'));
      
      // Log initialization details for debugging
      console.log('Initializing Firebase Admin with service account:', {
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email
      });

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }
  return admin.auth();
}

// Initialize immediately
const authPromise = initializeFirebaseAdmin();

export async function verifyAuthToken(token: string) {
  try {
    const auth = await authPromise;
    const decodedToken = await auth.verifyIdToken(token);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email
    };
  } catch (error: any) {
    console.error('Token verification failed:', error);
    return {
      success: false,
      error: error.message || 'Token verification failed'
    };
  }
}

export async function verifySessionCookie(sessionCookie: string) {
  try {
    const auth = await authPromise;
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return {
      success: true,
      uid: decodedClaims.uid,
      email: decodedClaims.email
    };
  } catch (error: any) {
    console.error('Session cookie verification failed:', error);
    return {
      success: false,
      error: error.message || 'Invalid session cookie'
    };
  }
}

export const auth = {
  verifyIdToken: async (token: string) => {
    const authInstance = await authPromise;
    return authInstance.verifyIdToken(token);
  },
  createSessionCookie: async (token: string, options: { expiresIn: number }) => {
    const authInstance = await authPromise;
    return authInstance.createSessionCookie(token, options);
  }
};
