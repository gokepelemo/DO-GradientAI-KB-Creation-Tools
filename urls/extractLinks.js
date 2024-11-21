#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import { URL } from "url";
import chalk from "chalk";

if (process.argv.length < 5) {
  console.log(
    "Usage: ./extractLinks.js <url> <selector> <selector type: id, class, or tag> <output.txt>"
  );
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

(async () => {
  const url = process.argv[2];
  const selector = process.argv[3];
  const selectorType = process.argv[4];
  const outputFile = process.argv[5];

  const constructedSelector = constructSelector(selector, selectorType);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const links = await page.evaluate((selector) => {
    const navElement = document.querySelector(selector);
    if (!navElement) {
      return [];
    }
    const anchorElements = navElement.querySelectorAll("a");
    return Array.from(anchorElements).map((anchor) => anchor.href);
  }, constructedSelector);

  await browser.close();

  if (!links.length) {
    console.error(chalk.red("No links found."));
    process.exit(1);
  }

  fs.writeFileSync(outputFile, links.join("\n"), "utf-8");
  console.log(chalk.green(`Links extracted and saved to ${outputFile}`));
})();
