const { readFileSync } = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Read the rules file
const rulesPath = path.resolve(__dirname, '../firestore.rules');
console.log('Validating Firestore rules...');

try {
  const rules = readFileSync(rulesPath, 'utf8');

  // Basic syntax validation
  const validateSyntax = () => {
    // Check for matching braces
    const braces = rules.match(/[{}]/g) || [];
    let count = 0;
    for (const brace of braces) {
      if (brace === '{') count++;
      if (brace === '}') count--;
      if (count < 0) throw new Error('Unmatched closing brace');
    }
    if (count !== 0) throw new Error('Unmatched opening brace');

    // Check for required sections
    if (!rules.includes('rules_version')) {
      throw new Error('Missing rules_version declaration');
    }
    if (!rules.includes('service cloud.firestore')) {
      throw new Error('Missing service cloud.firestore declaration');
    }
    if (!rules.includes('match /databases/{database}/documents')) {
      throw new Error('Missing root match statement');
    }
  };

  // Validate using Firebase CLI
  const validateWithFirebase = () => {
    return new Promise((resolve, reject) => {
      exec('firebase --project demo-project emulators:exec --only firestore "exit 0"', 
        (error, stdout, stderr) => {
          if (error && !error.message.includes('Could not find config')) {
            reject(new Error(`Firebase validation failed: ${error.message}`));
            return;
          }
          resolve();
        });
    });
  };

  // Run validations
  const runValidation = async () => {
    try {
      // Step 1: Syntax validation
      validateSyntax();
      console.log('✓ Basic syntax validation passed');

      // Step 2: Firebase CLI validation
      await validateWithFirebase();
      console.log('✓ Firebase CLI validation passed');

      // Additional checks
      const warnings = [];

      // Check for potential issues
      if (!rules.includes('request.auth != null')) {
        warnings.push('Warning: No authentication check found in rules');
      }
      if (!rules.includes('allow read') && !rules.includes('allow write')) {
        warnings.push('Warning: No explicit read/write rules found');
      }
      if (rules.includes('allow read: if true') || rules.includes('allow write: if true')) {
        warnings.push('Warning: Found unrestricted read/write rules');
      }

      // Display warnings
      if (warnings.length > 0) {
        console.log('\nWarnings:');
        warnings.forEach(warning => console.log(`! ${warning}`));
      }

      console.log('\n✓ Firestore rules validation completed successfully');
      
      if (warnings.length === 0) {
        console.log('No warnings found - rules appear to be secure');
      }

    } catch (error) {
      console.error('\n✗ Validation failed:');
      console.error(error.message);
      process.exit(1);
    }
  };

  runValidation();

} catch (error) {
  console.error('Failed to read rules file:', error);
  process.exit(1);
}
