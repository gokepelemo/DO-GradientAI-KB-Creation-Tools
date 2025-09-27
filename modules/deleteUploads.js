import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { LOCAL_LOG_DIR, LOCAL_LOG_FILE, BUCKET_LOG_KEY } from './logger.js';

// Configure S3 client for both AWS S3 and DigitalOcean Spaces
const s3ClientConfig = {
  region: process.env.AWS_BUCKET_REGION || process.env.SPACES_REGION || "us-east-1",
  credentials: fromEnv(),
};

// Only set endpoint for DigitalOcean Spaces or custom S3 endpoints
if (process.env.BUCKET_ENDPOINT) {
  s3ClientConfig.endpoint = process.env.BUCKET_ENDPOINT;
}

const s3Client = new S3Client(s3ClientConfig);

/**
 * Read and parse local log file
 */
async function readLocalLog() {
  try {
    const logPath = join(LOCAL_LOG_DIR, LOCAL_LOG_FILE);
    const logContent = await fs.readFile(logPath, 'utf-8');
    return logContent.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  } catch (error) {
    throw new Error(`Failed to read local log: ${error.message}`);
  }
}

/**
 * Read and parse bucket log file
 */
async function readBucketLog(bucketName) {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: BUCKET_LOG_KEY,
    });

    const response = await s3Client.send(command);
    const logData = await response.Body.transformToString();
    if (!logData.trim()) return [];
    return logData.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  } catch (error) {
    return [];
  }
}

/**
 * Find log entry by operation ID (searches both bucket and local logs)
 */
async function findLogEntryByOperationId(operationId, bucketName) {
  // First try bucket log
  let logEntries = await readBucketLog(bucketName);
  let logEntry = logEntries.find(entry => entry.operationId === operationId);

  // If not found in bucket log, try local log
  if (!logEntry) {
    logEntries = await readLocalLog();
    logEntry = logEntries.find(entry => entry.operationId === operationId);
  }

  return logEntry;
}

/**
 * List all objects in a bucket with a specific prefix
 */
async function listObjectsWithPrefix(bucketName, prefix) {
  const objects = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });

    const response = await s3Client.send(command);
    if (response.Contents) {
      objects.push(...response.Contents.map(obj => obj.Key));
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/**
 * Delete objects from bucket
 */
async function deleteObjects(bucketName, objectKeys) {
  if (objectKeys.length === 0) {
    return;
  }

  // Delete in batches of 1000 (AWS S3 limit)
  const batches = [];
  for (let i = 0; i < objectKeys.length; i += 1000) {
    batches.push(objectKeys.slice(i, i + 1000));
  }

  for (const batch of batches) {
    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: batch.map(key => ({ Key: key }))
      }
    };

    const command = new DeleteObjectsCommand(deleteParams);
    await s3Client.send(command);
  }
}

/**
 * Delete all uploads from a specific operation or operation/hash combination
 */
export async function deleteOperationUploads(operationId, bucketName) {
  const spinner = ora(`Finding operation ${operationId}...`).start();

  try {
    // Parse operationId to separate operation and hash if present
    let actualOperationId = operationId;
    let targetHash = null;

    if (operationId.includes('\\')) {
      const parts = operationId.split('\\');
      actualOperationId = parts[0];
      targetHash = parts[1];
    }

    // Find the log entry
    const logEntry = await findLogEntryByOperationId(actualOperationId, bucketName);
    if (!logEntry) {
      spinner.fail(`Operation ${actualOperationId} not found in logs`);
      return;
    }

    if (!logEntry.uploadHash) {
      spinner.fail(`Operation ${actualOperationId} has no upload hash (created before hash feature)`);
      return;
    }

    // Use specific hash if provided, otherwise use the hash from the log entry
    const hashToDelete = targetHash || logEntry.uploadHash;

    spinner.text = `Found operation ${actualOperationId} with ${logEntry.documentsProcessed} documents`;

    // Construct the prefix for this operation/hash combination
    const prefix = `${logEntry.operationId}/${hashToDelete}/`;

    // List all objects with this prefix
    const objectsToDelete = await listObjectsWithPrefix(bucketName, prefix);

    if (objectsToDelete.length === 0) {
      spinner.warn(`No objects found for operation ${actualOperationId}${targetHash ? `\\${targetHash}` : ''}`);
      return;
    }

    spinner.text = `Deleting ${objectsToDelete.length} objects...`;

    // Delete the objects
    await deleteObjects(bucketName, objectsToDelete);

    spinner.succeed(`Successfully deleted ${objectsToDelete.length} objects from operation ${actualOperationId}${targetHash ? `\\${targetHash}` : ''}`);

    // Log the deletion
    console.log(chalk.blue(`Deleted objects:`));
    objectsToDelete.forEach(key => console.log(chalk.gray(`  - ${key}`)));

  } catch (error) {
    spinner.fail(`Failed to delete uploads: ${error.message}`);
    throw error;
  }
}

/**
 * List all operations from both bucket and local logs
 */
export async function listOperations(bucketName = null) {
  try {
    let allEntries = [];

    // Try to get entries from bucket log first
    if (bucketName) {
      const bucketEntries = await readBucketLog(bucketName);
      allEntries = allEntries.concat(bucketEntries);
    }

    // Get entries from local log
    const localEntries = await readLocalLog();
    allEntries = allEntries.concat(localEntries);

    // Remove duplicates based on operationId + uploadHash combination
    const uniqueEntries = allEntries.filter((entry, index, self) =>
      index === self.findIndex(e =>
        e.operationId === entry.operationId && e.uploadHash === entry.uploadHash
      )
    );

    if (uniqueEntries.length === 0) {
      console.log(chalk.yellow('No operations found in logs'));
      return [];
    }

    console.log(chalk.blue('Recent operations:'));
    console.log(chalk.gray('─'.repeat(80)));

    // Sort by timestamp, most recent first
    uniqueEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    uniqueEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleString();
      const hasHash = entry.uploadHash ? chalk.green('✓') : chalk.red('✗');
      const source = bucketName && allEntries.includes(entry) && !localEntries.includes(entry) ? ' (bucket)' : '';
      console.log(`${chalk.cyan(entry.operationId)}${entry.uploadHash ? `\\${entry.uploadHash}` : ''} ${hasHash} ${chalk.gray(date)}${source}`);
      console.log(`  ${entry.sourceType} • ${entry.documentsProcessed} docs • ${entry.totalSizeMB} MB`);
      console.log(chalk.gray('─'.repeat(80)));
    });

    return uniqueEntries;

  } catch (error) {
    console.error(chalk.red(`Failed to list operations: ${error.message}`));
    return [];
  }
}

/**
 * Prompt user to select an operation for deletion
 */
export async function promptForOperationSelection(bucketName = null) {
  const inquirer = (await import('inquirer')).default;

  const operations = await listOperations(bucketName);

  if (operations.length === 0) {
    console.log(chalk.yellow('No operations available for deletion'));
    return null;
  }

  const choices = operations.map(entry => ({
    name: `${entry.operationId}${entry.uploadHash ? `\\${entry.uploadHash}` : ''} - ${entry.sourceType} (${entry.documentsProcessed} docs, ${entry.totalSizeMB} MB)`,
    value: entry.uploadHash ? `${entry.operationId}\\${entry.uploadHash}` : entry.operationId,
    short: entry.operationId
  }));

  const { selectedOperation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedOperation',
      message: 'Select an operation to delete:',
      choices: choices
    }
  ]);

  return selectedOperation;
}