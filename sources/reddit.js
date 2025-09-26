#!/usr/bin/env node

import { URL, URLSearchParams } from 'url';
import TurndownService from 'turndown';
import { uploadBuffer } from '../modules/uploadToSpaces.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import { config } from '../modules/config.js';

dotenv.config();

const turndownService = new TurndownService();

const fetchAccessToken = async () => {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(config.APIs.REDDIT_ACCESS_TOKEN, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': config.USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });

  const data = await response.json();
  return data.access_token;
};

const fetchAllPages = async (url, accessToken) => {
  let allItems = [];
  let after = null;

  do {
    if (after) {
      url.searchParams.set('after', after);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': config.USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    allItems.push(...data.data.children.map(item => item.data));
    after = data.data.after;
  } while (after);

  return allItems;
};

const searchReddit = async (query, accessToken) => {
  const url = new URL(`${config.APIs.REDDIT_OAUTH}/search`);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '100');

  const results = await fetchAllPages(url, accessToken);
  const jobSubreddits = ['jobboardsearch', 'jobs', 'forhire', 'jobsearch', 'careers'];
  return results.filter(item => item.selftext && item.selftext.length > 0 && !jobSubreddits.includes(item.subreddit));
};

const fetchTopComments = async (postId, subreddit, accessToken) => {
  const url = new URL(`${config.APIs.REDDIT_OAUTH}/r/${subreddit}/comments/${postId}`);
  url.searchParams.append('sort', 'top');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': config.USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data[1].data.children.map(comment => comment.data);
};

const processRedditPosts = async (query, bucket, dryRun = false) => {
  const tokenSpinner = ora('Fetching Reddit access token...').start();
  const accessToken = await fetchAccessToken();
  tokenSpinner.succeed('Access token obtained');

  const searchSpinner = ora(`Searching Reddit for "${query}"...`).start();
  const results = await searchReddit(query, accessToken);
  searchSpinner.succeed(`Found ${results.length} posts`);

  for (const post of results) {
    let postObject = `Title: ${post.title}\n`;
    const postMarkdown = turndownService.turndown(post.selftext);
    postObject += `URL: ${post.url}\n`;
    postObject += `Subreddit: ${post.subreddit}\n`;
    postObject += `Content: ${postMarkdown}\n`;

    const commentSpinner = ora(`Fetching comments for post: ${post.title}...`).start();
    const topComments = await fetchTopComments(post.id, post.subreddit, accessToken);
    commentSpinner.succeed(`Fetched ${topComments.length} comments`);

    let commentNumber = 1;
    for (const comment of topComments) {
      if (!comment.body) {
        continue;
      }
      postObject += `Comment ${commentNumber}: ${comment.body}\n`;
      commentNumber++;
    }

    const uploadSpinner = ora(`Uploading post: ${post.title}...`).start();
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${post.title} to bucket ${bucket ? bucket : process.env.BUCKET_NAME}`));
      uploadSpinner.succeed(`Simulated upload of ${post.title}`);
    } else {
      await uploadBuffer(
        bucket ? bucket : process.env.BUCKET_NAME,
        Buffer.from(postObject, 'utf-8'),
        `${post.subreddit}-${post.id}.md`
      );
      uploadSpinner.succeed(`Uploaded ${post.title}`);
    }
    console.log(chalk.green(`Processed content from post: ${post.title}`));
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.log("Usage: ./reddit.js <query> [bucket] [--dry-run]");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(arg => arg !== '--dry-run');

  const query = filteredArgs[0];
  const bucket = filteredArgs[1];

  processRedditPosts(query, bucket, dryRun)
    .then(() => console.log(chalk.green("Content extracted and uploaded successfully")))
    .catch((error) => {
      console.error(chalk.red("Error:", error));
    });
}

export { processRedditPosts };