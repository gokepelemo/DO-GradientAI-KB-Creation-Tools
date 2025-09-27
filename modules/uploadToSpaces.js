import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { promises as fs } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import dotenv from "dotenv";
import { recordSuccessfulUpload, getCurrentOperationId, getCurrentUploadHash, BUCKET_LOG_KEY } from "./logger.js";

dotenv.config();

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

// Function to upload a buffer to S3-compatible storage (AWS S3 or DigitalOcean Spaces)
async function uploadBuffer(bucketName, buffer, key) {
  // Use operationId and uploadHash as directory prefix if session is active and key is not the log file
  const currentOperationId = getCurrentOperationId();
  const currentUploadHash = getCurrentUploadHash();
  const shouldUseDirectory = currentOperationId && currentUploadHash && key !== BUCKET_LOG_KEY;
  const fullKey = shouldUseDirectory ? `${currentOperationId}/${currentUploadHash}/${key}` : key;
  
  const storageType = process.env.BUCKET_ENDPOINT ? 'Spaces' : 'S3';
  console.log(chalk.blue(`Uploading ${fullKey} to ${storageType} bucket:`, bucketName));
  try {
    const params = {
      Bucket: bucketName,
      Key: fullKey,
      Body: buffer,
    };

    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    console.log(chalk.green("File uploaded successfully:", fullKey));

    // Record successful upload (only for non-log files)
    if (shouldUseDirectory) {
      recordSuccessfulUpload(key, buffer.length);
    }

    return data;
  } catch (error) {
    console.error(chalk.red("Error uploading file:", fullKey, error));
    throw error;
  }
}

// Function to upload a file from the local filesystem to S3-compatible storage
async function uploadFile(bucketName, filePath, key) {
  const storageType = process.env.BUCKET_ENDPOINT ? 'Spaces' : 'S3';
  console.log(chalk.blue("Uploading file to", storageType, "bucket:"), bucketName);
  try {
    const absolutePath = resolve(filePath);
    const fileBuffer = await fs.readFile(absolutePath);
    return await uploadBuffer(bucketName, fileBuffer, key);
  } catch (error) {
    console.error(chalk.red("Error uploading file:", error));
    throw error;
  }
}

// Function to upload a string content to DigitalOcean Spaces
async function uploadToSpaces(key, content) {
  const bucketName = process.env.SPACES_BUCKET;
  const buffer = Buffer.from(content, 'utf-8');
  return await uploadBuffer(bucketName, buffer, key);
}

export { uploadBuffer, uploadFile, uploadToSpaces };
