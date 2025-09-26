import fs from 'fs';
import path from 'path';

export async function processBatchSimple(configPath, dryRun = false) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const results = {
    processed: [],
    failed: [],
    skipped: []
  };

  console.log('Starting batch processing...');

  try {
    // Process documents
    if (config.documents && config.documents.length > 0) {
      console.log('\nProcessing documents...');
      for (const doc of config.documents) {
        const fullPath = path.resolve(path.dirname(configPath), doc.file);
        if (!fs.existsSync(fullPath)) {
          results.skipped.push({ type: 'document', path: fullPath, reason: 'File not found' });
          continue;
        }

        console.log(`Would process document: ${fullPath} -> ${doc.bucket || config.defaultBucket}`);
        results.processed.push({
          type: 'document',
          path: fullPath,
          bucket: doc.bucket || config.defaultBucket
        });
      }
    }

    // Process web pages
    if (config.webPages && config.webPages.length > 0) {
      console.log('\nProcessing web pages...');
      for (const page of config.webPages) {
        console.log(`Would process webpage: ${page.url} -> ${page.bucket || config.defaultBucket}`);
        results.processed.push({
          type: 'webpage',
          url: page.url,
          bucket: page.bucket || config.defaultBucket
        });
      }
    }

    // Extract links from pages
    if (config.linkExtraction && config.linkExtraction.length > 0) {
      console.log('\nExtracting links...');
      for (const extraction of config.linkExtraction) {
        console.log(`Would extract links from: ${extraction.url} -> ${extraction.outputFile}`);
        if (extraction.processDocs) {
          console.log(`Would process extracted links with processDocs (selector: ${extraction.processDocs.selector || 'body'}, bucket: ${extraction.processDocs.bucket || 'default'})`);
        }
        results.processed.push({
          type: 'link_extraction',
          url: extraction.url,
          outputFile: extraction.outputFile,
          processedWithDocs: !!extraction.processDocs
        });
      }
    }

    // Process sitemaps
    if (config.sitemaps && config.sitemaps.length > 0) {
      console.log('\nProcessing sitemaps...');
      for (const sitemap of config.sitemaps) {
        console.log(`Would process sitemap: ${sitemap.source} -> ${sitemap.outputFile}`);
        if (sitemap.processDocs) {
          console.log(`Would process sitemap URLs with processDocs (selector: ${sitemap.processDocs.selector || 'body'}, bucket: ${sitemap.processDocs.bucket || 'default'})`);
        }
        results.processed.push({
          type: 'sitemap',
          source: sitemap.source,
          outputFile: sitemap.outputFile,
          processedWithDocs: !!sitemap.processDocs
        });
      }
    }

    // Process GitHub repositories
    if (config.github && config.github.length > 0) {
      console.log('\nProcessing GitHub repositories...');
      for (const repo of config.github) {
        console.log(`Would process GitHub repo: ${repo.owner}/${repo.repo} -> ${repo.outputFile}`);
        results.processed.push({
          type: 'github',
          owner: repo.owner,
          repo: repo.repo,
          outputFile: repo.outputFile
        });
      }
    }

    // Process Intercom articles
    if (config.intercom && config.intercom.length > 0) {
      console.log('\nProcessing Intercom articles...');
      for (const intercom of config.intercom) {
        console.log(`Would process Intercom articles -> ${intercom.outputFile}`);
        results.processed.push({
          type: 'intercom',
          bucket: intercom.bucket || config.defaultBucket,
          outputFile: intercom.outputFile
        });
      }
    }

    // Process Reddit searches
    if (config.reddit && config.reddit.length > 0) {
      console.log('\nProcessing Reddit searches...');
      for (const reddit of config.reddit) {
        console.log(`Would process Reddit search: "${reddit.query}" -> ${reddit.outputFile}`);
        results.processed.push({
          type: 'reddit',
          query: reddit.query,
          bucket: reddit.bucket || config.defaultBucket,
          outputFile: reddit.outputFile
        });
      }
    }

    // Process Stack Overflow searches
    if (config.stackoverflow && config.stackoverflow.length > 0) {
      console.log('\nProcessing Stack Overflow searches...');
      for (const so of config.stackoverflow) {
        console.log(`Would process Stack Overflow search: "${so.searchTerm}" -> ${so.outputFile}`);
        results.processed.push({
          type: 'stackoverflow',
          searchTerm: so.searchTerm,
          bucket: so.bucket || config.defaultBucket,
          outputFile: so.outputFile
        });
      }
    }

    // Process RSS feeds
    if (config.rss && config.rss.length > 0) {
      console.log('\nProcessing RSS feeds...');
      for (const rss of config.rss) {
        console.log(`Would process RSS feed: ${rss.feedUrl} -> ${rss.outputFile}`);
        results.processed.push({
          type: 'rss',
          feedUrl: rss.feedUrl,
          outputFile: rss.outputFile
        });
      }
    }

    console.log('\nBatch processing completed');

    // Summary
    console.log(`Processed: ${results.processed.length}`);
    if (results.failed.length > 0) {
      console.log(`Failed: ${results.failed.length}`);
    }
    if (results.skipped.length > 0) {
      console.log(`Skipped: ${results.skipped.length}`);
    }

    return results;

  } catch (error) {
    console.error(`Batch processing failed: ${error.message}`);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(arg => arg !== '--dry-run');

  if (filteredArgs.length < 1) {
    console.log('Usage: ./modules/batchProcessorSimple.js <config.json> [--dry-run]');
    console.log('');
    console.log('Config file format:');
    console.log('{');
    console.log('  "defaultBucket": "your-bucket-name",');
    console.log('  "documents": [{"file": "path/to/doc.pdf", "bucket": "optional-bucket"}],');
    console.log('  "webPages": [{"url": "https://example.com", "selector": "body", "bucket": "optional-bucket"}],');
    console.log('  "linkExtraction": [{"url": "https://example.com", "outputFile": "links.txt", "processDocs": {"selector": "body", "bucket": "optional-bucket"}}],');
    console.log('  "sitemaps": [{"source": "https://example.com/sitemap.xml", "outputFile": "urls.txt", "processDocs": {"selector": "body", "bucket": "optional-bucket"}}]');
    console.log('}');
    process.exit(1);
  }

  const [configPath] = filteredArgs;

  processBatchSimple(configPath, dryRun).then(results => {
    console.log('\nBatch processing summary:');
    console.log(`Processed: ${results.processed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Skipped: ${results.skipped.length}`);
  }).catch(error => {
    console.error('Batch processing error:', error.message);
    process.exit(1);
  });
}