const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const indexesPath = path.resolve(__dirname, '../firestore.indexes.json');

async function validateIndexes() {
  console.log('Validating Firestore indexes...');

  try {
    // Read and parse the indexes file
    const indexesContent = fs.readFileSync(indexesPath, 'utf8');
    const indexes = JSON.parse(indexesContent);

    // Basic structure validation
    if (!indexes.indexes || !Array.isArray(indexes.indexes)) {
      throw new Error('Invalid indexes structure: missing or invalid "indexes" array');
    }

    // Validate each index
    indexes.indexes.forEach((index, i) => {
      if (!index.collectionGroup) {
        throw new Error(`Index ${i} missing collectionGroup`);
      }
      if (!index.queryScope) {
        throw new Error(`Index ${i} missing queryScope`);
      }
      if (!index.fields || !Array.isArray(index.fields)) {
        throw new Error(`Index ${i} missing or invalid fields array`);
      }

      // Validate fields
      index.fields.forEach((field, j) => {
        if (!field.fieldPath) {
          throw new Error(`Index ${i}, field ${j} missing fieldPath`);
        }
        if (!field.order || !['ASCENDING', 'DESCENDING'].includes(field.order)) {
          throw new Error(`Index ${i}, field ${j} has invalid order`);
        }
      });
    });

    // Validate field overrides if present
    if (indexes.fieldOverrides) {
      indexes.fieldOverrides.forEach((override, i) => {
        if (!override.collectionGroup) {
          throw new Error(`Field override ${i} missing collectionGroup`);
        }
        if (!override.fieldPath) {
          throw new Error(`Field override ${i} missing fieldPath`);
        }
        if (typeof override.ttl !== 'boolean') {
          throw new Error(`Field override ${i} missing or invalid ttl`);
        }
      });
    }

    console.log('✓ Basic validation passed');

    // Check for potential issues
    const warnings = [];

    // Check for duplicate indexes
    const indexSignatures = new Set();
    indexes.indexes.forEach((index) => {
      const signature = `${index.collectionGroup}:${index.fields.map(f => `${f.fieldPath}:${f.order}`).join(',')}`;
      if (indexSignatures.has(signature)) {
        warnings.push(`Warning: Possible duplicate index found for ${signature}`);
      }
      indexSignatures.add(signature);
    });

    // Check for potentially missing composite indexes
    const collections = new Set(indexes.indexes.map(i => i.collectionGroup));
    collections.forEach(collection => {
      const collectionIndexes = indexes.indexes.filter(i => i.collectionGroup === collection);
      if (collectionIndexes.length === 1) {
        warnings.push(`Warning: Collection '${collection}' has only one index. Consider if composite indexes are needed.`);
      }
    });

    // Display warnings
    if (warnings.length > 0) {
      console.log('\nWarnings:');
      warnings.forEach(warning => console.log(`! ${warning}`));
    }

    // Verify with Firebase CLI
    try {
      await execAsync('firebase firestore:indexes');
      console.log('\n✓ Firebase CLI validation passed');
    } catch (error) {
      if (!error.message.includes('not logged in')) {
        throw new Error(`Firebase CLI validation failed: ${error.message}`);
      }
    }

    console.log('\n✓ Index validation completed successfully');
    if (warnings.length === 0) {
      console.log('No warnings found - indexes appear to be well-configured');
    }

    return true;
  } catch (error) {
    console.error('\n✗ Validation failed:');
    console.error(error.message);
    return false;
  }
}

// Function to estimate index costs
function estimateIndexCosts(indexes) {
  let totalIndexes = indexes.indexes.length;
  let compositeIndexes = indexes.indexes.filter(i => i.fields.length > 1).length;
  let singleFieldIndexes = totalIndexes - compositeIndexes;

  console.log('\nIndex Cost Estimation:');
  console.log('----------------------');
  console.log(`Total Indexes: ${totalIndexes}`);
  console.log(`- Single-Field Indexes: ${singleFieldIndexes}`);
  console.log(`- Composite Indexes: ${compositeIndexes}`);
  console.log('\nNote: This is a rough estimation. Actual costs depend on your data size and query patterns.');
}

// Main execution
if (require.main === module) {
  validateIndexes().then(isValid => {
    if (isValid) {
      const indexes = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
      estimateIndexCosts(indexes);
    } else {
      process.exit(1);
    }
  });
}

module.exports = {
  validateIndexes
};
