import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createTestUser() {
  try {
    // Load service account
    const serviceAccountPath = join(dirname(__dirname), 'credentials', 'firebase-service-account.json');
    console.log('Loading service account from:', serviceAccountPath);
    
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('Service account loaded successfully');

    // Initialize Firebase Admin
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');

    // Create test user
    const auth = getAuth();
    const userEmail = 'test@example.com';
    const userPassword = 'Test123!';

    const userRecord = await auth.createUser({
      email: userEmail,
      password: userPassword,
      emailVerified: true,
      disabled: false
    });

    console.log('Successfully created test user:', {
      uid: userRecord.uid,
      email: userRecord.email
    });

    console.log('\nTest user credentials:');
    console.log('Email:', userEmail);
    console.log('Password:', userPassword);
    
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('Test user already exists. You can use these credentials:');
      console.log('Email: test@example.com');
      console.log('Password: Test123!');
    } else {
      console.error('Error creating test user:', error);
      process.exit(1);
    }
  }
}

createTestUser();
