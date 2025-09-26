// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SPACES_BUCKET = 'test-bucket';
process.env.BUCKET_ENDPOINT = 'https://test.endpoint.com';

// Global test utilities
global.testUtils = {
  mockEnv: (overrides = {}) => {
    const originalEnv = { ...process.env };
    Object.assign(process.env, overrides);
    return () => Object.assign(process.env, originalEnv);
  },

  createMockResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })
};