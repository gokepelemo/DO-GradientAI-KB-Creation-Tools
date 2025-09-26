import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Spaces/S3 Configuration
  SPACES_REGION: z.string().default('us-east-1'),
  AWS_BUCKET_REGION: z.string().optional(),
  BUCKET_ENDPOINT: z.string().optional(),
  SPACES_BUCKET: z.string().optional(),
  BUCKET_NAME: z.string().optional(),

  // API Tokens
  GITHUB_TOKEN: z.string().optional(),
  INTERCOM_ACCESS_TOKEN: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  STACKOVERFLOW_API_KEY: z.string().optional(),
});

// Batch configuration schema
export const batchConfigSchema = z.object({
  defaultBucket: z.string(),
  documents: z.array(z.object({
    file: z.string(),
    bucket: z.string().optional(),
  })).optional(),
  webPages: z.array(z.object({
    url: z.string().url(),
    selector: z.string().default('body'),
    selectorType: z.enum(['css', 'id', 'class', 'tag']).default('css'),
    bucket: z.string().optional(),
  })).optional(),
  linkExtraction: z.array(z.object({
    url: z.string().url(),
    selector: z.string().default('body'),
    selectorType: z.enum(['css', 'id', 'class', 'tag']).default('css'),
    outputFile: z.string(),
    bucket: z.string().optional(),
    processDocs: z.object({
      selector: z.string().default('body'),
      selectorType: z.enum(['css', 'id', 'class', 'tag']).default('css'),
      bucket: z.string().optional(),
    }).optional(),
  })).optional(),
  sitemaps: z.array(z.object({
    source: z.string(),
    outputFile: z.string(),
    bucket: z.string().optional(),
    processDocs: z.object({
      selector: z.string().default('body'),
      selectorType: z.enum(['css', 'id', 'class', 'tag']).default('css'),
      bucket: z.string().optional(),
    }).optional(),
  })).optional(),
  github: z.array(z.object({
    owner: z.string(),
    repo: z.string(),
    bucket: z.string().optional(),
    outputFile: z.string().optional(),
  })).optional(),
  intercom: z.array(z.object({
    bucket: z.string().optional(),
    outputFile: z.string().optional(),
  })).optional(),
  reddit: z.array(z.object({
    query: z.string(),
    bucket: z.string().optional(),
    outputFile: z.string().optional(),
  })).optional(),
  stackoverflow: z.array(z.object({
    searchTerm: z.string(),
    bucket: z.string().optional(),
    outputFile: z.string().optional(),
  })).optional(),
  rss: z.array(z.object({
    feedUrl: z.string().url(),
    bucket: z.string().optional(),
    outputFile: z.string().optional(),
  })).optional(),
});

// Validate environment variables
export const env = envSchema.parse(process.env);

// Helper to get bucket name with fallback
export const getBucketName = (specifiedBucket) => {
  return specifiedBucket || env.SPACES_BUCKET || env.BUCKET_NAME || 'default-bucket';
};

// Validate batch configuration
export const validateBatchConfig = (config) => {
  return batchConfigSchema.parse(config);
};