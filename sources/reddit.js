#!/usr/bin/env node

import { URL, URLSearchParams } from 'url';
import TurndownService from 'turndown';
import { uploadBuffer } from '../modules/uploadToSpaces.js';
import { Buffer } from 'buffer';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const turndownService = new TurndownService();

const fetchAccessToken = async () => {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
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
        'User-Agent': 'KnowledgebaseCreationTools/0.1.0'
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
  const url = new URL('https://oauth.reddit.com/search');
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '100');

  const results = await fetchAllPages(url, accessToken);
  return results.filter(item => item.selftext && item.selftext.length > 0 && item.subreddit !== 'jobboardsearch');
};

const fetchTopComments = async (postId, subreddit, accessToken) => {
  const url = new URL(`https://oauth.reddit.com/r/${subreddit}/comments/${postId}`);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'KnowledgebaseCreationTools/0.1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data[1].data.children.map(comment => comment.data);
};

const processRedditPosts = async (query, bucket) => {
  const accessToken = await fetchAccessToken();
  const results = await searchReddit(query, accessToken);

  for (const post of results) {
    let postObject = `Title: ${post.title}\n`;
    const postMarkdown = turndownService.turndown(post.selftext);
    postObject += `URL: ${post.url}\n`;
    postObject += `Subreddit: ${post.subreddit}\n`;
    postObject += `Content: ${postMarkdown}\n`;

    const topComments = await fetchTopComments(post.id, post.subreddit, accessToken);
    let commentNumber = 1;
    for (const comment of topComments) {
      if (!comment.body) {
        continue;
      }
      postObject += `Comment ${commentNumber}: ${comment.body}\n`;
      commentNumber++;
    }

    await uploadBuffer(
      bucket ? bucket : process.env.BUCKET_NAME,
      Buffer.from(postObject, 'utf-8'),
      `${post.subreddit}-${post.id}.md`
    );
    console.log(chalk.green(`Processed and uploaded content from post: ${post.title}`));
  }
};

if (import.meta.url === new URL(import.meta.url).href) {
  if (process.argv.length < 3) {
    console.log("Usage: ./reddit.js <query> [bucket]");
    process.exit(1);
  }

  const query = process.argv[2];
  const bucket = process.argv[3];

  processRedditPosts(query, bucket)
    .then(() => console.log(chalk.green("Content extracted and uploaded successfully")))
    .catch((error) => {
      console.error(chalk.red("Error:", error));
    });
}

export { processRedditPosts };