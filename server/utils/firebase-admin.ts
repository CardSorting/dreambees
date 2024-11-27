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
      credential: admin.credential.cert(serviceAccount)
    })
    console.log('Firebase Admin initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    throw error
  }
}

export async function verifyAuthToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email
    }
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return {
      success: false,
      error: error.message || 'Token verification failed'
    }
  }
}

export async function createSessionCookie(idToken: string, expiresIn: number) {
  try {
    // First verify the ID token
    await admin.auth().verifyIdToken(idToken)
    
    // Then create the session cookie
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn })
    return {
      success: true,
      sessionCookie
    }
  } catch (error: any) {
    console.error('Session cookie creation failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to create session cookie'
    }
  }
}

export async function verifySessionCookie(sessionCookie: string) {
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true)
    return {
      success: true,
      uid: decodedClaims.uid,
      email: decodedClaims.email
    }
  } catch (error: any) {
    console.error('Session cookie verification failed:', error)
    return {
      success: false,
      error: error.message || 'Invalid session cookie'
    }
  }
}

export default admin
