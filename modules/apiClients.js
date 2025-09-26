import fetch from 'node-fetch';
import { config } from './config.js';

/**
 * Standardized API request with retry logic
 */
export const apiRequest = async (url, options = {}, retries = 3) => {
  const defaultOptions = {
    headers: {
      'User-Agent': config.USER_AGENT,
      'Accept': 'application/json',
    },
    timeout: 10000,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, mergedOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`API request failed after ${retries} attempts: ${error.message}`);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

/**
 * GitHub API client
 */
export class GitHubClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers,
    };

    return apiRequest(url, { ...options, headers });
  }

  async getRepo(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }

  async getReadme(owner, repo) {
    return this.request(`/repos/${owner}/${repo}/readme`);
  }

  async getIssues(owner, repo, options = {}) {
    return this.request(`/repos/${owner}/${repo}/issues`, {
      method: 'GET',
      ...options
    });
  }

  async getPulls(owner, repo, options = {}) {
    return this.request(`/repos/${owner}/${repo}/pulls`, {
      method: 'GET',
      ...options
    });
  }
}

/**
 * Stack Overflow API client
 */
export class StackOverflowClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.stackexchange.com/2.3';
  }

  async search(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      site: 'stackoverflow',
      filter: 'withbody',
      ...options,
    });

    if (this.apiKey) {
      params.set('key', this.apiKey);
    }

    const url = `${this.baseUrl}/search?${params}`;
    return apiRequest(url);
  }

  async getQuestion(questionId, options = {}) {
    const params = new URLSearchParams({
      site: 'stackoverflow',
      filter: 'withbody',
      ...options,
    });

    if (this.apiKey) {
      params.set('key', this.apiKey);
    }

    const url = `${this.baseUrl}/questions/${questionId}?${params}`;
    return apiRequest(url);
  }
}