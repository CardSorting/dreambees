import admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Firebase Admin can only be used on the server side')
}

const FIREBASE_CERT_PATH = join(process.cwd(), 'credentials', 'firebase-service-account.json')

// Initialize Firebase Admin as a singleton
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(readFileSync(FIREBASE_CERT_PATH, 'utf8'))
    
    // Log initialization details for debugging
    console.log('Initializing Firebase Admin with service account:', {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email
    })

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key
      })
    })
    console.log('Firebase Admin initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    throw error
  }
}

export async function verifyAuthToken(token: string) {
  try {
    // Try using Firebase Admin's built-in verification
    try {
      const decodedToken = await admin.auth().verifyIdToken(token)
      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email
      }
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError)
      throw firebaseError
    }
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return {
      success: false,
      error: error.message || 'Token verification failed'
    }
  }
}

export default admin
