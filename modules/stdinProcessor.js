import fs from 'fs';
import path from 'path';
import { uploadBuffer } from './uploadToSpaces.js';
import { getBucketName } from './validation.js';
import ora from 'ora';

/**
 * Process stdin input, create output file, and upload to Spaces
 * @param {string} outputFile - Output file path
 * @param {string} bucket - Target bucket (optional, uses env default)
 * @param {boolean} dryRun - Whether to simulate operations
 */
export async function processStdinUpload(outputFile, bucket, dryRun = false) {
  const spinner = ora('Reading from stdin...').start();

  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', async () => {
      try {
        if (!data.trim()) {
          spinner.fail('No data received from stdin');
          reject(new Error('No data received from stdin'));
          return;
        }

        spinner.text = `Received ${data.length} characters, processing...`;

        // Determine bucket name
        const targetBucket = bucket || getBucketName();

        if (!targetBucket) {
          spinner.fail('No bucket specified. Set BUCKET_NAME environment variable or provide --bucket');
          reject(new Error('No bucket specified'));
          return;
        }

        // Resolve output file path
        const outputPath = path.resolve(outputFile);
        const fileName = path.basename(outputFile);

        if (dryRun) {
          spinner.succeed(`[DRY RUN] Would save ${data.length} characters to ${outputPath} and upload to ${targetBucket}`);
          resolve({
            success: true,
            dataLength: data.length,
            outputFile: outputPath,
            bucket: targetBucket,
            fileName
          });
          return;
        }

        // Write to file
        fs.writeFileSync(outputPath, data, 'utf-8');
        spinner.text = `File saved locally, uploading to Spaces...`;

        // Upload to Spaces
        await uploadBuffer(targetBucket, Buffer.from(data, 'utf-8'), fileName);

        spinner.succeed(`Successfully saved to ${outputPath} and uploaded ${fileName} to ${targetBucket}`);

        resolve({
          success: true,
          dataLength: data.length,
          outputFile: outputPath,
          bucket: targetBucket,
          fileName
        });

      } catch (error) {
        spinner.fail(`Failed to process stdin: ${error.message}`);
        reject(error);
      }
    });

    process.stdin.on('error', (error) => {
      spinner.fail(`Error reading from stdin: ${error.message}`);
      reject(error);
    });
  });
}