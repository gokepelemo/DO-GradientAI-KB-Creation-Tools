import fs from 'fs';
import mammoth from 'mammoth';
import { uploadBuffer as uploadToSpaces } from './uploadToSpaces.js';
import ora from 'ora';

export async function processDocument(filePath, bucket, dryRun = false) {
  const ext = filePath.split('.').pop().toLowerCase();
  let content = '';
  let contentType = 'text';

  const processSpinner = ora(`Processing ${filePath}...`).start();

  try {
    switch (ext) {
      case 'pdf':
        const { default: pdfParse } = await import('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        content = data.text;
        break;

      case 'docx':
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value;
        break;

      case 'txt':
      case 'md':
      case 'rst':
        content = fs.readFileSync(filePath, 'utf-8');
        break;

      case 'csv':
      case 'tsv':
        content = fs.readFileSync(filePath, 'utf-8');
        // Add CSV structure information
        content = `File: ${filePath.split('/').pop()}\n\n${content}`;
        break;

      case 'json':
      case 'jsonl':
        content = fs.readFileSync(filePath, 'utf-8');
        // Pretty print JSON for better readability
        try {
          if (ext === 'json') {
            content = JSON.stringify(JSON.parse(content), null, 2);
          }
          // jsonl is already line-delimited, keep as is
        } catch (e) {
          // If parsing fails, keep original content
        }
        content = `File: ${filePath.split('/').pop()}\n\n${content}`;
        break;

      case 'xml':
        content = fs.readFileSync(filePath, 'utf-8');
        content = `File: ${filePath.split('/').pop()}\n\n${content}`;
        break;

      case 'html':
        content = fs.readFileSync(filePath, 'utf-8');
        // Basic HTML tag stripping (could be enhanced with a proper HTML parser)
        content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        break;

      default:
        throw new Error(`Unsupported file type: ${ext}. Supported: pdf, docx, txt, md, rst, csv, tsv, json, jsonl, xml, html`);
    }

    const filename = filePath.split('/').pop().replace(/\.[^/.]+$/, '.md');

    if (dryRun) {
      console.log(`[DRY RUN] Would upload ${filename} to bucket ${bucket}`);
      processSpinner.succeed(`Simulated processing: ${filename}`);
      return { success: true, filename, originalPath: filePath, dryRun: true };
    }

    const uploadSpinner = ora(`Uploading ${filename}...`).start();
    await uploadToSpaces(bucket, Buffer.from(content, 'utf-8'), filename);
    uploadSpinner.succeed(`Uploaded ${filename}`);

    processSpinner.succeed(`Processed and uploaded: ${filename}`);
    return { success: true, filename, originalPath: filePath };
  } catch (error) {
    processSpinner.fail(`Error processing document ${filePath}: ${error.message}`);
    return { success: false, error: error.message, originalPath: filePath };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(arg => arg !== '--dry-run');

  if (filteredArgs.length < 2) {
    console.log('Usage: ./modules/docProcessor.js <file> <bucket> [--dry-run]');
    console.log('Supported file types: pdf, docx, txt, md, rst, csv, tsv, json, jsonl, xml, html');
    process.exit(1);
  }

  const [filePath, bucket] = filteredArgs;

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  processDocument(filePath, bucket, dryRun).then(result => {
    if (result.success) {
      console.log(`✅ Successfully processed: ${result.filename}`);
    } else {
      console.error(`❌ Failed to process: ${result.error}`);
      process.exit(1);
    }
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}