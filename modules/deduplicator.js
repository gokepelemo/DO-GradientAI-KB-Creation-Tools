import { compareTwoStrings } from 'string-similarity';
import { uploadToSpaces } from './uploadToSpaces.js';
import ora from 'ora';

export async function deduplicateAndUpload(docs, threshold = 0.8) {
  const dedupeSpinner = ora('Deduplicating documents...').start();
  const uniqueDocs = [];
  const seen = new Set();

  for (const doc of docs) {
    let isDuplicate = false;
    for (const unique of uniqueDocs) {
      const similarity = compareTwoStrings(doc.content, unique.content);
      if (similarity > threshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      uniqueDocs.push(doc);
    }
  }
  dedupeSpinner.succeed(`Deduplicated to ${uniqueDocs.length} unique documents`);

  const uploadSpinner = ora('Uploading unique documents...').start();
  for (const doc of uniqueDocs) {
    await uploadToSpaces(doc.filename, doc.content);
  }
  uploadSpinner.succeed(`Uploaded ${uniqueDocs.length} documents`);
}