import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { promises as fs } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

// Configure the AWS SDK with your DigitalOcean Spaces credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  // Normalize environment variable names for S3-compatible APIs
  if (
    process.env.SPACES_ACCESS_KEY_ID &&
    process.env.SPACES_SECRET_ACCESS_KEY &&
    process.env.BUCKET_ENDPOINT
  ) {
    process.env.AWS_ACCESS_KEY_ID =
      process.env.AWS_ACCESS_KEY_ID || process.env.SPACES_ACCESS_KEY_ID || null;
    process.env.AWS_SECRET_ACCESS_KEY =
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.SPACES_SECRET_ACCESS_KEY ||
      null;
  }
  console.error(chalk.red("Spaces credentials are not set in the environment."));
  process.exit(1);
}

const spacesClient = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT,
  region: process.env.AWS_BUCKET_REGION || process.env.SPACES_REGION || "us-east-1",
  credentials: fromEnv(),
});

// Function to upload a buffer to DigitalOcean Spaces
async function uploadBuffer(bucketName, buffer, key) {
  console.log(chalk.blue("Uploading buffer to Spaces bucket:", bucketName));
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
    process.exit(1);
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
    process.exit(1);
  }
}

export { uploadBuffer, uploadFile };
