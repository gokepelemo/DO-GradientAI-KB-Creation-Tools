import chalk from 'chalk';

/**
 * Standardized error handling for CLI operations
 */
export class CLIError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
    this.name = 'CLIError';
  }
}

/**
 * Handle errors consistently across all CLI commands
 */
export const handleError = (error, context = '') => {
  const prefix = context ? `[${context}] ` : '';
  console.error(chalk.red(`${prefix}Error:`), error.message);

  if (error.code && typeof error.code === 'number') {
    process.exit(error.code);
  } else {
    process.exit(1);
  }
};

/**
 * Wrap async operations with consistent error handling
 */
export const withErrorHandling = (fn, context = '') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
    }
  };
};

/**
 * Validate required environment variables
 */
export const validateEnvVars = (requiredVars, context = '') => {
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new CLIError(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please set them in your .env file or environment.`,
      1
    );
  }
};