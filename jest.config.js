export default {
  preset: null,
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'modules/**/*.js',
    'sources/**/*.js',
    'urls/**/*.js',
    '!**/node_modules/**',
    '!**/bin/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  injectGlobals: true
};