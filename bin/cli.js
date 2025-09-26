import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import { processBatch } from '../modules/batchProcessor.js';
import { processDoc } from '../modules/processDoc.js';
import { processUrls } from '../sources/processDocs.js';
import { extractLinks } from '../urls/extractLinks.js';
import { parseSitemap } from '../urls/parseSitemap.js';
import { getIntercomArticles } from '../sources/intercom.js';
import { processRedditPosts } from '../sources/reddit.js';
import { searchStackOverflow } from '../sources/stackoverflow.js';
import { crawlGitHubRepo } from '../sources/githubCrawler.js';
import { processDocument } from '../modules/docProcessor.js';
import { processLLMsTxt } from '../modules/llmsProcessor.js';
import { processStdinUpload } from '../modules/stdinProcessor.js';
import { ensureEnvVars } from '../modules/envCollector.js';

const program = new Command();

program
  .name('kbcreationtools')
  .description('Tools for creating knowledge bases for DigitalOcean GradientAI. Default behavior: process piped stdin to output file.')
  .version('1.1.0')
  .argument('[outputFile]', 'Output file for piped stdin processing (default behavior)')
  .argument('[bucket]', 'Spaces/S3 bucket name (optional, overrides DO_SPACES_BUCKET env var)')
  .action(async (outputFile, bucket, options) => {
    // Default behavior: process piped stdin
    if (outputFile) {
      try {
        const globalOptions = program.opts();
        const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';
        await processStdinUpload(outputFile, targetBucket, globalOptions.dryRun);
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    } else {
      // No arguments provided, show help
      program.help();
    }
  });

// Global options
program
  .option('-d, --dry-run', 'simulate operations without actually uploading')
  .option('-v, --verbose', 'enable verbose logging');

// Extract links command
program
  .command('extractlinks <url> [selector] [selectorType] <outputFile> [bucket]')
  .description('Extract links from a webpage and save to file')
  .action(async (url, selector = 'body', selectorType = 'css', outputFile, bucket, options) => {
    try {
      const globalOptions = program.opts();
      const links = await extractLinks(url, selector, selectorType);
      const content = links.join('\n');
      writeFileSync(outputFile, content, 'utf-8');
      console.log(chalk.green(`Extracted ${links.length} links and saved to ${outputFile}`));

      // Upload to bucket if specified
      if (bucket) {
        const { uploadBuffer } = await import('../modules/uploadToSpaces.js');
        await uploadBuffer(bucket, Buffer.from(content, 'utf-8'), outputFile);
        console.log(chalk.green(`Uploaded to bucket: ${bucket}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process document command
program
  .command('processdoc <url> [selector] [selectorType] [bucket]')
  .description('Process a single webpage and upload to Spaces/S3')
  .action(async (url, selector = 'body', selectorType = 'css', bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('default', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processDoc(url, selector, selectorType, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process URLs from file command
program
  .command('processurls <filePath> [selector] [selectorType] [bucket]')
  .description('Process URLs from a file and upload to Spaces/S3')
  .action(async (filePath, selector = 'body', selectorType = 'css', bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('default', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processUrls(filePath, selector, selectorType, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// GitHub repository crawler command
program
  .command('github <owner> <repo> [bucket]')
  .description('Crawl a GitHub repository and upload documentation')
  .action(async (owner, repo, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('github', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await crawlGitHubRepo(owner, repo, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Intercom articles command
program
  .command('intercom [bucket]')
  .description('Fetch and upload Intercom articles')
  .action(async (bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('intercom', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await getIntercomArticles(targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Reddit posts command
program
  .command('reddit <query> [bucket]')
  .description('Search and process Reddit posts')
  .action(async (query, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('reddit', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processRedditPosts(query, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Stack Overflow search command
program
  .command('stackoverflow <query> [bucket]')
  .description('Search Stack Overflow and upload results')
  .action(async (query, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('stackoverflow', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await searchStackOverflow(query, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Document processor command
program
  .command('docprocessor <filePath> [bucket]')
  .description('Process local document files (PDF, DOCX, etc.)')
  .action(async (filePath, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('default', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processDocument(filePath, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse sitemap command
program
  .command('parsesitemap <url> <outputFile> [bucket]')
  .description('Parse sitemap from URL and extract URLs')
  .action(async (url, outputFile, bucket, options) => {
    try {
      const globalOptions = program.opts();
      // This would need implementation - parseSitemap currently takes content, not URL
      console.log(chalk.yellow('parsesitemap command needs URL-based implementation'));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Batch processing command
program
  .command('batchprocess <configFile>')
  .description('Process multiple sources using a JSON configuration file')
  .action(async (configFile, options) => {
    try {
      const globalOptions = program.opts();
      await processBatch(configFile, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process LLMs.txt command
program
  .command('processllms <url> <outputFile> [bucket]')
  .description('Process LLMs.txt or LLMs-full.txt from a URL and crawl all linked documents')
  .action(async (url, outputFile, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('default', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processLLMsTxt(url, outputFile, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process stdin and upload command
program
  .command('pipestdin <outputFile> [bucket]')
  .description('Process piped stdin output, create a file, and upload to Spaces')
  .action(async (outputFile, bucket, options) => {
    const globalOptions = program.opts();
    const targetBucket = bucket || process.env.DO_SPACES_BUCKET || 'gradientai-kb';

    // Ensure required environment variables are available
    const envReady = await ensureEnvVars('default', !!bucket || !process.env.DO_SPACES_BUCKET);
    if (!envReady) {
      process.exit(1);
    }

    try {
      await processStdinUpload(outputFile, targetBucket, globalOptions.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

export { program };