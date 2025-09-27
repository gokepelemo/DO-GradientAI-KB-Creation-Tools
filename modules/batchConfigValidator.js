import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Validate a batch configuration JSON file
 * @param {string} configPath - Path to the configuration file
 * @returns {Object} - Validation results with errors, warnings, and info
 */
export function validateBatchConfig(configPath) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };

  try {
  // Check if file exists
  if (!existsSync(configPath)) {
    results.errors.push(`Configuration file not found: ${configPath}`);
    results.valid = false;
    return results;
  }

  // Check if file is readable
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (error) {
    results.errors.push(`Invalid JSON syntax: ${error.message}`);
    results.valid = false;
    return results;
  }    // Validate required kbcreationtools key
    if (!config.kbcreationtools || typeof config.kbcreationtools !== 'string') {
      results.errors.push('Missing or invalid "kbcreationtools" key. Expected format: {"kbcreationtools": "version"}');
      results.valid = false;
    } else {
      results.info.push(`Configuration version: ${config.kbcreationtools}`);
    }

    // Validate defaultBucket if present
    if (config.defaultBucket && typeof config.defaultBucket !== 'string') {
      results.errors.push('"defaultBucket" must be a string');
      results.valid = false;
    } else if (config.defaultBucket) {
      validateBucketName(config.defaultBucket, results);
    }

    // Validate documents section
    if (config.documents) {
      if (!Array.isArray(config.documents)) {
        results.errors.push('"documents" must be an array');
        results.valid = false;
      } else {
        validateDocumentsSection(config.documents, configPath, config.defaultBucket, results);
      }
    }

    // Validate webPages section
    if (config.webPages) {
      if (!Array.isArray(config.webPages)) {
        results.errors.push('"webPages" must be an array');
        results.valid = false;
      } else {
        validateWebPagesSection(config.webPages, config.defaultBucket, results);
      }
    }

    // Validate linkExtraction section
    if (config.linkExtraction) {
      if (!Array.isArray(config.linkExtraction)) {
        results.errors.push('"linkExtraction" must be an array');
        results.valid = false;
      } else {
        validateLinkExtractionSection(config.linkExtraction, config.defaultBucket, results);
      }
    }

    // Validate sitemaps section
    if (config.sitemaps) {
      if (!Array.isArray(config.sitemaps)) {
        results.errors.push('"sitemaps" must be an array');
        results.valid = false;
      } else {
        validateSitemapsSection(config.sitemaps, config.defaultBucket, results);
      }
    }

    // Validate github section
    if (config.github) {
      if (!Array.isArray(config.github)) {
        results.errors.push('"github" must be an array');
        results.valid = false;
      } else {
        validateGithubSection(config.github, results);
      }
    }

    // Validate intercom section
    if (config.intercom) {
      if (!Array.isArray(config.intercom)) {
        results.errors.push('"intercom" must be an array');
        results.valid = false;
      } else {
        validateIntercomSection(config.intercom, results);
      }
    }

    // Validate reddit section
    if (config.reddit) {
      if (!Array.isArray(config.reddit)) {
        results.errors.push('"reddit" must be an array');
        results.valid = false;
      } else {
        validateRedditSection(config.reddit, results);
      }
    }

    // Validate stackoverflow section
    if (config.stackoverflow) {
      if (!Array.isArray(config.stackoverflow)) {
        results.errors.push('"stackoverflow" must be an array');
        results.valid = false;
      } else {
        validateStackoverflowSection(config.stackoverflow, results);
      }
    }

    // Validate llms section
    if (config.llms) {
      if (!Array.isArray(config.llms)) {
        results.errors.push('"llms" must be an array');
        results.valid = false;
      } else {
        validateLlmsSection(config.llms, results);
      }
    }

    // Validate rss section
    if (config.rss) {
      if (!Array.isArray(config.rss)) {
        results.errors.push('"rss" must be an array');
        results.valid = false;
      } else {
        validateRssSection(config.rss, results);
      }
    }

    // Check for unknown sections
    const knownSections = [
      'kbcreationtools', 'defaultBucket', 'documents', 'webPages',
      'linkExtraction', 'sitemaps', 'github', 'intercom', 'reddit',
      'stackoverflow', 'llms', 'rss'
    ];

    for (const key of Object.keys(config)) {
      if (!knownSections.includes(key)) {
        results.warnings.push(`Unknown configuration section: "${key}"`);
      }
    }

  } catch (error) {
    results.errors.push(`Unexpected error during validation: ${error.message}`);
    results.valid = false;
  }

  return results;
}

/**
 * Validate bucket name format
 */
function validateBucketName(bucketName, results) {
  if (!bucketName || bucketName.trim() === '') {
    results.errors.push('Bucket name cannot be empty');
    return;
  }

  // Basic bucket name validation (S3/DigitalOcean Spaces rules)
  const bucketRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
  if (bucketName.length < 3 || bucketName.length > 63) {
    results.errors.push(`Bucket name "${bucketName}" must be between 3 and 63 characters`);
  } else if (!bucketRegex.test(bucketName)) {
    results.errors.push(`Bucket name "${bucketName}" contains invalid characters. Only lowercase letters, numbers, and hyphens are allowed`);
  }
}

/**
 * Validate documents section
 */
function validateDocumentsSection(documents, configPath, defaultBucket, results) {
  documents.forEach((doc, index) => {
    if (!doc.file || typeof doc.file !== 'string') {
      results.errors.push(`documents[${index}]: missing or invalid "file" property`);
      return;
    }

    const fullPath = path.resolve(path.dirname(configPath), doc.file);
    if (!existsSync(fullPath)) {
      results.errors.push(`documents[${index}]: file not found: ${fullPath}`);
    } else {
      const stats = statSync(fullPath);
      if (!stats.isFile()) {
        results.errors.push(`documents[${index}]: "${fullPath}" is not a file`);
      } else {
        results.info.push(`documents[${index}]: found file ${doc.file} (${stats.size} bytes)`);
      }
    }

    if (doc.bucket) {
      if (typeof doc.bucket !== 'string') {
        results.errors.push(`documents[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(doc.bucket, results);
      }
    } else if (!defaultBucket) {
      results.errors.push(`documents[${index}]: missing "bucket" property and no defaultBucket specified`);
    }
  });
}

/**
 * Validate webPages section
 */
function validateWebPagesSection(webPages, defaultBucket, results) {
  webPages.forEach((page, index) => {
    if (!page.url || typeof page.url !== 'string') {
      results.errors.push(`webPages[${index}]: missing or invalid "url" property`);
      return;
    }

    try {
      new URL(page.url);
      results.info.push(`webPages[${index}]: valid URL ${page.url}`);
    } catch {
      results.errors.push(`webPages[${index}]: invalid URL format: ${page.url}`);
    }

    if (page.selector && typeof page.selector !== 'string') {
      results.errors.push(`webPages[${index}]: "selector" must be a string`);
    }

    if (page.bucket) {
      if (typeof page.bucket !== 'string') {
        results.errors.push(`webPages[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(page.bucket, results);
      }
    } else if (!defaultBucket) {
      results.warnings.push(`webPages[${index}]: no bucket specified, will use defaultBucket if available`);
    }
  });
}

/**
 * Validate linkExtraction section
 */
function validateLinkExtractionSection(linkExtraction, defaultBucket, results) {
  linkExtraction.forEach((extraction, index) => {
    if (!extraction.url || typeof extraction.url !== 'string') {
      results.errors.push(`linkExtraction[${index}]: missing or invalid "url" property`);
      return;
    }

    try {
      new URL(extraction.url);
    } catch {
      results.errors.push(`linkExtraction[${index}]: invalid URL format: ${extraction.url}`);
    }

    if (!extraction.outputFile || typeof extraction.outputFile !== 'string') {
      results.errors.push(`linkExtraction[${index}]: missing or invalid "outputFile" property`);
    }

    if (extraction.processDocs) {
      if (extraction.processDocs.selector && typeof extraction.processDocs.selector !== 'string') {
        results.errors.push(`linkExtraction[${index}].processDocs: "selector" must be a string`);
      }

      if (extraction.processDocs.bucket) {
        if (typeof extraction.processDocs.bucket !== 'string') {
          results.errors.push(`linkExtraction[${index}].processDocs: "bucket" must be a string`);
        } else {
          validateBucketName(extraction.processDocs.bucket, results);
        }
      } else if (!defaultBucket) {
        results.warnings.push(`linkExtraction[${index}].processDocs: no bucket specified`);
      }
    }
  });
}

/**
 * Validate sitemaps section
 */
function validateSitemapsSection(sitemaps, defaultBucket, results) {
  sitemaps.forEach((sitemap, index) => {
    if (!sitemap.source || typeof sitemap.source !== 'string') {
      results.errors.push(`sitemaps[${index}]: missing or invalid "source" property`);
      return;
    }

    try {
      new URL(sitemap.source);
    } catch {
      results.errors.push(`sitemaps[${index}]: invalid URL format: ${sitemap.source}`);
    }

    if (!sitemap.outputFile || typeof sitemap.outputFile !== 'string') {
      results.errors.push(`sitemaps[${index}]: missing or invalid "outputFile" property`);
    }

    if (sitemap.processDocs) {
      if (sitemap.processDocs.selector && typeof sitemap.processDocs.selector !== 'string') {
        results.errors.push(`sitemaps[${index}].processDocs: "selector" must be a string`);
      }

      if (sitemap.processDocs.bucket) {
        if (typeof sitemap.processDocs.bucket !== 'string') {
          results.errors.push(`sitemaps[${index}].processDocs: "bucket" must be a string`);
        } else {
          validateBucketName(sitemap.processDocs.bucket, results);
        }
      } else if (!defaultBucket) {
        results.warnings.push(`sitemaps[${index}].processDocs: no bucket specified`);
      }
    }
  });
}

/**
 * Validate github section
 */
function validateGithubSection(github, results) {
  github.forEach((repo, index) => {
    if (!repo.owner || typeof repo.owner !== 'string') {
      results.errors.push(`github[${index}]: missing or invalid "owner" property`);
    }

    if (!repo.repo || typeof repo.repo !== 'string') {
      results.errors.push(`github[${index}]: missing or invalid "repo" property`);
    }

    if (repo.outputFile && typeof repo.outputFile !== 'string') {
      results.errors.push(`github[${index}]: "outputFile" must be a string`);
    }

    if (repo.bucket) {
      if (typeof repo.bucket !== 'string') {
        results.errors.push(`github[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(repo.bucket, results);
      }
    }
  });
}

/**
 * Validate intercom section
 */
function validateIntercomSection(intercom, results) {
  intercom.forEach((item, index) => {
    if (item.outputFile && typeof item.outputFile !== 'string') {
      results.errors.push(`intercom[${index}]: "outputFile" must be a string`);
    }

    if (item.bucket) {
      if (typeof item.bucket !== 'string') {
        results.errors.push(`intercom[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(item.bucket, results);
      }
    }
  });
}

/**
 * Validate reddit section
 */
function validateRedditSection(reddit, results) {
  reddit.forEach((item, index) => {
    if (!item.query || typeof item.query !== 'string') {
      results.errors.push(`reddit[${index}]: missing or invalid "query" property`);
    }

    if (item.outputFile && typeof item.outputFile !== 'string') {
      results.errors.push(`reddit[${index}]: "outputFile" must be a string`);
    }

    if (item.bucket) {
      if (typeof item.bucket !== 'string') {
        results.errors.push(`reddit[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(item.bucket, results);
      }
    }
  });
}

/**
 * Validate stackoverflow section
 */
function validateStackoverflowSection(stackoverflow, results) {
  stackoverflow.forEach((item, index) => {
    if (!item.searchTerm || typeof item.searchTerm !== 'string') {
      results.errors.push(`stackoverflow[${index}]: missing or invalid "searchTerm" property`);
    }

    if (item.outputFile && typeof item.outputFile !== 'string') {
      results.errors.push(`stackoverflow[${index}]: "outputFile" must be a string`);
    }

    if (item.bucket) {
      if (typeof item.bucket !== 'string') {
        results.errors.push(`stackoverflow[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(item.bucket, results);
      }
    }
  });
}

/**
 * Validate llms section
 */
function validateLlmsSection(llms, results) {
  llms.forEach((item, index) => {
    if (!item.url || typeof item.url !== 'string') {
      results.errors.push(`llms[${index}]: missing or invalid "url" property`);
      return;
    }

    try {
      new URL(item.url);
    } catch {
      results.errors.push(`llms[${index}]: invalid URL format: ${item.url}`);
    }

    if (item.outputFile && typeof item.outputFile !== 'string') {
      results.errors.push(`llms[${index}]: "outputFile" must be a string`);
    }

    if (item.bucket) {
      if (typeof item.bucket !== 'string') {
        results.errors.push(`llms[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(item.bucket, results);
      }
    }
  });
}

/**
 * Validate rss section
 */
function validateRssSection(rss, results) {
  rss.forEach((item, index) => {
    if (!item.feedUrl || typeof item.feedUrl !== 'string') {
      results.errors.push(`rss[${index}]: missing or invalid "feedUrl" property`);
      return;
    }

    try {
      new URL(item.feedUrl);
    } catch {
      results.errors.push(`rss[${index}]: invalid URL format: ${item.feedUrl}`);
    }

    if (item.outputFile && typeof item.outputFile !== 'string') {
      results.errors.push(`rss[${index}]: "outputFile" must be a string`);
    }

    if (item.bucket) {
      if (typeof item.bucket !== 'string') {
        results.errors.push(`rss[${index}]: "bucket" must be a string`);
      } else {
        validateBucketName(item.bucket, results);
      }
    }
  });
}