import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-provider-env';
import { config } from './config.js';

const s3Client = new S3Client({
  endpoint: config.SPACES_ENDPOINT,
  region: config.SPACES_REGION,
  credentials: fromEnv(),
});

export async function listKBContents() {
  const command = new ListObjectsV2Command({
    Bucket: config.SPACES_BUCKET,
  });

  try {
    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error('Error listing KB contents:', error.message);
    return [];
  }
}

export async function searchKB(query) {
  const contents = await listKBContents();
  return contents.filter(obj => obj.Key.includes(query));
}

export async function getKBDocument(key) {
  const command = new GetObjectCommand({
    Bucket: config.SPACES_BUCKET,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    return await response.Body.transformToString();
  } catch (error) {
    console.error(`Error getting document ${key}:`, error.message);
    return null;
  }
}