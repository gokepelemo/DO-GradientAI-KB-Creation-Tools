#!/usr/bin/env node

import { URL } from "url";
import TurndownService from "turndown";
import { uploadBuffer } from "../modules/uploadToSpaces.js";
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import { config } from '../modules/config.js';

dotenv.config();
const turndownService = new TurndownService();

async function fetchAllPages(url) {
  let page = 1;
  const pageSize = 100; // Maximum allowed by the API
  let hasMore = true;
  const allItems = [];

  while (hasMore) {
    url.searchParams.set("page", page);
    url.searchParams.set("pagesize", pageSize);
    if (process.env.STACKOVERFLOW_API_KEY) {
      url.searchParams.set("key", process.env.STACKOVERFLOW_API_KEY);
    }
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': config.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      allItems.push(...data.items);
      hasMore = data.has_more;
      page++;
    } catch (error) {
      console.error(chalk.red("Error fetching data from Stack Overflow:", error));
      break;
    }
  }

  return allItems;
}

const searchStackOverflow = async (query, bucket, dryRun = false) => {
  const url = new URL(`${config.APIs.STACKOVERFLOW}/search/advanced`);
  url.searchParams.append('order', 'desc');
  url.searchParams.append('sort', 'activity');
  url.searchParams.append('q', query);
  url.searchParams.append('site', 'stackoverflow');
  url.searchParams.append('filter', 'withbody');

  const response = await fetch(url, {
    headers: {
      'User-Agent': config.USER_AGENT
    }
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  const results = data.items;

  const searchSpinner = ora(`Searching Stack Overflow for "${query}"...`).start();
  searchSpinner.succeed(`Found ${results.length} questions`);

  for (const question of results) {
    let questionObject = `Question: ${question.title}\n`;
    const questionMarkdown = turndownService.turndown(question.body);
    questionObject += `Content: ${questionMarkdown}\n`;

    const answerSpinner = ora(`Fetching answers for question: ${question.title}...`).start();
    const answers = await fetchAnswerContent(question.question_id);
    answerSpinner.succeed(`Fetched ${answers.length} answers`);

    if (answers.length > 0) {
      const answer = answers[0];
      const answerMarkdown = turndownService.turndown(answer.body);
      questionObject += `Answer: ${answerMarkdown}\n`;
    }

    const uploadSpinner = ora(`Uploading question: ${question.title}...`).start();
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${question.title} to bucket ${bucket}`));
      uploadSpinner.succeed(`Simulated upload of ${question.title}`);
    } else {
      await uploadBuffer(
        bucket,
        Buffer.from(questionObject, "utf-8"),
        `${question.question_id}.md`
      );
      uploadSpinner.succeed(`Uploaded ${question.title}`);
    }
    console.log(chalk.green(`Processed content from question: ${question.title}`));
  }
  console.log(chalk.green("All questions processed and uploaded successfully"));
};

const fetchAnswerContent = async (questionId) => {
  const url = new URL(`${config.APIs.STACKOVERFLOW}/questions/${questionId}/answers`);
  url.searchParams.append('order', 'desc');
  url.searchParams.append('sort', 'votes');
  url.searchParams.append('site', 'stackoverflow');
  url.searchParams.append('filter', 'withbody');

  const response = await fetch(url, {
    headers: {
      'User-Agent': config.USER_AGENT
    }
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    if (process.argv.length < 3) {
      console.log("Usage: ./stackoverflow.js <query> [bucket] [--dry-run]");
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const filteredArgs = args.filter(arg => arg !== '--dry-run');

    const query = filteredArgs[0];
    const bucket = filteredArgs[1] || process.env.SPACES_BUCKET || process.env.BUCKET_NAME;

  try {
    const searchSpinner = ora(`Searching Stack Overflow for "${query}"...`).start();
    const results = await searchStackOverflow(query, bucket, dryRun);
    searchSpinner.succeed(`Found ${results.length} questions`);

    for (const question of results) {
      let questionObject = `Question: ${question.title}\n`;
      const questionMarkdown = turndownService.turndown(question.body);
      questionObject += `Content: ${questionMarkdown}\n`;

      const answerSpinner = ora(`Fetching answers for question: ${question.title}...`).start();
      const answers = await fetchAnswerContent(question.question_id);
      answerSpinner.succeed(`Fetched ${answers.length} answers`);

      if (answers.length > 0) {
        const answer = answers[0];
        const answerMarkdown = turndownService.turndown(answer.body);
        questionObject += `Answer: ${answerMarkdown}\n`;
      }

      const uploadSpinner = ora(`Uploading question: ${question.title}...`).start();
      if (dryRun) {
        console.log(chalk.blue(`[DRY RUN] Would upload ${question.title} to bucket ${bucket}`));
        uploadSpinner.succeed(`Simulated upload of ${question.title}`);
      } else {
        await uploadBuffer(
          bucket,
          Buffer.from(questionObject, "utf-8"),
          `${question.question_id}.md`
        );
        uploadSpinner.succeed(`Uploaded ${question.title}`);
      }
      console.log(chalk.green(`Processed content from question: ${question.title}`));
    }
    console.log(chalk.green("All questions processed and uploaded successfully"));
  } catch (error) {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
})();
}

export { searchStackOverflow };
