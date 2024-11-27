import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(dirname(__dirname), '.env') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testAuthFlow() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log('Logging in test user...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'Test123!');
    console.log('Login successful:', userCredential.user.uid);

    console.log('Getting ID token...');
    const idToken = await userCredential.user.getIdToken(true); // Force refresh token
    console.log('Got ID token');

    // Create session cookie
    console.log('Creating session cookie...');
    const sessionResponse = await fetch('http://localhost:3001/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ idToken })
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      throw new Error(`Session creation failed: ${JSON.stringify(errorData)}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('Session cookie created successfully:', sessionData);

    // Test the token with a simple API endpoint
    console.log('Testing token with API...');
    const testResponse = await fetch('http://localhost:3001/api/videos', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Accept': 'application/json'
      }
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      throw new Error(`API test failed: ${JSON.stringify(errorData)}`);
    }

    const testData = await testResponse.json();
    console.log('API test successful:', testData);

  } catch (error) {
    console.error('Error in auth flow test:', error);
    if (error.code === 'auth/invalid-api-key') {
      console.error('Invalid API key. Please check your environment variables.');
    }
    process.exit(1);
  }
}

testAuthFlow();
