import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use ~/.kbcreationtools directory for .env file
const configDir = path.join(os.homedir(), '.kbcreationtools');
const envPath = path.join(configDir, '.env');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Load existing .env file if it exists
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Configuration schema with CLI flag mappings
const CONFIG_SCHEMA = {
  // GitHub
  githubToken: {
    env: 'GITHUB_TOKEN',
    flag: '--github-token <token>',
    description: 'GitHub Personal Access Token (with repo access)',
    required: ['github']
  },

  // Intercom
  intercomToken: {
    env: 'INTERCOM_ACCESS_TOKEN',
    flag: '--intercom-token <token>',
    description: 'Intercom API Access Token',
    required: ['intercom']
  },

  // Reddit
  redditClientId: {
    env: 'REDDIT_CLIENT_ID',
    flag: '--reddit-client-id <id>',
    description: 'Reddit API Client ID',
    required: ['reddit']
  },
  redditClientSecret: {
    env: 'REDDIT_CLIENT_SECRET',
    flag: '--reddit-client-secret <secret>',
    description: 'Reddit API Client Secret',
    required: ['reddit']
  },

  // Stack Overflow
  stackoverflowKey: {
    env: 'STACKOVERFLOW_API_KEY',
    flag: '--stackoverflow-key <key>',
    description: 'Stack Overflow API Key (optional)',
    required: [] // Optional
  },

  // Storage/Bucket
  bucketName: {
    env: 'DO_SPACES_BUCKET',
    flag: '--bucket <name>',
    description: 'DigitalOcean Spaces Bucket Name',
    required: [] // Required when uploading
  },
  bucketEndpoint: {
    env: 'BUCKET_ENDPOINT',
    flag: '--bucket-endpoint <url>',
    description: 'Spaces/S3 Endpoint URL',
    required: [] // Required when uploading
  },
  bucketRegion: {
    env: 'AWS_BUCKET_REGION',
    flag: '--bucket-region <region>',
    description: 'AWS Region (e.g., us-east-1)',
    fallbackEnv: 'SPACES_REGION',
    required: [] // Required when uploading
  },

  // GradientAI
  gradientaiToken: {
    env: 'DIGITALOCEAN_ACCESS_TOKEN',
    flag: '--gradientai-token <token>',
    description: 'DigitalOcean Access Token for GradientAI',
    required: [] // Required when creating indexing jobs
  },
  knowledgeBaseUuid: {
    env: 'GRADIENTAI_KNOWLEDGE_BASE_UUID',
    flag: '--knowledge-base-uuid <uuid>',
    description: 'GradientAI Knowledge Base UUID for indexing',
    required: [] // Required when creating indexing jobs
  },
  dataSourceUuids: {
    env: 'GRADIENTAI_DATA_SOURCE_UUIDS',
    flag: '--data-source-uuids <uuids>',
    description: 'GradientAI Data Source UUIDs (comma-separated) for indexing',
    required: [] // Optional for indexing jobs
  },
  autoIndex: {
    env: 'GRADIENTAI_AUTO_INDEX',
    flag: '--auto-index',
    description: 'Automatically create indexing job after successful upload',
    required: [] // Optional flag
  }
};

// Define required environment variables for each command
const COMMAND_REQUIREMENTS = {
  github: ['githubToken'],
  intercom: ['intercomToken'],
  reddit: ['redditClientId', 'redditClientSecret'],
  stackoverflow: [], // API key is optional
  default: [], // Default behavior doesn't require specific config
};

// Optional but commonly needed for uploads
const COMMON_REQUIREMENTS = {
  bucket: ['DO_SPACES_BUCKET'],
  spaces: ['BUCKET_ENDPOINT', 'AWS_BUCKET_REGION'],
};

// Get configuration value with priority: CLI flags > Environment variables > .env file
function getConfigValue(key, cliValue, envVar, fallbackEnvVar = null) {
  // Priority 1: CLI flag
  if (cliValue !== undefined && cliValue !== null) {
    return cliValue;
  }

  // Priority 2: Environment variable
  if (process.env[envVar]) {
    return process.env[envVar];
  }

  // Priority 3: Fallback environment variable
  if (fallbackEnvVar && process.env[fallbackEnvVar]) {
    return process.env[fallbackEnvVar];
  }

  // Priority 4: .env file (already loaded by dotenv)
  if (process.env[envVar]) {
    return process.env[envVar];
  }

  if (fallbackEnvVar && process.env[fallbackEnvVar]) {
    return process.env[fallbackEnvVar];
  }

  return null;
}

// Get all configuration values for a command
function getCommandConfig(command, cliOptions = {}) {
  const config = {};
  const requirements = COMMAND_REQUIREMENTS[command] || COMMAND_REQUIREMENTS.default;

  // Get required config values
  for (const req of requirements) {
    const schema = CONFIG_SCHEMA[req];
    if (schema) {
      const value = getConfigValue(req, cliOptions[req], schema.env, schema.fallbackEnv);
      config[schema.env] = value;
    }
  }

  // Get common config values (bucket, etc.)
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (!requirements.includes(key)) {
      const value = getConfigValue(key, cliOptions[key], schema.env, schema.fallbackEnv);
      if (value !== null) {
        config[schema.env] = value;
      }
    }
  }

  return config;
}

// Check if all required environment variables are available
function hasRequiredEnvVars(command, cliOptions = {}) {
  const config = getCommandConfig(command, cliOptions);
  const requirements = COMMAND_REQUIREMENTS[command] || COMMAND_REQUIREMENTS.default;

  for (const req of requirements) {
    const schema = CONFIG_SCHEMA[req];
    if (schema && !config[schema.env]) {
      return false;
    }
  }

  return true;
}

// Prompt for missing environment variables
async function promptForMissingEnvVars(command, cliOptions = {}) {
  const config = getCommandConfig(command, cliOptions);
  const requirements = COMMAND_REQUIREMENTS[command] || COMMAND_REQUIREMENTS.default;
  const missing = [];

  for (const req of requirements) {
    const schema = CONFIG_SCHEMA[req];
    if (schema && !config[schema.env]) {
      missing.push({
        key: req,
        env: schema.env,
        description: schema.description,
        type: req.includes('secret') || req.includes('token') ? 'password' : 'input'
      });
    }
  }

  if (missing.length === 0) {
    return {};
  }

  console.log(`\nMissing required configuration for '${command}' command:`);
  const questions = missing.map(item => ({
    type: item.type,
    name: item.key,
    message: item.description,
    validate: (input) => input.trim() !== '' || 'This field is required'
  }));

  const answers = await inquirer.prompt(questions);

  // Convert answers to environment variable format
  const envVars = {};
  for (const [key, value] of Object.entries(answers)) {
    const schema = CONFIG_SCHEMA[key];
    if (schema) {
      envVars[schema.env] = value;
    }
  }

  return envVars;
}

// Save environment variables to .env file
function saveEnvVars(envVars) {
  let envContent = '';

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add new variables
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  }

  // Write back to .env file
  fs.writeFileSync(envPath, envContent.trim() + '\n');
}

// Main function to ensure environment variables are available
export async function ensureEnvVars(command, cliOptions = {}) {
  // Check if we have all required variables
  if (hasRequiredEnvVars(command, cliOptions)) {
    return getCommandConfig(command, cliOptions);
  }

  // Prompt for missing variables
  const promptedVars = await promptForMissingEnvVars(command, cliOptions);

  // Save to .env file for future use
  if (Object.keys(promptedVars).length > 0) {
    saveEnvVars(promptedVars);
    console.log('Configuration saved to .env file for future use.');
  }

  // Return complete configuration
  return { ...getCommandConfig(command, cliOptions), ...promptedVars };
}

// Get CLI flag definitions for a command
export function getCommandFlags(command) {
  const flags = [];
  const requirements = COMMAND_REQUIREMENTS[command] || COMMAND_REQUIREMENTS.default;

  // Add required flags
  for (const req of requirements) {
    const schema = CONFIG_SCHEMA[req];
    if (schema) {
      flags.push({
        flag: schema.flag,
        description: schema.description,
        option: req
      });
    }
  }

  // Add common flags
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (!requirements.includes(key)) {
      flags.push({
        flag: schema.flag,
        description: schema.description,
        option: key
      });
    }
  }

  return flags;
}

// Legacy function for backward compatibility
export async function ensureEnvVarsLegacy(command) {
  return ensureEnvVars(command, {});
}