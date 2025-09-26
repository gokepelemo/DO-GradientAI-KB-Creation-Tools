import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { promises as fs } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const spacesClient = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT,
  region: process.env.AWS_BUCKET_REGION || process.env.SPACES_REGION || "us-east-1",
  credentials: fromEnv(),
});

// Function to upload a buffer to DigitalOcean Spaces
async function uploadBuffer(bucketName, buffer, key) {
  console.log(chalk.blue(`Uploading ${key} to Spaces bucket:`, bucketName));
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
    };

    const command = new PutObjectCommand(params);
    const data = await spacesClient.send(command);
    console.log(chalk.green("File uploaded successfully:", key));
    return data;
  } catch (error) {
    console.error(chalk.red("Error uploading file:", key, error));
    throw error;
  }
}

// Function to upload a file from the local filesystem to DigitalOcean Spaces
async function uploadFile(bucketName, filePath, key) {
  console.log(chalk.blue("Uploading file to Spaces bucket:"), bucketName);
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
