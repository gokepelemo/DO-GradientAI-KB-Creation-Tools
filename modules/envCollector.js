import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Define required environment variables for each command
const COMMAND_REQUIREMENTS = {
  github: ['GITHUB_TOKEN'],
  intercom: ['INTERCOM_ACCESS_TOKEN'],
  reddit: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
  stackoverflow: ['STACKOVERFLOW_API_KEY'], // Optional but recommended
  default: [], // Default behavior doesn't require specific env vars
};

// Optional but commonly needed for uploads
const COMMON_REQUIREMENTS = {
  bucket: ['DO_SPACES_BUCKET'],
  spaces: ['BUCKET_ENDPOINT', 'AWS_BUCKET_REGION'],
};

/**
 * Check if required environment variables are set for a command
 * @param {string} command - The command name
 * @param {boolean} needsBucket - Whether the command needs bucket configuration
 * @returns {string[]} Array of missing required environment variables
 */
export function getMissingEnvVars(command, needsBucket = false) {
  const required = COMMAND_REQUIREMENTS[command] || [];
  const missing = [];

  // Check command-specific requirements
  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check bucket requirements if needed
  if (needsBucket) {
    for (const envVar of COMMON_REQUIREMENTS.bucket) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
  }

  return missing;
}

/**
 * Prompt user for missing environment variables
 * @param {string[]} missingVars - Array of missing environment variable names
 * @returns {Promise<Object>} Object with variable names as keys and values as values
 */
export async function promptForEnvVars(missingVars) {
  if (missingVars.length === 0) {
    return {};
  }

  console.log('\n🔧 Some required environment variables are missing.');
  console.log('Please provide the following values:\n');

  const questions = missingVars.map(envVar => ({
    type: 'input',
    name: envVar,
    message: `Enter ${getEnvVarDescription(envVar)}:`,
    validate: (input) => input.trim() !== '' || `${envVar} is required`,
    transformer: (input) => input ? '***' : '', // Hide sensitive input
  }));

  const answers = await inquirer.prompt(questions);
  return answers;
}

/**
 * Save environment variables to .env file
 * @param {Object} envVars - Object with variable names as keys and values as values
 */
export function saveEnvVars(envVars) {
  let envContent = '';

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    envContent += '\n';
  }

  // Add new variables
  for (const [key, value] of Object.entries(envVars)) {
    // Only add if not already present
    if (!envContent.includes(`${key}=`)) {
      envContent += `${key}=${value}\n`;
    }
  }

  // Write back to file
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

  // Reload environment variables
  dotenv.config({ path: envPath, override: true });

  console.log(`✅ Environment variables saved to ${envPath}`);
}

/**
 * Main function to ensure required environment variables are available
 * @param {string} command - The command name
 * @param {boolean} needsBucket - Whether the command needs bucket configuration
 * @returns {Promise<boolean>} True if all requirements are met
 */
export async function ensureEnvVars(command, needsBucket = false) {
  const missingVars = getMissingEnvVars(command, needsBucket);

  if (missingVars.length === 0) {
    return true;
  }

  try {
    const envVars = await promptForEnvVars(missingVars);
    saveEnvVars(envVars);
    return true;
  } catch (error) {
    if (error.isTtyError) {
      console.error('❌ Interactive prompts are not supported in this environment');
    } else {
      console.error('❌ Failed to collect environment variables:', error.message);
    }
    return false;
  }
}

/**
 * Get user-friendly description for environment variable
 * @param {string} envVar - Environment variable name
 * @returns {string} Description
 */
function getEnvVarDescription(envVar) {
  const descriptions = {
    GITHUB_TOKEN: 'GitHub Personal Access Token (with repo access)',
    INTERCOM_ACCESS_TOKEN: 'Intercom API Access Token',
    REDDIT_CLIENT_ID: 'Reddit API Client ID',
    REDDIT_CLIENT_SECRET: 'Reddit API Client Secret',
    STACKOVERFLOW_API_KEY: 'Stack Overflow API Key (optional)',
    DO_SPACES_BUCKET: 'DigitalOcean Spaces Bucket Name',
    BUCKET_ENDPOINT: 'Spaces/S3 Endpoint URL',
    AWS_BUCKET_REGION: 'AWS Region (e.g., us-east-1)',
  };

  return descriptions[envVar] || envVar;
}