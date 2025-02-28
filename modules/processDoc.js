#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { uploadBuffer } from './uploadToSpaces.js';
import { URL } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';
import TurndownService from 'turndown';

dotenv.config();

const turndownService = new TurndownService();

if (process.argv.length < 5) {
  console.log(chalk.yellow(
    "Usage: ./processDoc.js <url> <selector> <selector type: id, class, or tag> <spaces bucket>"
  ));
  process.exit(1);
}

const constructSelector = (selector, type) => {
  switch (type) {
    case "id":
      return `#${selector}`;
    case "class":
      return `.${selector}`;
    case "tag":
      return selector;
    default:
      throw new Error("Invalid selector type. Use 'id', 'class', or 'tag'.");
  }
};

const processDoc = async (url, selector, selectorType, bucket) => {
  const constructedSelector = constructSelector(selector, selectorType);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const urlPath = new URL(url).pathname.replace(/\//g, "--").replace(/^-+|-+$/g, "") + ".txt";
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.waitForSelector(constructedSelector);

  // Evaluates an HTML element and extracts the text
  const articleText = await page.evaluate((element) => {
    const article = document.querySelector(element);
    return article ? article.innerHTML : "No article element found";
  }, constructedSelector);

  const pageTitle = await page.title();
  const fullText = "URL:"+ url + "\n\n#"+pageTitle+"\n\n"+turndownService.turndown(articleText);

  // Create a buffer from the extracted text
  const buffer = Buffer.from(fullText, 'utf-8');

  // Upload the buffer to a DigitalOcean Spaces bucket
  await uploadBuffer(bucket, buffer, urlPath);

  await browser.close();
  console.log(chalk.green(`Processed and uploaded content from URL: ${url}`));
};

if (import.meta.url === new URL(import.meta.url).href) {
  const url = process.argv[2];
  const selector = process.argv[3];
  const selectorType = process.argv[4];
  const bucket = process.argv[5];

  processDoc(url, selector, selectorType, bucket)
    .then(() => console.log(chalk.green("Content extracted and uploaded successfully")))
    .catch((error) => console.error(chalk.red("Error:", error)));
}

export { processDoc };
