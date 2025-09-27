import fs from 'fs';
import path from 'path';
import { uploadBuffer } from './uploadToSpaces.js';
import { getBucketName } from './validation.js';
import ora from 'ora';
import { processBatch } from './batchProcessor.js';

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

        // Check if input is a kbcreationtools config file
        let parsedData;
        try {
          parsedData = JSON.parse(data.trim());
          if (parsedData && typeof parsedData === 'object' && typeof parsedData.kbcreationtools === 'string') {
            // This is a kbcreationtools config file, process as batch
            spinner.text = 'Detected kbcreationtools config file, processing as batch...';

            // Create a temporary config file with unique name
            const tempConfigPath = path.join(process.cwd(), `kbcreationtools-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
            fs.writeFileSync(tempConfigPath, data, 'utf-8');

            try {
              // Process the batch configuration
              await processBatch(tempConfigPath, dryRun);

              // Clean up temp file
              fs.unlinkSync(tempConfigPath);

              spinner.succeed('Batch processing completed successfully');
              resolve({
                success: true,
                isBatchConfig: true,
                dataLength: data.length
              });
              return;
            } catch (batchError) {
              // Clean up temp file on error
              if (fs.existsSync(tempConfigPath)) {
                fs.unlinkSync(tempConfigPath);
              }
              throw batchError;
            }
          }
        } catch (parseError) {
          // Not valid JSON or not a kbcreationtools config, continue with normal processing
        }

        // For non-batch configs, we need an output file
        if (!outputFile) {
          spinner.fail('Input is not a valid kbcreationtools batch configuration and no output file specified');
          reject(new Error('Input is not a valid kbcreationtools batch configuration and no output file specified'));
          return;
        }

        // Normal stdin processing continues...

        if (!bucket) {
          spinner.fail('No bucket specified. Set BUCKET_NAME environment variable or provide --bucket');
          reject(new Error('No bucket specified'));
          return;
        }

        // Resolve output file path
        const outputPath = path.resolve(outputFile);
        const fileName = path.basename(outputFile);

        if (dryRun) {
          spinner.succeed(`[DRY RUN] Will save ${data.length} characters to ${outputPath} and upload to ${bucket}`);
          resolve({
            success: true,
            dataLength: data.length,
            outputFile: outputPath,
            bucket: bucket,
            fileName
          });
          return;
        }

        // Write to file
        fs.writeFileSync(outputPath, data, 'utf-8');
        spinner.text = `File saved locally, uploading to Spaces...`;

        // Upload to Spaces
        await uploadBuffer(bucket, Buffer.from(data, 'utf-8'), fileName);

        spinner.succeed(`Successfully saved to ${outputPath} and uploaded ${fileName} to ${bucket}`);

        resolve({
          success: true,
          dataLength: data.length,
          outputFile: outputPath,
          bucket: bucket,
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