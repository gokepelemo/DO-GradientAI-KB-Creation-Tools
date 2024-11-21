#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import { URL } from "url";
import chalk from "chalk";

if (process.argv.length < 4) {
  console.log(
    "Usage: ./parseSitemap.js <sitemap file or URL> <output file> [regex]"
  );
  process.exit(1);
}

const sitemapSource = process.argv[2];
const outputFile = process.argv[3];
const argRegex = process.argv[4]
  ? `<loc>(.*${process.argv[4]}.*)</loc>`
  : "<loc>(.*?)</loc>";
const regex = new RegExp(argRegex, "g");

const parseSitemap = async (content, regex) => {
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

const saveToFile = (urls, file) => {
  const uniqueUrls = [...new Set(urls)];
  fs.writeFileSync(file, uniqueUrls.join("\n"), "utf-8");
  console.log(
    chalk.green(`URLs matching the regex have been dumped into ${file}`)
  );
};

(async () => {
  let content = "";

  if (fs.existsSync(sitemapSource)) {
    // Read from file
    content = fs.readFileSync(sitemapSource, "utf-8");
  } else {
    // Read from URL
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(sitemapSource, { waitUntil: "networkidle2" });
    content = await page.content();
    await browser.close();
  }

  if (!content) {
    console.error(chalk.red("Error: Failed to retrieve sitemap content."));
    process.exit(1);
  }
  const urls = await parseSitemap(content, regex);
  saveToFile(urls, outputFile);
})();

export { parseSitemap };
