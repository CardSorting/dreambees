const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Paths to index files
const CURRENT_INDEXES_PATH = path.resolve(__dirname, '../firestore.indexes.current.json');
const PLANNED_INDEXES_PATH = path.resolve(__dirname, '../firestore.indexes.json');

function loadIndexes(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading indexes from ${filePath}:`, error.message);
    process.exit(1);
  }
}

function createIndexSignature(index) {
  return `${index.collectionGroup}:${index.queryScope}:${index.fields.map(f => 
    `${f.fieldPath}:${f.order}`).join(',')}`;
}

function createFieldOverrideSignature(override) {
  return `${override.collectionGroup}:${override.fieldPath}:${override.ttl}:${
    override.indexes.map(idx => `${idx.order || idx.arrayConfig}:${idx.queryScope}`).join(',')}`;
}

function compareIndexes(current, planned) {
  const currentIndexMap = new Map();
  const plannedIndexMap = new Map();
  const currentOverrideMap = new Map();
  const plannedOverrideMap = new Map();

  // Map current indexes and overrides
  current.indexes?.forEach(index => {
    currentIndexMap.set(createIndexSignature(index), index);
  });
  current.fieldOverrides?.forEach(override => {
    currentOverrideMap.set(createFieldOverrideSignature(override), override);
  });

  // Map planned indexes and overrides
  planned.indexes?.forEach(index => {
    plannedIndexMap.set(createIndexSignature(index), index);
  });
  planned.fieldOverrides?.forEach(override => {
    plannedOverrideMap.set(createFieldOverrideSignature(override), override);
  });

  // Find differences
  const toCreate = {
    indexes: [],
    fieldOverrides: []
  };
  const toDelete = {
    indexes: [],
    fieldOverrides: []
  };

  // Check indexes to create
  plannedIndexMap.forEach((index, signature) => {
    if (!currentIndexMap.has(signature)) {
      toCreate.indexes.push(index);
    }
  });

  // Check indexes to delete
  currentIndexMap.forEach((index, signature) => {
    if (!plannedIndexMap.has(signature)) {
      toDelete.indexes.push(index);
    }
  });

  // Check field overrides to create
  plannedOverrideMap.forEach((override, signature) => {
    if (!currentOverrideMap.has(signature)) {
      toCreate.fieldOverrides.push(override);
    }
  });

  // Check field overrides to delete
  currentOverrideMap.forEach((override, signature) => {
    if (!plannedOverrideMap.has(signature)) {
      toDelete.fieldOverrides.push(override);
    }
  });

  return { toCreate, toDelete };
}

function formatIndex(index) {
  return `${chalk.cyan(index.collectionGroup)} (${index.fields.map(f => 
    `${chalk.yellow(f.fieldPath)} ${chalk.green(f.order)}`).join(', ')})`;
}

function formatFieldOverride(override) {
  return `${chalk.cyan(override.collectionGroup)}.${chalk.yellow(override.fieldPath)} ` +
    `[${override.indexes.map(idx => chalk.green(idx.order || idx.arrayConfig)).join(', ')}]`;
}

function printDiff(diff) {
  console.log(chalk.bold('\nFirestore Indexes Diff:'));
  console.log('=======================\n');

  if (diff.toCreate.indexes.length === 0 && 
      diff.toDelete.indexes.length === 0 &&
      diff.toCreate.fieldOverrides.length === 0 &&
      diff.toDelete.fieldOverrides.length === 0) {
    console.log(chalk.green('No differences found'));
    return;
  }

  // Print indexes to create
  if (diff.toCreate.indexes.length > 0) {
    console.log(chalk.bold.green('\nIndexes to Create:'));
    diff.toCreate.indexes.forEach(index => {
      console.log(`+ ${formatIndex(index)}`);
    });
  }

  // Print indexes to delete
  if (diff.toDelete.indexes.length > 0) {
    console.log(chalk.bold.red('\nIndexes to Delete:'));
    diff.toDelete.indexes.forEach(index => {
      console.log(`- ${formatIndex(index)}`);
    });
  }

  // Print field overrides to create
  if (diff.toCreate.fieldOverrides.length > 0) {
    console.log(chalk.bold.green('\nField Overrides to Create:'));
    diff.toCreate.fieldOverrides.forEach(override => {
      console.log(`+ ${formatFieldOverride(override)}`);
    });
  }

  // Print field overrides to delete
  if (diff.toDelete.fieldOverrides.length > 0) {
    console.log(chalk.bold.red('\nField Overrides to Delete:'));
    diff.toDelete.fieldOverrides.forEach(override => {
      console.log(`- ${formatFieldOverride(override)}`);
    });
  }

  // Print summary
  console.log('\nSummary:');
  console.log('--------');
  console.log(`Indexes: ${chalk.green(`+${diff.toCreate.indexes.length}`)} ${chalk.red(`-${diff.toDelete.indexes.length}`)}`);
  console.log(`Field Overrides: ${chalk.green(`+${diff.toCreate.fieldOverrides.length}`)} ${chalk.red(`-${diff.toDelete.fieldOverrides.length}`)}`);

  // Print deployment command
  console.log('\nTo deploy these changes:');
  console.log(chalk.cyan('npm run deploy:indexes'));
}

// Main execution
if (require.main === module) {
  if (!fs.existsSync(CURRENT_INDEXES_PATH)) {
    console.error(chalk.red('\nError: Current indexes file not found.'));
    console.log('Run the following command first:');
    console.log(chalk.cyan('npm run firebase:get-indexes'));
    process.exit(1);
  }

  const current = loadIndexes(CURRENT_INDEXES_PATH);
  const planned = loadIndexes(PLANNED_INDEXES_PATH);
  const diff = compareIndexes(current, planned);
  printDiff(diff);
}

module.exports = {
  compareIndexes,
  loadIndexes
};
