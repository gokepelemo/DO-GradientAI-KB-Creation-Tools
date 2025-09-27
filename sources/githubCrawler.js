import { Octokit } from '@octokit/rest';
import { processDoc } from '../modules/processDoc.js';
import { uploadBuffer } from '../modules/uploadToSpaces.js';
import { config } from '../modules/config.js';
// import ora from 'ora';
import chalk from 'chalk';
import TurndownService from 'turndown';

// Simple spinner replacement for ora compatibility
class SimpleSpinner {
  constructor(text) {
    this.text = text;
  }
  start() {
    console.log(`${this.text}...`);
    return this;
  }
  succeed(text) {
    console.log(`✅ ${text || this.text}`);
  }
  fail(text) {
    console.log(`❌ ${text || this.text}`);
  }
  warn(text) {
    console.log(`⚠️  ${text || this.text}`);
  }
}

const ora = (text) => new SimpleSpinner(text);

// Timeout utility function
function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

const turndownService = new TurndownService();

export async function crawlGitHubRepo(owner, repo, bucket, dryRun = false) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const repoSpinner = ora(`Crawling GitHub repo ${owner}/${repo}...`).start();

  let totalSizeBytes = 0;
  const documentsProcessed = [];

  try {
    // Check if repo exists first
    const repoCheckSpinner = ora('Checking repository access...').start();
    try {
      await withTimeout(octokit.repos.get({ owner, repo }), 10000);
      repoCheckSpinner.succeed('Repository access confirmed');
    } catch (error) {
      repoCheckSpinner.fail(`Repository ${owner}/${repo} not found or access denied: ${error.message}`);
      return { documentsProcessed: [], totalSizeBytes: 0 };
    }

    // Get README with timeout and error handling
    const readmeSpinner = ora('Fetching README...').start();
    try {
      const readme = await withTimeout(octokit.repos.getReadme({ owner, repo }), 15000);
      const readmeContent = Buffer.from(readme.data.content, 'base64').toString();
      const markdown = turndownService.turndown(readmeContent);
      const readmeSize = Buffer.byteLength(markdown, 'utf-8');
      const readmeFileName = `${owner}-${repo}-README.md`;

      if (dryRun) {
        console.log(chalk.blue(`[DRY RUN] Would upload ${readmeFileName} to ${bucket}`));
        readmeSpinner.succeed('README simulated upload');
      } else {
        await uploadBuffer(bucket, Buffer.from(markdown, 'utf-8'), readmeFileName);
        readmeSpinner.succeed('README uploaded');
        totalSizeBytes += readmeSize;
        documentsProcessed.push(readmeFileName);
      }
    } catch (error) {
      if (error.status === 404) {
        readmeSpinner.warn('No README found in repository');
      } else {
        readmeSpinner.fail(`Failed to fetch README: ${error.message}`);
      }
      // Continue with other operations even if README fails
    }

    // Get issues
    const issuesSpinner = ora('Fetching issues...').start();
    try {
      const issues = await withTimeout(octokit.issues.listForRepo({ owner, repo, state: 'all', per_page: 100 }), 20000);
      if (dryRun) {
        console.log(chalk.blue(`[DRY RUN] Would upload ${issues.data.length} issues to ${bucket}`));
        issuesSpinner.succeed(`Simulated upload of ${issues.data.length} issues`);
      } else {
        for (const issue of issues.data) {
          if (issue.body) {
            const issueMd = `# ${issue.title}\n\n${issue.body}`;
            const issueFileName = `${owner}-${repo}-issue-${issue.number}.md`;
            const issueSize = Buffer.byteLength(issueMd, 'utf-8');
            await uploadBuffer(bucket, Buffer.from(issueMd, 'utf-8'), issueFileName);
            totalSizeBytes += issueSize;
            documentsProcessed.push(issueFileName);
          }
        }
        issuesSpinner.succeed(`Uploaded ${issues.data.length} issues`);
      }
    } catch (error) {
      issuesSpinner.fail(`Failed to fetch issues: ${error.message}`);
      // Continue with other operations
    }

    // Get PRs
    const prsSpinner = ora('Fetching pull requests...').start();
    try {
      const prs = await withTimeout(octokit.pulls.list({ owner, repo, state: 'all', per_page: 100 }), 20000);
      if (dryRun) {
        console.log(chalk.blue(`[DRY RUN] Would upload ${prs.data.length} PRs to ${bucket}`));
        prsSpinner.succeed(`Simulated upload of ${prs.data.length} PRs`);
      } else {
        for (const pr of prs.data) {
          if (pr.body) {
            const prMd = `# ${pr.title}\n\n${pr.body}`;
            const prFileName = `${owner}-${repo}-pr-${pr.number}.md`;
            const prSize = Buffer.byteLength(prMd, 'utf-8');
            await uploadBuffer(bucket, Buffer.from(prMd, 'utf-8'), prFileName);
            totalSizeBytes += prSize;
            documentsProcessed.push(prFileName);
          }
        }
        prsSpinner.succeed(`Uploaded ${prs.data.length} PRs`);
      }
    } catch (error) {
      prsSpinner.fail(`Failed to fetch PRs: ${error.message}`);
      // Continue
    }

    repoSpinner.succeed(`Crawled GitHub repo: ${owner}/${repo}`);
  } catch (error) {
    repoSpinner.fail(`Error crawling GitHub repo ${owner}/${repo}: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const args = process.argv.slice(2).filter(arg => arg !== '--dry-run');
  const owner = args[0];
  const repo = args[1];

  if (!owner || !repo) {
    console.log('Usage: ./sources/githubCrawler.js <owner> <repo> [--dry-run]');
    process.exit(1);
  }

  crawlGitHubRepo(owner, repo, dryRun);
}