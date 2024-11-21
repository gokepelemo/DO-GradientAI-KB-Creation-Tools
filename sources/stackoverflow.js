#!/usr/bin/env node

import { URL } from "url";
import TurndownService from "turndown";
import { uploadBuffer } from "../modules/uploadToSpaces.js";
import chalk from 'chalk';
import dotenv from 'dotenv';

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
      const response = await fetch(url);
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

const searchStackOverflow = async (query) => {
  const url = new URL('https://api.stackexchange.com/2.3/search/advanced');
  url.searchParams.append('order', 'desc');
  url.searchParams.append('sort', 'activity');
  url.searchParams.append('q', query);
  url.searchParams.append('site', 'stackoverflow');
  url.searchParams.append('filter', 'withbody');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

const fetchAnswerContent = async (questionId) => {
  const url = new URL(`https://api.stackexchange.com/2.3/questions/${questionId}/answers`);
  url.searchParams.append('order', 'desc');
  url.searchParams.append('sort', 'activity');
  url.searchParams.append('site', 'stackoverflow');
  url.searchParams.append('filter', 'withbody');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

(async () => {
  if (process.argv.length < 3) {
    console.log("Usage: ./stackoverflow.js <query> [bucket]");
    process.exit(1);
  }

  const query = process.argv[2];
  const bucket = process.argv[3] || process.env.SPACES_BUCKET || process.env.BUCKET_NAME;

  try {
    const results = await searchStackOverflow(query);
    for (const question of results) {
      let questionObject = `Question: ${question.title}\n`;
      const questionMarkdown = turndownService.turndown(question.body);
      questionObject += `Content: ${questionMarkdown}\n`;
      const answers = await fetchAnswerContent(question.question_id);
      for (const answer of answers) {
        const answerMarkdown = turndownService.turndown(answer.body);
        questionObject += `Answer: ${answerMarkdown}\n`;
      }
      await uploadBuffer(
        bucket,
        Buffer.from(questionObject, "utf-8"),
        `${question.question_id}.md`
      );
      console.log(chalk.green(`Processed and uploaded content from question: ${question.title}`));
    }
    console.log(chalk.green("All questions processed and uploaded successfully"));
  } catch (error) {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
})();
