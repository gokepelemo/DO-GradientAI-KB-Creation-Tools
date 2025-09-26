#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { uploadBuffer } from './uploadToSpaces.js';
import { constructSelector, checkRobotsTxt } from './utils.js';
import { config } from './config.js';
import { URL } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';
import TurndownService from 'turndown';
import ora from 'ora';

dotenv.config();

// const turndownService = new TurndownService();

// if (process.argv.length < 6) {
//   console.log(chalk.yellow(
//     "Usage: ./processDoc.js <url> <selector> <selector type: id, class, or tag> <spaces bucket>"
//   ));
//   process.exit(1);
// }

const processDoc = async (url, selector, selectorType, bucket, dryRun = false) => {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Check robots.txt
  const robotsSpinner = ora('Checking robots.txt...').start();
  const allowed = await checkRobotsTxt(url, config.USER_AGENT);
  robotsSpinner.stop();
  if (!allowed) {
    throw new Error(`Access denied by robots.txt for URL: ${url}`);
  }

  const constructedSelector = constructSelector(selector, selectorType);

  const browserSpinner = ora('Launching browser...').start();
  const browser = await puppeteer.launch();
  browserSpinner.succeed('Browser launched');

  const page = await browser.newPage();
  await page.setUserAgent(config.USER_AGENT);
  const urlPath = new URL(url).pathname.replace(/\//g, "--").replace(/^-+|-+$/g, "") + ".txt";

  const gotoSpinner = ora(`Navigating to ${url}...`).start();
  await page.goto(url, { waitUntil: 'networkidle2' });
  gotoSpinner.succeed(`Loaded ${url}`);

  const waitSpinner = ora('Waiting for content...').start();
  await page.waitForSelector(constructedSelector);
  waitSpinner.succeed('Content ready');

  // Evaluates an HTML element and extracts the text
  const extractSpinner = ora('Extracting content...').start();
  const articleText = await page.evaluate((element) => {
    const article = document.querySelector(element);
    return article ? article.innerHTML : "No article element found";
  }, constructedSelector);
  extractSpinner.succeed('Content extracted');

  const pageTitle = await page.title();
  const fullText = "URL:"+ url + "\n\n#"+pageTitle+"\n\n"+turndownService.turndown(articleText);

  // Create a buffer from the extracted text
  const buffer = Buffer.from(fullText, 'utf-8');

  // Upload the buffer to a DigitalOcean Spaces bucket
  if (dryRun) {
    console.log(chalk.blue(`[DRY RUN] Would upload ${urlPath} to bucket ${bucket}`));
  } else {
    const uploadSpinner = ora('Uploading to Spaces...').start();
    await uploadBuffer(bucket, buffer, urlPath);
    uploadSpinner.succeed(`Uploaded ${urlPath}`);
  }

  await browser.close();
  console.log(chalk.green(`Processed content from URL: ${url}`));
};

// CLI commented out for module use
/*
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const selector = process.argv[3];
  const selectorType = process.argv[4];
  const bucket = process.argv[5];

  processDoc(url, selector, selectorType, bucket)
    .then(() => console.log(chalk.green("Content extracted and uploaded successfully")))
    .catch((error) => console.error(chalk.red("Error:", error)));
}
*/

export { processDoc };
