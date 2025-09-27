import { jest } from '@jest/globals';

// Create mock functions
const mockFetch = jest.fn();
const mockInquirerPrompt = jest.fn();
const mockInquirer = {
  prompt: mockInquirerPrompt
};

// Mock dependencies using unstable_mockModule for ES modules
jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

jest.unstable_mockModule('inquirer', () => ({
  default: mockInquirer
}));

jest.unstable_mockModule('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis()
  }))
}));

jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn((str) => str),
    red: jest.fn((str) => str),
    blue: jest.fn((str) => str)
  }
}));

// Import after mocking
const { createIndexingJob, promptForIndexingJob } = await import('../modules/gradientAI.js');

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

    beforeEach(() => {
      jest.clearAllMocks();
    });

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

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid, mockDataSourceUuids);

      expect(mockFetch).toHaveBeenCalledWith('https://api.digitalocean.com/v2/gen-ai/indexing_jobs', {
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

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid);

      expect(mockFetch).toHaveBeenCalledWith('https://api.digitalocean.com/v2/gen-ai/indexing_jobs', {
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: errorMessage })
      });

      await expect(createIndexingJob(mockAccessToken, 'invalid-uuid'))
        .rejects
        .toThrow(`API Error: 400 - ${errorMessage}`);
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      await expect(createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid))
        .rejects
        .toThrow('Network connection failed');
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(createIndexingJob(mockAccessToken, mockKnowledgeBaseUuid))
        .rejects
        .toThrow('Invalid JSON');
    });
  });

  describe('promptForIndexingJob', () => {
    test('should return user responses when creating job', async () => {
      const mockAnswers = {
        createJob: true,
        knowledgeBaseUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataSourceUuids: ['uuid1', 'uuid2']
      };

      mockInquirerPrompt.mockResolvedValue(mockAnswers);

      const result = await promptForIndexingJob(mockInquirer);

      expect(mockInquirerPrompt).toHaveBeenCalled();
      expect(result).toEqual(mockAnswers);
    });

    test('should validate knowledge base UUID format', async () => {
      const mockAnswers = {
        createJob: true,
        knowledgeBaseUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataSourceUuids: []
      };

      mockInquirerPrompt.mockResolvedValue(mockAnswers);

      const result = await promptForIndexingJob(mockInquirer);

      expect(mockInquirerPrompt).toHaveBeenCalled();
      expect(result.createJob).toBe(true);
      expect(result.knowledgeBaseUuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    test('should filter and trim data source UUIDs', async () => {
      const mockAnswers = {
        createJob: true,
        knowledgeBaseUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataSourceUuids: ['uuid1', 'uuid2', 'uuid3']
      };

      mockInquirerPrompt.mockResolvedValue(mockAnswers);

      const result = await promptForIndexingJob(mockInquirer);

      expect(mockInquirerPrompt).toHaveBeenCalled();
      expect(result.dataSourceUuids).toEqual(['uuid1', 'uuid2', 'uuid3']);
    });
  });
});