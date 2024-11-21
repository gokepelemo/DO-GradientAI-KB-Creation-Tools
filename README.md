# Knowledgebase Creation Tools for DigitalOcean GenAI Platform

This repository contains tools to create knowledge bases for the DigitalOcean GenAI platform.

## Getting Started
- Install Node 23+
- Install dependencies: `npm install`
- Run your tool of choice

## Tools

- processDoc.js can be used to extract an HTML element from a web page. It uses the query selector method, which will select the first element on the DOM if there are multiple elements that match the selector. It extracts the inner text of the element, without its HTML tags and adds the extracted text to a DigitalOcean Spaces bucket for use in a DO GenAI knowledge base.
  - Usage: `./modules/processDoc.js <url> <selector> <selector type: id/class/html tag>`
- stackoverflow.js can be used to extract questions and their top voted answer for a given search term. It uses the StackOverflow API to extract the question and answer. It extracts the question and answer text, converts to markdown, and adds each extracted text as an object to a DigitalOcean Spaces bucket for use in a DO GenAI knowledge base. In order to get the required API quota from StackOverflow, you must register an app and get an API key from [StackApps](https://stackapps.com/apps/oauth/register).
  - Usage: `./stackoverflow.js <search term> <spaces bucket name>`
- reddit.js can be used to extract posts from a reddit search query. It uses the Reddit API to extract the post title and post body. It extracts the title and body text, converts to markdown, extracts the comments sorted by votes, and adds each extracted post as an object to a DigitalOcean Spaces bucket for use in a knowledge base. Excludes known job posting subreddits.
  - Usage: `./reddit.js <search term> <number of comments> <spaces bucket name>`
- ./sitemaps/parse-sitemap.sh can be used to extract URLs from a sitemap.xml file to a txt file that can be processed by ./process-docs.sh. It uses the sitemap.xml file to extract the URLs of all the pages on a website.
  - Usage: `./sitemaps/parse-sitemap.sh <sitemap.xml file or url> <regex> <output.txt file>`