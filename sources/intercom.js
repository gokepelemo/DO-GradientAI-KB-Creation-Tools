#!/usr/bin/env node

import { URL, fileURLToPath } from "url";
import TurndownService from "turndown";
import { uploadBuffer } from "../modules/uploadToSpaces.js";
import chalk from "chalk";
import dotenv from "dotenv";
import path from "path";
import { oraPromise } from "ora";

dotenv.config();

const turndownService = new TurndownService();

async function fetchNext(page, pageSize) {
  const response = await fetch(
    `https://api.intercom.io/articles?per_page${pageSize}&page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        "Intercom-Version": "2.11",
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

const main = async () => {
  const bucket =
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
    let intercomArticles = await oraPromise(fetchAllIntercomArticles(), {
      text: "Fetching Intercom articles...",
      successText: "Intercom articles fetched successfully.",
      errorText: "Error fetching Intercom articles.",
    });
    intercomArticles = intercomArticles.filter(
      (article) => article.state === "published"
    );
    intercomArticles.forEach(async (article) => {
      const title = article.title;
      const url = new URL(article.url);
      const filename = `${url.pathname.split("/").pop()}.md`;
      let content =
        url + "\n\n" + title + "\n\n" + turndownService.turndown(article.body);
      const buffer = Buffer.from(content, "utf-8");
      await uploadBuffer(bucket, buffer, filename);
    });
  } catch (error) {
    console.error(chalk.red("Error fetching Intercom articles"), error);
    process.exit(1);
  }
};

if (import.meta.url === new URL(import.meta.url).href) {
  await oraPromise(main(), {
    text: "Getting articles and uploading them to Spaces...",
    successText: "KB ops completed successfully. Files might still be getting uploaded.",
    errorText: "Error completing KB Ops.",
  });
}

export { main as getIntercomArticles };
