import fs from 'fs';
import path from 'path';
import os from 'os';
import { createPage, navigateWithTimeout, checkUrlExists } from '../modules/browser.js';
import { processDoc } from '../modules/processDoc.js';
import { uploadBuffer } from '../modules/uploadToSpaces.js';
import { getBucketName } from '../modules/validation.js';
import { config } from '../modules/config.js';
import ora from 'ora';
import TurndownService from 'turndown';

/**
 * Process LLMs.txt files with different behaviors based on what exists
 * @param {string} baseUrl - Base URL of the site (e.g., https://example.com)
 * @param {string} outputFile - Output file path (determines format: .md or .txt)
 * @param {string} bucket - Target bucket for uploads
 * @param {boolean} dryRun - Whether to simulate operations
 */
export async function processLLMsTxt(baseUrl, outputFile, bucket, dryRun = false) {
  const spinner = ora('Processing LLMs content...').start();

  try {
    // Normalize base URL
    const normalizedUrl = baseUrl.replace(/\/$/, '');
    
    // Extract domain for LLMs files (they should be at the root)
    const urlObj = new URL(normalizedUrl);
    const domain = `${urlObj.protocol}//${urlObj.hostname}`;

    // Check for llms-full.txt first
    const llmsFullUrl = `${domain}/llms-full.txt`;
    spinner.text = 'Checking for llms-full.txt...';
    const page = await createPage();
    const llmsFullExists = await checkUrlExists(page, llmsFullUrl, 5000);

    if (llmsFullExists) {
      await navigateWithTimeout(page, llmsFullUrl, 10000);
      const content = await page.evaluate(() => document.body.innerText);
      await page.browser().close();

      // Check if this looks like a valid LLMs-full.txt file
      if (content && content.trim() && content.length > 100 &&
          !content.toLowerCase().includes('404') && !content.toLowerCase().includes('not found')) {
        spinner.text = 'Found llms-full.txt, uploading directly...';
        const finalContent = content.trim();

        if (dryRun) {
          spinner.succeed(`[DRY RUN] Would upload llms-full.txt content (${finalContent.length} chars) to ${bucket}`);
          return { success: true, source: 'llms-full.txt', contentLength: finalContent.length, uploaded: false };
        }

        const outputPath = path.resolve(outputFile);
        fs.writeFileSync(outputPath, finalContent, 'utf-8');
        await uploadBuffer(bucket, Buffer.from(finalContent, 'utf-8'), path.basename(outputFile));
        spinner.succeed(`Uploaded llms-full.txt content to Spaces: ${path.basename(outputFile)}`);
        return { success: true, source: 'llms-full.txt', contentLength: finalContent.length, uploaded: true };
      }
    }
    await page.close();

    // Check for llms.txt
    const llmsUrl = `${domain}/llms.txt`;
    spinner.text = 'Checking for llms.txt...';
    const page2 = await createPage();
    const llmsExists = await checkUrlExists(page2, llmsUrl, 5000);

    if (llmsExists) {
      await navigateWithTimeout(page2, llmsUrl, 10000);
      const content = await page2.evaluate(() => document.body.innerText);
      await page2.browser().close();

      // Check if this looks like a valid LLMs.txt file
      if (content && content.trim() && content.length > 50 &&
          (content.includes('http') || content.split('\n').some(line => line.trim().startsWith('#'))) &&
          !content.toLowerCase().includes('404') && !content.toLowerCase().includes('not found')) {
        spinner.text = 'Found llms.txt, extracting URLs and processing...';
        const urls = parseLLMsTxt(content, normalizedUrl);

        if (urls.length === 0) {
          throw new Error('No URLs found in LLMs.txt file');
        }

        const tempFile = path.join(os.tmpdir(), `llms-urls-${Date.now()}.txt`);
        fs.writeFileSync(tempFile, urls.join('\n'), 'utf-8');

        try {
          const { processUrls } = await import('../sources/processDocs.js');
          await processUrls(tempFile, 'body', 'css', bucket, dryRun);
          spinner.succeed(`Processed ${urls.length} URLs from llms.txt`);
          return { success: true, source: 'llms.txt', urlsProcessed: urls.length, uploaded: !dryRun };
        } finally {
          try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
        }
      }
    }
    await page2.close();

    // Process the provided URL since no LLMs files were found
    spinner.text = 'No LLMs files found, processing provided URL content...';
    const isMarkdown = outputFile.toLowerCase().endsWith('.md');
    const page3 = await createPage();
    await navigateWithTimeout(page3, normalizedUrl);
    const bodyContent = await page3.evaluate(() => document.body.innerText);
    await page3.close();

    if (!bodyContent || !bodyContent.trim()) {
      throw new Error('No content found on the main page');
    }

    let finalContent = bodyContent.trim();

    if (isMarkdown) {
      const turndownService = new TurndownService();
      const htmlPage = await createPage();
      await navigateWithTimeout(htmlPage, normalizedUrl);
      const htmlContent = await htmlPage.evaluate(() => document.body.innerHTML);
      await htmlPage.close();
      finalContent = turndownService.turndown(htmlContent);
    }

    if (dryRun) {
      spinner.succeed(`[DRY RUN] Would process provided URL content (${finalContent.length} chars) and upload to ${bucket}`);
      return { success: true, source: 'provided-url', contentLength: finalContent.length, uploaded: false };
    }

    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, finalContent, 'utf-8');
    await uploadBuffer(bucket, Buffer.from(finalContent, 'utf-8'), path.basename(outputFile));
    spinner.succeed(`Processed provided URL content and uploaded to Spaces: ${path.basename(outputFile)}`);
    return { success: true, source: 'provided-url', contentLength: finalContent.length, uploaded: true };

  } catch (error) {
    spinner.fail(`Failed to process LLMs content: ${error.message}`);
    throw error;
  }
}

/**
 * Parse LLMs.txt content to extract URLs
 * @param {string} content - Raw LLMs.txt content
 * @param {string} baseUrl - Base URL for relative links
 * @returns {string[]} Array of absolute URLs
 */
function parseLLMsTxt(content, baseUrl) {
  const urls = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('http')) {
      urls.push(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    }
  }

  return [...new Set(urls)]; // Remove duplicates
}