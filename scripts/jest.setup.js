const dotenv = require('dotenv');
const { initializeApp } = require('firebase-admin/app');

// Load environment variables
dotenv.config();

// Disable Firestore persistence to avoid issues in tests
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin for testing
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID environment variable is required');
}

initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// Global test setup
beforeAll(async () => {
  // Add any global setup here
  console.log('Setting up test environment...');
});

// Global test teardown
afterAll(async () => {
  // Add any global cleanup here
  console.log('Cleaning up test environment...');
});

// Configure longer timeout for Firestore operations
jest.setTimeout(10000);

// Silence console logs during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  if (process.env.DEBUG) {
    originalConsoleLog(...args);
  }
};

console.info = (...args) => {
  if (process.env.DEBUG) {
    originalConsoleInfo(...args);
  }
};

console.warn = (...args) => {
  if (process.env.DEBUG) {
    originalConsoleWarn(...args);
  }
};

// Keep error logging enabled
console.error = console.error;

// Helper to reset console functions
afterAll(() => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
});
