import fs from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';

export async function processBatch(configPath, dryRun = false) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Validate that this is a kbcreationtools config file
  if (!config.kbcreationtools || typeof config.kbcreationtools !== 'string') {
    throw new Error('Invalid configuration file: missing or invalid "kbcreationtools" key. This does not appear to be a kbcreationtools configuration file. Expected format: {"kbcreationtools": "version"}');
  }

  const results = {
    processed: [],
    failed: [],
    skipped: []
  };

  const batchSpinner = ora('Starting batch processing...').start();

  try {
    // Process documents
    if (config.documents && config.documents.length > 0) {
      console.log(chalk.blue('\n📄 Processing documents...'));
      const { processDocument } = await import('./docProcessor.js');
      for (const doc of config.documents) {
        const fullPath = path.resolve(path.dirname(configPath), doc.file);
        if (!fs.existsSync(fullPath)) {
          results.skipped.push({ type: 'document', path: fullPath, reason: 'File not found' });
          continue;
        }

        const result = await processDocument(fullPath, doc.bucket || config.defaultBucket, dryRun);
        if (result.success) {
          results.processed.push(result);
        } else {
          results.failed.push(result);
        }
      }
    }

    // Process web pages
    if (config.webPages && config.webPages.length > 0) {
      console.log(chalk.blue('\n🌐 Processing web pages...'));
      const { processDoc } = await import('./processDoc.js');
      for (const page of config.webPages) {
        try {
          await processDoc(
            page.url,
            page.selector || 'body',
            page.selectorType || 'css',
            page.bucket || config.defaultBucket,
            dryRun
          );
          results.processed.push({
            type: 'webpage',
            url: page.url,
            bucket: page.bucket || config.defaultBucket
          });
        } catch (error) {
          results.failed.push({
            type: 'webpage',
            url: page.url,
            error: error.message
          });
        }
      }
    }

    // Extract links from pages
    if (config.linkExtraction && config.linkExtraction.length > 0) {
      console.log(chalk.blue('\n🔗 Extracting links...'));
      const { extractLinks } = await import('../urls/extractLinks.js');
      for (const extraction of config.linkExtraction) {
        try {
          let links = [];
          if (dryRun) {
            // In dry-run mode, return mock links
            links = ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'];
          } else {
            links = await extractLinks(
              extraction.url,
              extraction.selector || 'body',
              extraction.selectorType || 'css'
            );
          }

          if (extraction.outputFile) {
            const outputPath = path.resolve(path.dirname(configPath), extraction.outputFile);
            if (!dryRun) {
              fs.writeFileSync(outputPath, links.join('\n'), 'utf-8');
            }
            console.log(chalk.green(`Links saved to: ${outputPath}`));

            // Process extracted links if configured
            if (extraction.processDocs) {
              console.log(chalk.blue(`🔄 Processing extracted links with processDocs...`));
              const { processUrls } = await import('../sources/processDocs.js');
              await processUrls(
                outputPath,
                extraction.processDocs.selector || 'body',
                extraction.processDocs.selectorType || 'css',
                extraction.processDocs.bucket || extraction.bucket || config.defaultBucket,
                dryRun
              );
              console.log(chalk.green(`✅ Processed ${links.length} extracted links`));
            }
          }

          results.processed.push({
            type: 'link_extraction',
            url: extraction.url,
            linksCount: links.length,
            outputFile: extraction.outputFile,
            processedWithDocs: !!extraction.processDocs
          });
        } catch (error) {
          results.failed.push({
            type: 'link_extraction',
            url: extraction.url,
            error: error.message
          });
        }
      }
    }

    // Process sitemaps
    if (config.sitemaps && config.sitemaps.length > 0) {
      console.log(chalk.blue('\n🗺️ Processing sitemaps...'));
      const { parseSitemap } = await import('../urls/parseSitemap.js');
      const puppeteer = await import('puppeteer');
      const { checkRobotsTxt } = await import('./utils.js');
      const { config: appConfig } = await import('./config.js');

      for (const sitemap of config.sitemaps) {
        try {
          // Fetch sitemap content
          let content = "";
          if (dryRun) {
            // In dry-run mode, skip actual fetching
            content = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/page1</loc></url><url><loc>https://example.com/page2</loc></url></urlset>';
          } else if (fs.existsSync(sitemap.source)) {
            // Read from file
            content = fs.readFileSync(sitemap.source, "utf-8");
          } else {
            // Check robots.txt for the sitemap URL
            const allowed = await checkRobotsTxt(sitemap.source, appConfig.USER_AGENT);
            if (!allowed) {
              console.error(chalk.red(`Access denied by robots.txt for URL: ${sitemap.source}`));
              results.failed.push({
                type: 'sitemap',
                source: sitemap.source,
                error: 'Access denied by robots.txt'
              });
              continue;
            }

            // Read from URL
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setUserAgent(appConfig.USER_AGENT);
            await page.goto(sitemap.source, { waitUntil: "networkidle2" });
            content = await page.content();
            await browser.close();
          }

          if (!content) {
            results.failed.push({
              type: 'sitemap',
              source: sitemap.source,
              error: 'Failed to retrieve sitemap content'
            });
            continue;
          }

          const urls = await parseSitemap(content);

          if (sitemap.outputFile) {
            const outputPath = path.resolve(path.dirname(configPath), sitemap.outputFile);
            const uniqueUrls = [...new Set(urls)];
            const fileContent = uniqueUrls.join('\n');
            if (!dryRun) {
              fs.writeFileSync(outputPath, fileContent, 'utf-8');
            }
            console.log(chalk.green(`URLs saved to: ${outputPath}`));

            // Process sitemap URLs if configured
            if (sitemap.processDocs) {
              console.log(chalk.blue(`🔄 Processing sitemap URLs with processDocs...`));
              const { processUrls } = await import('../sources/processDocs.js');
              await processUrls(
                outputPath,
                sitemap.processDocs.selector || 'body',
                sitemap.processDocs.selectorType || 'css',
                sitemap.processDocs.bucket || sitemap.bucket || config.defaultBucket,
                dryRun
              );
              console.log(chalk.green(`✅ Processed ${uniqueUrls.length} sitemap URLs`));
            }
          }

          results.processed.push({
            type: 'sitemap',
            source: sitemap.source,
            urlsCount: urls.length,
            outputFile: sitemap.outputFile,
            processedWithDocs: !!sitemap.processDocs
          });
        } catch (error) {
          results.failed.push({
            type: 'sitemap',
            source: sitemap.source,
            error: error.message
          });
        }
      }
    }

    // Process GitHub repositories
    if (config.github && config.github.length > 0) {
      console.log(chalk.blue('\n🐙 Processing GitHub repositories...'));
      const { crawlGitHubRepo } = await import('../sources/githubCrawler.js');
      for (const repo of config.github) {
        try {
          await crawlGitHubRepo(repo.owner, repo.repo, dryRun);
          results.processed.push({
            type: 'github',
            owner: repo.owner,
            repo: repo.repo,
            bucket: config.defaultBucket,
            outputFile: repo.outputFile
          });
        } catch (error) {
          results.failed.push({
            type: 'github',
            owner: repo.owner,
            repo: repo.repo,
            error: error.message
          });
        }
      }
    }

    // Process Intercom articles
    if (config.intercom && config.intercom.length > 0) {
      console.log(chalk.blue('\n💬 Processing Intercom articles...'));
      const { getIntercomArticles } = await import('../sources/intercom.js');
      for (const intercom of config.intercom) {
        try {
          await getIntercomArticles(intercom.bucket || config.defaultBucket, dryRun);
          results.processed.push({
            type: 'intercom',
            bucket: intercom.bucket || config.defaultBucket,
            outputFile: intercom.outputFile
          });
        } catch (error) {
          results.failed.push({
            type: 'intercom',
            bucket: intercom.bucket || config.defaultBucket,
            error: error.message
          });
        }
      }
    }

    // Process Reddit searches
    if (config.reddit && config.reddit.length > 0) {
      console.log(chalk.blue('\n🟠 Processing Reddit searches...'));
      const { processRedditPosts } = await import('../sources/reddit.js');
      for (const reddit of config.reddit) {
        try {
          await processRedditPosts(reddit.query, reddit.bucket || config.defaultBucket, dryRun);
          results.processed.push({
            type: 'reddit',
            query: reddit.query,
            bucket: reddit.bucket || config.defaultBucket,
            outputFile: reddit.outputFile
          });
        } catch (error) {
          results.failed.push({
            type: 'reddit',
            query: reddit.query,
            bucket: reddit.bucket || config.defaultBucket,
            error: error.message
          });
        }
      }
    }

    // Process Stack Overflow searches
    if (config.stackoverflow && config.stackoverflow.length > 0) {
      console.log(chalk.blue('\n📚 Processing Stack Overflow searches...'));
      const { searchStackOverflow } = await import('../sources/stackoverflow.js');
      for (const so of config.stackoverflow) {
        try {
          await searchStackOverflow(so.searchTerm, so.bucket || config.defaultBucket, dryRun);
          results.processed.push({
            type: 'stackoverflow',
            searchTerm: so.searchTerm,
            bucket: so.bucket || config.defaultBucket,
            outputFile: so.outputFile
          });
        } catch (error) {
          results.failed.push({
            type: 'stackoverflow',
            searchTerm: so.searchTerm,
            bucket: so.bucket || config.defaultBucket,
            error: error.message
          });
        }
      }
    }

    // Process LLMs.txt files
    if (config.llms && config.llms.length > 0) {
      console.log(chalk.blue('\n🤖 Processing LLMs.txt files...'));
      const { processLLMsTxt } = await import('./llmsProcessor.js');
      for (const llms of config.llms) {
        try {
          const result = await processLLMsTxt(llms.url, llms.outputFile, llms.bucket || config.defaultBucket, dryRun);
          results.processed.push({
            type: 'llms',
            url: llms.url,
            outputFile: llms.outputFile,
            bucket: llms.bucket || config.defaultBucket,
            source: result.source,
            urlsProcessed: result.urlsProcessed,
            contentLength: result.contentLength,
            uploaded: result.uploaded
          });
        } catch (error) {
          results.failed.push({
            type: 'llms',
            url: llms.url,
            outputFile: llms.outputFile,
            bucket: llms.bucket || config.defaultBucket,
            error: error.message
          });
        }
      }
    }

    // Process RSS feeds
    if (config.rss && config.rss.length > 0) {
      console.log(chalk.blue('\n📰 Processing RSS feeds...'));
      const { crawlRSSFeed } = await import('../sources/rssFeedCrawler.js');
      for (const rss of config.rss) {
        try {
          await crawlRSSFeed(rss.feedUrl, dryRun);
          results.processed.push({
            type: 'rss',
            feedUrl: rss.feedUrl,
            bucket: config.defaultBucket,
            outputFile: rss.outputFile
          });
        } catch (error) {
          results.failed.push({
            type: 'rss',
            feedUrl: rss.feedUrl,
            error: error.message
          });
        }
      }
    }

    batchSpinner.succeed('Batch processing completed');

    // Summary
    console.log(chalk.green(`\n✅ Processed: ${results.processed.length}`));
    if (results.failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${results.failed.length}`));
    }
    if (results.skipped.length > 0) {
      console.log(chalk.yellow(`⏭️ Skipped: ${results.skipped.length}`));
    }

    return results;

  } catch (error) {
    batchSpinner.fail(`Batch processing failed: ${error.message}`);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(arg => arg !== '--dry-run');

  if (filteredArgs.length < 1) {
    console.log('Usage: ./modules/batchProcessor.js <config.json> [--dry-run]');
    console.log('');
    console.log('Config file format:');
    console.log('{');
    console.log('  "defaultBucket": "your-bucket-name",');
    console.log('  "documents": [{"file": "path/to/doc.pdf", "bucket": "optional-bucket"}],');
    console.log('  "webPages": [{"url": "https://example.com", "selector": "body", "bucket": "optional-bucket"}],');
    console.log('  "linkExtraction": [{"url": "https://example.com", "outputFile": "links.txt", "processDocs": {"selector": "body", "bucket": "optional-bucket"}}],');
    console.log('  "sitemaps": [{"source": "https://example.com/sitemap.xml", "outputFile": "urls.txt", "processDocs": {"selector": "body", "bucket": "optional-bucket"}}],');
    console.log('  "github": [{"owner": "username", "repo": "repository", "outputFile": "github.md"}],');
    console.log('  "intercom": [{"bucket": "optional-bucket", "outputFile": "intercom.md"}],');
    console.log('  "reddit": [{"query": "search term", "bucket": "optional-bucket", "outputFile": "reddit.md"}],');
    console.log('  "stackoverflow": [{"searchTerm": "query", "bucket": "optional-bucket", "outputFile": "stackoverflow.md"}],');
    console.log('  "rss": [{"feedUrl": "https://example.com/feed.xml", "outputFile": "rss.md"}]');
    console.log('}');
    console.log('');
    console.log('Output files:');
    console.log('  .txt extension: Plain text format');
    console.log('  .md extension: Markdown format');
    process.exit(1);
  }

  const [configPath] = filteredArgs;

  processBatch(configPath, dryRun).then(results => {
    console.log('\nBatch processing summary:');
    console.log(`Processed: ${results.processed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Skipped: ${results.skipped.length}`);

    if (results.failed.length > 0) {
      console.log('\nFailed items:');
      results.failed.forEach(item => {
        console.log(`- ${item.type}: ${item.error || item.reason}`);
      });
      process.exit(1);
    }
  }).catch(error => {
    console.error('Batch processing error:', error.message);
    process.exit(1);
  });
}