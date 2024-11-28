/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Set timeout to 10s as Firestore operations might take longer
  testTimeout: 10000,
  // Setup global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  // Specify test environment setup
  setupFiles: ['<rootDir>/scripts/jest.setup.js'],
  // Ignore certain paths
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.nuxt/',
    '/dist/',
  ],
  // Collect coverage information
  collectCoverage: true,
  collectCoverageFrom: [
    'firestore.rules',
  ],
  coverageDirectory: 'coverage',
  // Configure console output
  verbose: true,
};

export default config;
