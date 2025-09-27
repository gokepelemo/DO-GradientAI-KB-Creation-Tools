import { jest } from '@jest/globals';

// Create mock functions
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockStatSync = jest.fn();

// Mock fs module
jest.unstable_mockModule('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  statSync: mockStatSync
}));

// Import after mocking
const { validateBatchConfig } = await import('../modules/batchConfigValidator.js');

describe('Batch Config Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBatchConfig', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should validate a correct config file', () => {
      const mockConfig = {
        kbcreationtools: '1.0',
        defaultBucket: 'test-bucket',
        documents: [
          { file: 'test.pdf', bucket: 'docs-bucket' }
        ],
        webPages: [
          { url: 'https://example.com', selector: 'main' }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
      mockStatSync.mockReturnValue({ isFile: () => true, size: 1024 });

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.info).toContain('Configuration version: 1.0');
    });

    test('should detect missing kbcreationtools key', () => {
      const mockConfig = {
        documents: [{ file: 'test.pdf' }]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "kbcreationtools" key. Expected format: {"kbcreationtools": "version"}');
    });

    test('should detect invalid JSON', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{ invalid json }');

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid JSON syntax/);
    });

    test('should detect missing files', () => {
      const mockConfig = {
        kbcreationtools: '1.0',
        defaultBucket: 'test-bucket',
        documents: [{ file: 'missing.pdf' }]
      };

      mockExistsSync.mockImplementation((path) => {
        if (path === 'test-config.json') return true; // Config file exists
        if (path.includes('missing.pdf')) return false; // Document file doesn't exist
        return true; // Default to true for other paths
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(true); // Structure is valid, even if referenced files don't exist
      expect(result.errors.some(error => error.includes('file not found') && error.includes('missing.pdf'))).toBe(true);
    });

    test('should validate URLs', () => {
      const mockConfig = {
        kbcreationtools: '1.0',
        webPages: [
          { url: 'https://valid.com' },
          { url: 'invalid-url' }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(true);
      expect(result.errors).toContain('webPages[1]: invalid URL format: invalid-url');
      expect(result.info).toContain('webPages[0]: valid URL https://valid.com');
    });

    test('should detect unknown sections', () => {
      const mockConfig = {
        kbcreationtools: '1.0',
        unknownSection: { some: 'data' }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = validateBatchConfig('test-config.json');

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Unknown configuration section: "unknownSection"');
    });
  });
});