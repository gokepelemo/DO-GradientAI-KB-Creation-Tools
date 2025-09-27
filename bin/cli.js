#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
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
import { ensureEnvVars, getCommandFlags } from '../modules/envCollector.js';
import { startCommandSession, endCommandSession } from '../modules/logger.js';
import { createIndexingJob, promptForIndexingJob } from '../modules/gradientAI.js';

/**
 * Handle indexing job creation after successful upload
 * @param {Object} cliConfig - CLI configuration options
 * @param {Object} inquirer - Inquirer instance for prompts
 */
async function handleIndexingJob(cliConfig, inquirer) {
  try {
    // Check if auto-index is enabled
    if (cliConfig.autoIndex) {
      if (!cliConfig.knowledgeBaseUuid) {
        console.log(chalk.yellow('Warning: --auto-index enabled but no --knowledge-base-uuid provided. Skipping indexing job.'));
        return;
      }
      await createIndexingJobWithConfig(cliConfig);
      return;
    }

    // Check if knowledge base UUID is provided
    if (cliConfig.knowledgeBaseUuid) {
      await createIndexingJobWithConfig(cliConfig);
      return;
    }

    // Prompt user for indexing job creation
    const answers = await promptForIndexingJob(inquirer);
    if (answers.createJob) {
      const indexingConfig = {
        ...cliConfig,
        knowledgeBaseUuid: answers.knowledgeBaseUuid,
        dataSourceUuids: answers.dataSourceUuids
      };
      await createIndexingJobWithConfig(indexingConfig);
    }
  } catch (error) {
    console.error(chalk.red('Error handling indexing job:'), error.message);
    // Don't exit - indexing failure shouldn't stop the overall process
  }
}

/**
 * Create indexing job with provided configuration
 * @param {Object} config - Configuration with GradientAI settings
 */
async function createIndexingJobWithConfig(config) {
  const gradientaiToken = config.gradientaiToken || process.env.DIGITALOCEAN_ACCESS_TOKEN;
  if (!gradientaiToken) {
    throw new Error('DIGITALOCEAN_ACCESS_TOKEN is required for GradientAI operations. Use --gradientai-token or set DIGITALOCEAN_ACCESS_TOKEN environment variable.');
  }

  const dataSourceUuids = config.dataSourceUuids
    ? config.dataSourceUuids.split(',').map(uuid => uuid.trim()).filter(uuid => uuid.length > 0)
    : [];

  await createIndexingJob(gradientaiToken, config.knowledgeBaseUuid, dataSourceUuids);
}

const program = new Command();

program
  .name('kbcreationtools')
  .description('Tools for creating knowledge bases for DigitalOcean GradientAI. Default behavior: process piped stdin to output file.')
  .version('1.1.0')
  .argument('[outputFile]', 'Output file for piped stdin processing (default behavior)')
  .argument('[bucket]', 'Spaces/S3 bucket name (optional, overrides DO_SPACES_BUCKET env var)')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (outputFile, bucket, options) => {
    // Default behavior: process piped stdin
    if (outputFile) {
      try {
        const globalOptions = program.opts();

        // Collect CLI configuration options
        const cliConfig = {
          githubToken: options.githubToken,
          intercomToken: options.intercomToken,
          redditClientId: options.redditClientId,
          redditClientSecret: options.redditClientSecret,
          stackoverflowKey: options.stackoverflowKey,
          bucketName: options.bucket || bucket,
          bucketEndpoint: options.bucketEndpoint,
          bucketRegion: options.bucketRegion,
          gradientaiToken: globalOptions.gradientaiToken,
          knowledgeBaseUuid: globalOptions.knowledgeBaseUuid,
          dataSourceUuids: globalOptions.dataSourceUuids,
          autoIndex: globalOptions.autoIndex
        };

        // Ensure required environment variables are available
        const config = await ensureEnvVars('default', cliConfig);
        if (!config) {
          process.exit(1);
        }

        // Set environment variables from config
        Object.assign(process.env, config);

        // Use configured bucket name
        const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

        // Start logging session
        startCommandSession({
          sourceType: 'stdin',
          outputFileName: outputFile
        });

        await processStdinUpload(outputFile, finalBucket, globalOptions.dryRun);

        // Handle indexing job creation after successful upload
        if (!globalOptions.dryRun) {
          await handleIndexingJob(cliConfig, inquirer);
        }

        // End logging session
        if (!globalOptions.dryRun) {
          await endCommandSession(finalBucket);
        }
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
  .option('-v, --verbose', 'enable verbose logging')
  .option('--gradientai-token <token>', 'DigitalOcean Access Token for GradientAI')
  .option('--knowledge-base-uuid <uuid>', 'GradientAI Knowledge Base UUID for indexing')
  .option('--data-source-uuids <uuids>', 'GradientAI Data Source UUIDs (comma-separated) for indexing')
  .option('--auto-index', 'Automatically create indexing job after successful upload');

// Extract links command
program
  .command('extractlinks <url> [selector] [selectorType] <outputFile> [bucket]')
  .description('Extract links from a webpage and save to file')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (url, selector = 'body', selectorType = 'css', outputFile, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available (only if bucket is specified)
    let config = null;
    if (bucket || options.bucket) {
      config = await ensureEnvVars('default', cliConfig);
      if (!config) {
        process.exit(1);
      }
      // Set environment variables from config
      Object.assign(process.env, config);
    }

    // Use configured bucket name
    const finalBucket = config ? config.DO_SPACES_BUCKET || 'gradientai-kb' : null;

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'extractlinks',
        url,
        outputFileName: outputFile
      });

      const links = await extractLinks(url, selector, selectorType);
      const content = links.join('\n');
      
      if (globalOptions.dryRun) {
        console.log(chalk.blue(`[DRY RUN] Will save ${links.length} links to ${outputFile}`));
        console.log(chalk.blue(`[DRY RUN] First few links: ${links.slice(0, 3).join(', ')}...`));
      } else {
        writeFileSync(outputFile, content, 'utf-8');
        console.log(chalk.green(`Extracted ${links.length} links and saved to ${outputFile}`));
      }

      // Upload to bucket if specified
      if (bucket && finalBucket && !globalOptions.dryRun) {
        const { uploadBuffer } = await import('../modules/uploadToSpaces.js');
        await uploadBuffer(finalBucket, Buffer.from(content, 'utf-8'), outputFile);
        console.log(chalk.green(`Uploaded to bucket: ${finalBucket}`));
      }

      // End logging session
      if (!globalOptions.dryRun && bucket && finalBucket) {
        await endCommandSession(finalBucket);
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
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (url, selector = 'body', selectorType = 'css', bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('default', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        url,
        sourceType: 'webpage'
      });

      await processDoc(url, selector, selectorType, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process URLs from file command
program
  .command('processurls <filePath> [selector] [selectorType] [bucket]')
  .description('Process URLs from a file and upload to Spaces/S3')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (filePath, selector = 'body', selectorType = 'css', bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('default', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'processurls',
        filePath
      });

      await processUrls(filePath, selector, selectorType, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// GitHub repository crawler command
program
  .command('github <owner> <repo> [bucket]')
  .description('Crawl a GitHub repository and upload documentation')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (owner, repo, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('github', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        url: `https://github.com/${owner}/${repo}`,
        sourceType: 'github'
      });

      await crawlGitHubRepo(owner, repo, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Intercom articles command
program
  .command('intercom [bucket]')
  .description('Fetch and upload Intercom articles')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('intercom', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'intercom'
      });

      await getIntercomArticles(finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Reddit posts command
program
  .command('reddit <query> [bucket]')
  .description('Search and process Reddit posts')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (query, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('reddit', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'reddit',
        query
      });

      await processRedditPosts(query, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Stack Overflow search command
program
  .command('stackoverflow <query> [bucket]')
  .description('Search Stack Overflow and upload results')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (query, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('stackoverflow', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'stackoverflow',
        query
      });

      await searchStackOverflow(query, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Document processor command
program
  .command('docprocessor <filePath> [bucket]')
  .description('Process local document files (PDF, DOCX, etc.)')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (filePath, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('default', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        documentName: filePath.split('/').pop(),
        sourceType: 'document'
      });

      await processDocument(filePath, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse sitemap command
program
  .command('parsesitemap <url> <outputFile> [bucket]')
  .description('Parse sitemap from URL and extract URLs')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (url, outputFile, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available (only if bucket is specified)
    let config = null;
    if (bucket || options.bucket) {
      config = await ensureEnvVars('default', cliConfig);
      if (!config) {
        process.exit(1);
      }
      // Set environment variables from config
      Object.assign(process.env, config);
    }

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'parsesitemap',
        url,
        outputFileName: outputFile
      });

      // This would need implementation - parseSitemap currently takes content, not URL
      console.log(chalk.yellow('parsesitemap command needs URL-based implementation'));

      // End logging session
      if (!globalOptions.dryRun && bucket && config) {
        const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';
        await endCommandSession(finalBucket);
      }
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
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (url, outputFile, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('default', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'llms',
        url,
        outputFileName: outputFile
      });

      await processLLMsTxt(url, outputFile, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Process stdin and upload command
program
  .command('pipestdin <outputFile> [bucket]')
  .description('Process piped stdin output, create a file, and upload to Spaces')
  .option('--github-token <token>', 'GitHub Personal Access Token (with repo access)')
  .option('--intercom-token <token>', 'Intercom API Access Token')
  .option('--reddit-client-id <id>', 'Reddit API Client ID')
  .option('--reddit-client-secret <secret>', 'Reddit API Client Secret')
  .option('--stackoverflow-key <key>', 'Stack Overflow API Key (optional)')
  .option('--bucket <name>', 'DigitalOcean Spaces Bucket Name')
  .option('--bucket-endpoint <url>', 'Spaces/S3 Endpoint URL')
  .option('--bucket-region <region>', 'AWS Region (e.g., us-east-1)')
  .action(async (outputFile, bucket, options) => {
    const globalOptions = program.opts();

    // Collect CLI configuration options
    const cliConfig = {
      githubToken: options.githubToken,
      intercomToken: options.intercomToken,
      redditClientId: options.redditClientId,
      redditClientSecret: options.redditClientSecret,
      stackoverflowKey: options.stackoverflowKey,
      bucketName: options.bucket || bucket,
      bucketEndpoint: options.bucketEndpoint,
      bucketRegion: options.bucketRegion
    };

    // Ensure required environment variables are available
    const config = await ensureEnvVars('default', cliConfig);
    if (!config) {
      process.exit(1);
    }

    // Set environment variables from config
    Object.assign(process.env, config);

    // Use configured bucket name
    const finalBucket = config.DO_SPACES_BUCKET || 'gradientai-kb';

    try {
      // Start logging session
      startCommandSession({
        sourceType: 'pipestdin',
        outputFileName: outputFile
      });

      await processStdinUpload(outputFile, finalBucket, globalOptions.dryRun);

      // End logging session
      if (!globalOptions.dryRun) {
        await endCommandSession(finalBucket);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

export { program };