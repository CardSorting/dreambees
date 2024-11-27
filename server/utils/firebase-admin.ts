import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { join } from 'path'
import { readFileSync } from 'fs'

export function useFirebaseAdmin() {
  const apps = getApps()
  
  if (!apps.length) {
    try {
      console.log('Initializing Firebase Admin...');
      
      // Load service account credentials
      const serviceAccountPath = join(process.cwd(), 'credentials', 'firebase-service-account.json')
      console.log('Loading service account from:', serviceAccountPath);
      
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
      console.log('Service account loaded successfully');

      // Initialize Firebase Admin with service account
      initializeApp({
        credential: cert(serviceAccount)
      })
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      console.error(`
        Please ensure you have set up your Firebase service account credentials:
        1. Run 'npm run setup:firebase'
        2. Follow the instructions to download and place your service account key
        
        Current working directory: ${process.cwd()}
        Expected service account path: ${join(process.cwd(), 'credentials', 'firebase-service-account.json')}
      `);
      throw error;
    }
  }

  return {
    auth: getAuth()
  }
}

// Helper function to verify Firebase ID token
export async function verifyAuthToken(token: string) {
  try {
    console.log('Verifying auth token...');
    const { auth } = useFirebaseAdmin()
    const decodedToken = await auth.verifyIdToken(token)
    console.log('Token verified successfully for user:', decodedToken.uid);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email
    }
  } catch (error: any) {
    console.error('Token verification failed:', error);
    return {
      success: false,
      error: error.message
    }
  }
}
