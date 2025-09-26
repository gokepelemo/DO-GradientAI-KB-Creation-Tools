#!/usr/bin/env node

import { URL } from "url";
import TurndownService from "turndown";
import { uploadBuffer } from "../modules/uploadToSpaces.js";
import chalk from "chalk";
import dotenv from "dotenv";
import ora from "ora";
import { config } from "../modules/config.js";

dotenv.config();

const turndownService = new TurndownService();

async function fetchNext(page, pageSize) {
  const response = await fetch(
    `${config.APIs.INTERCOM}/articles?per_page${pageSize}&page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        "Intercom-Version": "2.11",
        "User-Agent": config.USER_AGENT,
      },
    }
  );
  const articlesRequested = await response.json();
  return articlesRequested;
}

async function fetchAllIntercomArticles() {
  let page = 1;
  let hasMore = true;
  let allArticles = [];

  while (hasMore) {
    const articles = await fetchNext(page, 25);
    allArticles = allArticles.concat(articles.data);
    hasMore = !!articles.pages.next;
    if (hasMore) {
      page += 1;
    }
  }
  return allArticles;
}

const main = async (bucketParam = null, dryRun = false) => {
  const bucket =
    bucketParam ||
    process.argv[2] ||
    process.env.SPACES_BUCKET ||
    process.env.BUCKET_NAME ||
    null;
  const intercomAccessToken =
    process.argv[3] || process.env.INTERCOM_ACCESS_TOKEN || null;
  if (!bucket || !intercomAccessToken) {
    console.error(
      chalk.red(
        "Error: Both SPACES_BUCKET and INTERCOM_ACCESS_TOKEN must be set as environment variables or added as arguments."
      )
    );
    process.exit(1);
  }
  try {
    const fetchSpinner = ora('Fetching Intercom articles...').start();
    let intercomArticles = await fetchAllIntercomArticles();
    fetchSpinner.succeed('Intercom articles fetched successfully.');
    
    intercomArticles = intercomArticles.filter(
      (article) => article.state === "published"
    );

    const uploadSpinner = ora('Uploading articles to Spaces...').start();
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${intercomArticles.length} articles to bucket ${bucket}`));
      intercomArticles.forEach(article => {
        const url = new URL(article.url);
        const filename = `${url.pathname.split("/").pop()}.md`;
        console.log(chalk.blue(`[DRY RUN] Would upload ${filename}`));
      });
      uploadSpinner.succeed(`Simulated upload of ${intercomArticles.length} articles`);
    } else {
      await Promise.all(intercomArticles.map(async (article) => {
        const title = article.title;
        const url = new URL(article.url);
        const filename = `${url.pathname.split("/").pop()}.md`;
        let content =
          url + "\n\n" + title + "\n\n" + turndownService.turndown(article.body);
        const buffer = Buffer.from(content, "utf-8");
        await uploadBuffer(bucket, buffer, filename);
      }));
      uploadSpinner.succeed(`Uploaded ${intercomArticles.length} articles`);
    }
  } catch (error) {
    console.error(chalk.red("Error fetching Intercom articles"), error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const mainSpinner = ora('Getting articles and uploading them to Spaces...').start();
  try {
    await main(null, dryRun);
    mainSpinner.succeed('KB ops completed successfully. Files might still be getting uploaded.');
  } catch (error) {
    mainSpinner.fail('Error completing KB Ops.');
    throw error;
  }
}

export { main as getIntercomArticles };
