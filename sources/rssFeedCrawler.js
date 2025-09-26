import Parser from 'rss-parser';
import { processDoc } from '../modules/processDoc.js';
import { config } from '../modules/config.js';
import ora from 'ora';

const parser = new Parser();

export async function crawlRSSFeed(feedUrl, dryRun = false) {
  const rssSpinner = ora(`Crawling RSS feed: ${feedUrl}...`).start();

  try {
    const feed = await parser.parseURL(feedUrl);
    rssSpinner.succeed(`Parsed RSS feed: ${feed.title}`);

    const processSpinner = ora(`Processing ${feed.items.length} items...`).start();
    for (const item of feed.items) {
      if (item.link) {
        if (dryRun) {
          console.log(`[DRY RUN] Would process RSS item: ${item.title} (${item.link})`);
        } else {
          await processDoc(item.link);
        }
      }
    }
    if (dryRun) {
      processSpinner.succeed(`Simulated processing of ${feed.items.length} items from RSS feed`);
    } else {
      processSpinner.succeed(`Processed ${feed.items.length} items from RSS feed`);
    }
  } catch (error) {
    rssSpinner.fail(`Error crawling RSS feed ${feedUrl}: ${error.message}`);
  }
}