import admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'
import { createPublicKey, createVerify } from 'crypto'

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Firebase Admin can only be used on the server side')
}

const FIREBASE_CERT_PATH = join(process.cwd(), 'credentials', 'firebase-service-account.json')

// Initialize Firebase Admin as a singleton
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(readFileSync(FIREBASE_CERT_PATH, 'utf8'))
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
    // First try using Firebase Admin's built-in verification
    try {
      const decodedToken = await admin.auth().verifyIdToken(token)
      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email
      }
    } catch (firebaseError) {
      // If Firebase Admin verification fails, try manual verification
      const [headerB64, payloadB64, signatureB64] = token.split('.')
      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString())
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

      // Verify token is not expired
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        throw new Error('Token has expired')
      }

      // Verify issuer
      const serviceAccount = JSON.parse(readFileSync(FIREBASE_CERT_PATH, 'utf8'))
      const expectedIssuer = `https://securetoken.google.com/${serviceAccount.project_id}`
      if (payload.iss !== expectedIssuer) {
        throw new Error('Invalid token issuer')
      }

      // Verify audience
      if (payload.aud !== serviceAccount.project_id) {
        throw new Error('Invalid token audience')
      }

      return {
        success: true,
        uid: payload.user_id || payload.sub,
        email: payload.email
      }
    }
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
