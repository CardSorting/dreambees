import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupFirebaseCredentials() {
  try {
    // Create the credentials directory if it doesn't exist
    const credentialsDir = join(dirname(__dirname), 'credentials');
    if (!existsSync(credentialsDir)) {
      await mkdir(credentialsDir, { recursive: true });
    }

    // Path to service account key file
    const serviceAccountPath = join(credentialsDir, 'firebase-service-account.json');

    console.log(`
To set up Firebase Admin credentials:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the downloaded JSON file as 'firebase-service-account.json' in the 'credentials' directory:
   ${serviceAccountPath}

Note: Make sure to add 'credentials/*.json' to your .gitignore file to keep your service account key secure.
`);

    // Add credentials directory to .gitignore if not already present
    const gitignorePath = join(dirname(__dirname), '.gitignore');
    let gitignoreContent = '';

    if (existsSync(gitignorePath)) {
      gitignoreContent = await readFile(gitignorePath, 'utf8');
    }

    if (!gitignoreContent.includes('credentials/')) {
      gitignoreContent += '\n# Firebase credentials\ncredentials/*.json\n';
      await writeFile(gitignorePath, gitignoreContent);
      console.log('Added credentials/*.json to .gitignore');
    }
  } catch (error) {
    console.error('Error setting up Firebase credentials:', error);
    process.exit(1);
  }
}

setupFirebaseCredentials();
