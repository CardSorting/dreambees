import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

async function pollJobStatus(jobId, idToken, maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`http://localhost:3001/api/video-status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json'
        }
      });

      const statusData = await statusResponse.json();
      console.log('Job status response:', statusData);

      if (statusData.status === 'COMPLETE' && statusData.outputUri) {
        return statusData;
      }

      if (statusData.status === 'ERROR') {
        throw new Error(`Job failed: ${statusData.errorMessage || 'Unknown error'}`);
      }

      // Wait 10 seconds before next attempt
      await delay(10000);
    } catch (error) {
      console.error('Error polling job status:', error);
      throw error;
    }
  }
  throw new Error('Timeout waiting for job completion');
}

async function testAuthFlow() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log('Logging in test user...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'Test123!');
    console.log('Login successful:', userCredential.user.uid);

    console.log('Getting ID token...');
    const idToken = await userCredential.user.getIdToken();
    console.log('Got ID token');

    // Create a test image (1x1 pixel transparent PNG base64)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    console.log('Creating a test video job...');
    const createResponse = await fetch('http://localhost:3001/api/video-generator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        imageData: testImage
      })
    });

    const createData = await createResponse.json();
    console.log('Create job response:', createData);

    if (createData.success && createData.jobId) {
      console.log('Polling job status until completion...');
      const finalStatus = await pollJobStatus(createData.jobId, idToken);
      console.log('Final job status:', finalStatus);
    }

  } catch (error) {
    console.error('Error in auth flow test:', error);
    if (error.code === 'auth/invalid-api-key') {
      console.error('Invalid API key. Please check your environment variables.');
    }
    process.exit(1);
  }
}

testAuthFlow();
