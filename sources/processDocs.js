#!/usr/bin/env node

import fs from "fs";
import chalk from "chalk";
import { processDoc } from "../modules/processDoc.js";
import ora from "ora";

const processUrls = async (filePath, selector, selectorType, bucket, dryRun = false) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const urls = fileContent.split("\n").filter((line) => line.trim() !== "");

  for (const url of urls) {
    try {
      await processDoc(url, selector, selectorType, bucket, dryRun);
      console.log(chalk.green(`Processed URL: ${url}`));
    } catch (error) {
      console.error(chalk.red(`Error processing URL ${url}:`, error));
    }
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 6) {
    console.log(
      "Usage: ./sources/processDocs.js <file> <selector> <selector type: id, class, or tag> <spaces bucket> [--dry-run]"
    );
    process.exit(1);
  }
  const file = process.argv[2];
  const selector = process.argv[3];
  const selectorType = process.argv[4];
  const bucket = process.argv[5];
  const dryRun = process.argv[6] === '--dry-run';

  const spinner = ora({
    text: "Processing URLs...",
  }).start();

  try {
    await processUrls(file, selector, selectorType, bucket, dryRun);
    spinner.succeed("URLs processed successfully");
    console.log(chalk.green("All URLs processed successfully"));
  } catch (error) {
    spinner.fail("Error processing URLs");
    console.error(chalk.red("Error processing file:", error));
    process.exit(1);
  }
}

export { processUrls };
