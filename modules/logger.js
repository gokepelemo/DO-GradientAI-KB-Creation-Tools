import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { uploadBuffer } from './uploadToSpaces.js';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import crypto from 'crypto';
import { URL } from 'url';

const BUCKET_LOG_KEY = '.kbcreationtools/log';
const LOCAL_LOG_FILE = 'log';
const LOCAL_LOG_DIR = join(homedir(), '.kbcreationtools');

// Hash length for random operation IDs
const RANDOM_HASH_LENGTH = 8;

// Hash length for upload path suffix
const UPLOAD_HASH_LENGTH = 6;

// Command session tracking
let currentCommandSession = null;

/**
 * Generate a 6-character hash for upload paths
 */
function generateUploadHash() {
  return crypto.randomBytes(UPLOAD_HASH_LENGTH).toString('hex').substring(0, UPLOAD_HASH_LENGTH);
}

/**
 * Start a new command logging session
 */
function startCommandSession(operationDetails) {
  const operationId = generateOperationId(operationDetails);
  const uploadHash = generateUploadHash();
  currentCommandSession = {
    operationDetails: {
      ...operationDetails,
      operationId,
      uploadHash
    },
    operationId,
    uploadHash,
    uploads: [],
    totalSizeBytes: 0,
    startTime: new Date().toISOString()
  };
}

/**
 * Record a successful upload in the current command session
 */
function recordSuccessfulUpload(fileName, sizeBytes, metadata = {}) {
  if (currentCommandSession) {
    currentCommandSession.uploads.push({
      fileName,
      sizeBytes,
      ...metadata
    });
    currentCommandSession.totalSizeBytes += sizeBytes;
  }
}

/**
 * Get the current operation ID if a session is active
 */
function getCurrentOperationId() {
  return currentCommandSession?.operationId || null;
}

/**
 * Get the current upload hash if a session is active
 */
function getCurrentUploadHash() {
  return currentCommandSession?.uploadHash || null;
}

/**
 * End the current command session and log the aggregated results
 */
async function endCommandSession(bucketName) {
  if (currentCommandSession) {
    const { operationDetails, uploads, totalSizeBytes, uploadHash } = currentCommandSession;

    await logOperation({
      ...operationDetails,
      uploadHash,
      documentsProcessed: uploads.map(u => u.fileName),
      totalSizeBytes
    }, bucketName);
  }

  currentCommandSession = null;
}

/**
 * End the current command session with failure and log the error
 */
async function endCommandSessionWithFailure(bucketName, error) {
  if (currentCommandSession) {
    const { operationDetails, uploads, totalSizeBytes, uploadHash } = currentCommandSession;

    await logFailedOperation({
      ...operationDetails,
      uploadHash,
      documentsProcessed: uploads.map(u => u.fileName),
      totalSizeBytes,
      error: error.message || error.toString()
    }, bucketName);
  }

  currentCommandSession = null;
}

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
 * Generate an identifier for the KB creation operation based on priority:
 * 1. Domain name without TLD, CNAME, or sub-path
 * 2. Document name
 * 3. Output file name without extension
 * 4. Random base64 hash of upload details
 */
function generateOperationId(operationDetails) {
  const { url, documentName, outputFileName, sourceType, additionalData } = operationDetails;

  // Priority 1: Domain name without TLD, CNAME, or sub-path
  if (url) {
    try {
      const urlObj = new URL(url);
      const domainParts = urlObj.hostname.split('.');
      if (domainParts.length >= 2) {
        return domainParts[domainParts.length - 2]; // Get domain without TLD
      }
    } catch (e) {
      // Invalid URL, continue to next priority
    }
    
    // If no domain found, try CNAME or sub-path
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        return pathParts[0]; // First path segment
      }
    } catch (e) {
      // Invalid URL, continue
    }
  }

  // Priority 2: Document name
  if (documentName) {
    return documentName.replace(/\.[^/.]+$/, ''); // Remove extension
  }

  // Priority 3: Output file name without extension
  if (outputFileName) {
    return outputFileName.replace(/\.[^/.]+$/, ''); // Remove extension
  }

  // Priority 4: Random base64 hash
  const hashData = JSON.stringify({
    ...operationDetails,
    timestamp: Date.now(),
    random: Math.random()
  });
  return crypto.createHash('sha256').update(hashData).digest('base64').substring(0, RANDOM_HASH_LENGTH);
}

/**
 * Ensure local log directory exists
 */
async function ensureLocalLogDir() {
  try {
    await fs.mkdir(LOCAL_LOG_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read existing log from bucket if it exists
 */
async function readBucketLog(bucketName) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: BUCKET_LOG_KEY,
    });

    const response = await s3Client.send(command);
    const logData = await response.Body.transformToString();
    return logData;
  } catch (error) {
    // File doesn't exist or other error, return empty string
    return '';
  }
}

/**
 * Write log to bucket (append if exists)
 */
async function writeBucketLog(bucketName, logContent) {
  try {
    const existingLog = await readBucketLog(bucketName);
    const fullLog = existingLog + logContent;

    await uploadBuffer(bucketName, Buffer.from(fullLog, 'utf-8'), BUCKET_LOG_KEY);
  } catch (error) {
    console.warn('Failed to write bucket log:', error.message);
  }
}

/**
 * Write log to local file
 */
async function writeLocalLog(logContent) {
  try {
    await ensureLocalLogDir();
    const localLogPath = join(LOCAL_LOG_DIR, LOCAL_LOG_FILE);

    let existingLog = '';
    try {
      existingLog = await fs.readFile(localLogPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, that's fine
    }

    const fullLog = existingLog + logContent;
    await fs.writeFile(localLogPath, fullLog, 'utf-8');
  } catch (error) {
    console.warn('Failed to write local log:', error.message);
  }
}

/**
 * Log a KB creation operation
 */
async function logOperation(operationDetails, bucketName) {
  const {
    operationId,
    uploadHash,
    sourceType,
    documentsProcessed = [],
    totalSizeBytes = 0,
    customId
  } = operationDetails;

  const finalOperationId = operationId || customId || generateOperationId(operationDetails);

  const logEntry = {
    timestamp: new Date().toISOString(),
    username: process.env.USER || process.env.USERNAME || 'unknown',
    operationId: finalOperationId,
    uploadHash,
    sourceType,
    documentsProcessed: documentsProcessed.length,
    documentDetails: documentsProcessed,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2)
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to both local and bucket logs
  await Promise.all([
    writeLocalLog(logLine),
    writeBucketLog(bucketName, logLine)
  ]);

  return finalOperationId;
}

/**
 * Log a failed KB creation operation
 */
async function logFailedOperation(operationDetails, bucketName) {
  const {
    operationId,
    uploadHash,
    sourceType,
    documentsProcessed = [],
    totalSizeBytes = 0,
    error,
    customId
  } = operationDetails;

  const finalOperationId = operationId || customId || generateOperationId(operationDetails);

  const logEntry = {
    timestamp: new Date().toISOString(),
    username: process.env.USER || process.env.USERNAME || 'unknown',
    operationId: finalOperationId,
    uploadHash,
    sourceType,
    status: 'failed',
    error: error,
    documentsProcessed: documentsProcessed.length,
    documentDetails: documentsProcessed,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2)
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to both local and bucket logs
  await Promise.all([
    writeLocalLog(logLine),
    writeBucketLog(bucketName, logLine)
  ]);

  return finalOperationId;
}

export {
  logOperation,
  logFailedOperation,
  generateOperationId,
  generateUploadHash,
  startCommandSession,
  recordSuccessfulUpload,
  endCommandSession,
  endCommandSessionWithFailure,
  getCurrentOperationId,
  getCurrentUploadHash,
  LOCAL_LOG_DIR,
  BUCKET_LOG_KEY,
  LOCAL_LOG_FILE
};