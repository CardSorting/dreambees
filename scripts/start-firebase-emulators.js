const { spawn } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

// Ensure required environment variables are set
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('Error: FIREBASE_PROJECT_ID environment variable is required');
  process.exit(1);
}

console.log('Starting Firebase emulators...');

// Start Firebase emulators
const emulators = spawn('firebase', [
  'emulators:start',
  '--only',
  'firestore,auth',
  '--project',
  process.env.FIREBASE_PROJECT_ID
], {
  stdio: 'inherit'
});

// Handle emulator process events
emulators.on('error', (error) => {
  console.error('Failed to start Firebase emulators:', error);
  process.exit(1);
});

emulators.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Firebase emulators exited with code ${code} and signal ${signal}`);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down Firebase emulators...');
  emulators.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Firebase emulators...');
  emulators.kill('SIGTERM');
});

// Add this script to package.json scripts:
// "emulators": "node scripts/start-firebase-emulators.js",
// "test:rules:with-emulator": "npm run emulators & sleep 5 && npm run test:rules"
