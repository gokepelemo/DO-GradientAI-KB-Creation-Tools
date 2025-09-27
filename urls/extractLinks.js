#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import { URL } from "url";
import chalk from "chalk";
import ora from "ora";
import { constructSelector, checkRobotsTxt } from "../modules/utils.js";
import { config } from "../modules/config.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export async function extractLinks(url, selector = 'body', selectorType = 'css') {
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

  const gotoSpinner = ora(`Navigating to ${url}...`).start();
  await page.goto(url, { waitUntil: "networkidle2" });
  gotoSpinner.succeed(`Loaded ${url}`);

  const extractSpinner = ora('Extracting links...').start();
  const links = await page.evaluate((selector) => {
    const navElement = document.querySelector(selector);
    if (!navElement) {
      return [];
    }
    const anchorElements = navElement.querySelectorAll("a");
    return Array.from(anchorElements).map((anchor) => anchor.href);
  }, constructedSelector);
  extractSpinner.succeed(`Extracted ${links.length} links`);

  await browser.close();

  return links;
}

// Only run if this file is executed directly
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(arg => arg !== '--dry-run');

  const url = filteredArgs[0];
  const selector = filteredArgs[1] || 'body';
  const selectorType = filteredArgs[2] || 'css';
  const outputFile = filteredArgs[3];

  if (!url || !outputFile) {
    console.error('Usage: node extractLinks.js <url> [selector] [selectorType] <outputFile> [--dry-run]');
    process.exit(1);
  }

  try {
    const links = await extractLinks(url, selector, selectorType);

    if (!links.length) {
      console.error(chalk.red("No links found."));
      process.exit(1);
    }

    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Will save ${links.length} links to ${outputFile}`));
      console.log(chalk.blue(`[DRY RUN] First few links: ${links.slice(0, 3).join(', ')}...`));
    } else {
      fs.writeFileSync(outputFile, links.join("\n"), "utf-8");
      console.log(chalk.green(`Links extracted and saved to ${outputFile}`));
    }
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
