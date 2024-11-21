#!/usr/bin/env node

import { URL } from "url";
import TurndownService from "turndown";
import { uploadBuffer } from "../modules/uploadToSpaces.js";
import { Client } from "intercom-client";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();
const turndownService = new TurndownService();

const client = new Client({
  tokenAuth: { token: process.env.INTERCOM_ACCESS_TOKEN },
});

async function fetchNext(page, pageSize) {
  const response = await client.articles.list({
    perPage: pageSize,
    page: page,
  });
  return await response.json();
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

const getIntercomArticles = async () => {
  const bucket =
    process.argv[2] || process.env.SPACES_BUCKET || process.env.BUCKET_NAME || null;
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
    const intercomArticles = await fetchAllIntercomArticles();
    intercomArticles.forEach(async (article) => {
      const title = article.title;
      const url = new URL(article.links.html);
      const filename = `${url.pathname.split("/").pop()}.md`;
      let content = url.concat(
        "\n\n",
        `Title: ${title}\n\n`,
        `Content: ${turndownService.turndown(article.body)}`
      );
      const buffer = Buffer.from(content, "utf-8");
      await uploadBuffer(bucket, filename, buffer);
      console.log(
        chalk.green(`Uploaded ${title} to ${bucket}/${filename} successfully`)
      );
    });
  } catch (error) {
    console.error(chalk.red("Error fetching Intercom articles"), error);
    process.exit(1);
  }
};

if (import.meta.url === new URL(import.meta.url).href) {
  if (process.argv.length < 4 && !process.env.SPACES_BUCKET && !process.env.INTERCOM_ACCESS_TOKEN) {
    console.log("Usage: ./intercom.js [spaces bucket] [intercom access token]");
    process.exit(1);
  }
  getIntercomArticles()
    .then(() => console.log(chalk.green("All articles uploaded successfully")))
    .catch((error) => console.error(chalk.red("Error:", error)));
}

export { getIntercomArticles };
