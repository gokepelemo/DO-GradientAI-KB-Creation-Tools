#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import { URL } from "url";
import chalk from "chalk";
import xml2js from "xml2js";
import { checkRobotsTxt } from "../modules/utils.js";
import { config } from "../modules/config.js";

const parseSitemap = async (content) => {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(content);
  const urls = [];
  if (result.urlset && result.urlset.url) {
    result.urlset.url.forEach(url => {
      if (url.loc && url.loc[0]) {
        urls.push(url.loc[0]);
      }
    });
  }
  return urls;
};

const saveToFile = (urls, file) => {
  const uniqueUrls = [...new Set(urls)];
  const content = uniqueUrls.join('\n');
  fs.writeFileSync(file, content, 'utf-8');
  console.log(
    chalk.green(`URLs have been saved to ${file}`)
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 4) {
    console.log(
      "Usage: ./parseSitemap.js <sitemap file or URL> <output file> [--dry-run]"
    );
    process.exit(1);
  }

  const sitemapSource = process.argv[2];
  const outputFile = process.argv[3];
  const dryRun = process.argv[4] === '--dry-run';
  (async () => {
    let content = "";

    if (fs.existsSync(sitemapSource)) {
      // Read from file
      content = fs.readFileSync(sitemapSource, "utf-8");
    } else {
      // Check robots.txt for the sitemap URL
      const allowed = await checkRobotsTxt(sitemapSource, config.USER_AGENT);
      if (!allowed) {
        console.error(chalk.red(`Access denied by robots.txt for URL: ${sitemapSource}`));
        process.exit(1);
      }

      // Read from URL
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setUserAgent(config.USER_AGENT);
      await page.goto(sitemapSource, { waitUntil: "networkidle2" });
      content = await page.content();
      await browser.close();
    }

    if (!content) {
      console.error(chalk.red("Error: Failed to retrieve sitemap content."));
      process.exit(1);
    }
    const urls = await parseSitemap(content);
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Will save ${urls.length} URLs to ${outputFile}`));
      console.log(chalk.blue(`[DRY RUN] First few URLs: ${urls.slice(0, 3).join(', ')}...`));
    } else {
      saveToFile(urls, outputFile);
    }
  })();
}

export { parseSitemap };
