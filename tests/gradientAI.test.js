import { jest } from '@jest/globals';
import { createIndexingJob, promptForIndexingJob } from '../modules/gradientAI.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('GradientAI Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createIndexingJob', () => {
    const mockAccessToken = 'test-token';
    const mockKnowledgeBaseUuid = '123e4567-e89b-12d3-a456-426614174000';
    const mockDataSourceUuids = ['uuid1', 'uuid2'];

    test('should successfully create indexing job with data sources', async () => {
      const mockResponse = {
        job: {
          uuid: 'job-uuid-123',
          status: 'INDEX_JOB_STATUS_PENDING',
          knowledge_base_uuid: mockKnowledgeBaseUuid,
          data_source_uuids: mockDataSourceUuids,
          created_at: '2025-09-26T00:00:00Z'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid, mockDataSourceUuids);

      expect(fetch).toHaveBeenCalledWith('https://api.digitalocean.com/v2/gen-ai/indexing_jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAccessToken}`
        },
        body: JSON.stringify({
          knowledge_base_uuid: mockKnowledgeBaseUuid,
          data_source_uuids: mockDataSourceUuids
        })
      });

      expect(result).toEqual(mockResponse.job);
    });

    test('should successfully create indexing job without data sources', async () => {
      const mockResponse = {
        job: {
          uuid: 'job-uuid-456',
          status: 'INDEX_JOB_STATUS_PENDING',
          knowledge_base_uuid: mockKnowledgeBaseUuid,
          data_source_uuids: [],
          created_at: '2025-09-26T00:00:00Z'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid);

      expect(fetch).toHaveBeenCalledWith('https://api.digitalocean.com/v2/gen-ai/indexing_jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAccessToken}`
        },
        body: JSON.stringify({
          knowledge_base_uuid: mockKnowledgeBaseUuid,
          data_source_uuids: []
        })
      });

      expect(result).toEqual(mockResponse.job);
    });

    test('should handle API errors', async () => {
      const errorMessage = 'Invalid knowledge base UUID';
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: errorMessage })
      });

      await expect(createIndexingJob(mockAccessToken, 'invalid-uuid'))
        .rejects
        .toThrow(`API Error: 400 - ${errorMessage}`);
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      fetch.mockRejectedValueOnce(networkError);

      await expect(createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid))
        .rejects
        .toThrow('Network connection failed');
    });

    test('should handle malformed API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid))
        .rejects
        .toThrow('Invalid JSON');
    });
  });

  describe('promptForIndexingJob', () => {
    let mockInquirer;

    beforeEach(() => {
      mockInquirer = {
        prompt: jest.fn()
      };
    });

    test('should return user responses when creating job', async () => {
      const mockAnswers = {
        createJob: true,
        knowledgeBaseUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataSourceUuids: ['uuid1', 'uuid2']
      };

      mockInquirer.prompt.mockResolvedValueOnce(mockAnswers);

      const result = await promptForIndexingJob(mockInquirer);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'createJob',
          message: 'Would you like to create an indexing job for this upload?',
          default: false
        },
        {
          type: 'input',
          name: 'knowledgeBaseUuid',
          message: 'Enter the Knowledge Base UUID:',
          when: expect.any(Function),
          validate: expect.any(Function)
        },
        {
          type: 'input',
          name: 'dataSourceUuids',
          message: 'Enter Data Source UUIDs (comma-separated, optional):',
          when: expect.any(Function),
          filter: expect.any(Function)
        }
      ]);

      expect(result).toEqual(mockAnswers);
    });

    test('should return early when user declines job creation', async () => {
      const mockAnswers = {
        createJob: false
      };

      mockInquirer.prompt.mockResolvedValueOnce(mockAnswers);

      const result = await promptForIndexingJob(mockInquirer);

      expect(result).toEqual(mockAnswers);
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
    });

    test('should validate knowledge base UUID format', async () => {
      const mockInquirerWithValidation = {
        prompt: jest.fn()
      };

      // Test the validation function directly
      const promptConfig = [
        {
          type: 'confirm',
          name: 'createJob',
          message: 'Would you like to create an indexing job for this upload?',
          default: false
        },
        {
          type: 'input',
          name: 'knowledgeBaseUuid',
          message: 'Enter the Knowledge Base UUID:',
          when: (answers) => answers.createJob,
          validate: expect.any(Function)
        },
        {
          type: 'input',
          name: 'dataSourceUuids',
          message: 'Enter Data Source UUIDs (comma-separated, optional):',
          when: (answers) => answers.createJob,
          filter: expect.any(Function)
        }
      ];

      // Extract the validate function
      const validateFn = promptConfig[1].validate;

      expect(validateFn('')).toBe('Knowledge Base UUID is required');
      expect(validateFn('invalid-uuid')).toBe('Please enter a valid UUID');
      expect(validateFn('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    test('should filter and trim data source UUIDs', async () => {
      const mockInquirerWithFilter = {
        prompt: jest.fn()
      };

      // Test the filter function directly
      const promptConfig = [
        {
          type: 'confirm',
          name: 'createJob',
          message: 'Would you like to create an indexing job for this upload?',
          default: false
        },
        {
          type: 'input',
          name: 'knowledgeBaseUuid',
          message: 'Enter the Knowledge Base UUID:',
          when: (answers) => answers.createJob,
          validate: expect.any(Function)
        },
        {
          type: 'input',
          name: 'dataSourceUuids',
          message: 'Enter Data Source UUIDs (comma-separated, optional):',
          when: (answers) => answers.createJob,
          filter: expect.any(Function)
        }
      ];

      // Extract the filter function
      const filterFn = promptConfig[2].filter;

      expect(filterFn('uuid1, uuid2 , uuid3')).toEqual(['uuid1', 'uuid2', 'uuid3']);
      expect(filterFn('  uuid1  ,, uuid2  ')).toEqual(['uuid1', 'uuid2']);
      expect(filterFn('')).toEqual([]);
      expect(filterFn('single-uuid')).toEqual(['single-uuid']);
    });
  });
});