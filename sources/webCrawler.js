import { processDoc } from '../modules/processDoc.js';
import { extractLinks } from '../urls/extractLinks.js';
import { config } from '../modules/config.js';
import ora from 'ora';

export async function crawlWebsite(startUrl, maxDepth = 2, maxPages = 100) {
  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];
  let crawledCount = 0;

  const crawlSpinner = ora(`Starting crawl of ${startUrl}...`).start();

  while (queue.length > 0 && crawledCount < maxPages) {
    const { url, depth } = queue.shift();

    if (visited.has(url) || depth > maxDepth) continue;
    visited.add(url);

    try {
      console.log(`Crawling: ${url} (depth: ${depth})`);
      await processDoc(url);
      crawledCount++;

      if (depth < maxDepth) {
        const linkSpinner = ora(`Extracting links from ${url}...`).start();
        const links = await extractLinks(url);
        linkSpinner.succeed(`Extracted ${links.length} links`);

        for (const link of links) {
          if (!visited.has(link) && link.startsWith(startUrl)) { // stay within domain
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error.message);
    }
  }

  crawlSpinner.succeed(`Crawled ${crawledCount} pages`);
}