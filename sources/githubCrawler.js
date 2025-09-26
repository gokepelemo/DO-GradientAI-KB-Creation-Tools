import { Octokit } from '@octokit/rest';
import { processDoc } from '../modules/processDoc.js';
import { uploadBuffer } from '../modules/uploadToSpaces.js';
import { config } from '../modules/config.js';
import ora from 'ora';
import chalk from 'chalk';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

export async function crawlGitHubRepo(owner, repo, bucket, dryRun = false) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const repoSpinner = ora(`Crawling GitHub repo ${owner}/${repo}...`).start();

  try {
    // Get README
    const readmeSpinner = ora('Fetching README...').start();
    const readme = await octokit.repos.getReadme({ owner, repo });
    const readmeContent = Buffer.from(readme.data.content, 'base64').toString();
    const markdown = turndownService.turndown(readmeContent);
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${owner}-${repo}-README.md to ${bucket}`));
      readmeSpinner.succeed('README simulated upload');
    } else {
      await uploadBuffer(bucket, Buffer.from(markdown, 'utf-8'), `${owner}-${repo}-README.md`);
      readmeSpinner.succeed('README uploaded');
    }

    // Get issues
    const issuesSpinner = ora('Fetching issues...').start();
    const issues = await octokit.issues.listForRepo({ owner, repo, state: 'all', per_page: 100 });
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${issues.data.length} issues to ${bucket}`));
      issuesSpinner.succeed(`Simulated upload of ${issues.data.length} issues`);
    } else {
      for (const issue of issues.data) {
        if (issue.body) {
          const issueMd = `# ${issue.title}\n\n${issue.body}`;
          await uploadBuffer(bucket, Buffer.from(issueMd, 'utf-8'), `${owner}-${repo}-issue-${issue.number}.md`);
        }
      }
      issuesSpinner.succeed(`Uploaded ${issues.data.length} issues`);
    }

    // Get PRs
    const prsSpinner = ora('Fetching pull requests...').start();
    const prs = await octokit.pulls.list({ owner, repo, state: 'all', per_page: 100 });
    if (dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would upload ${prs.data.length} PRs to ${bucket}`));
      prsSpinner.succeed(`Simulated upload of ${prs.data.length} PRs`);
    } else {
      for (const pr of prs.data) {
        if (pr.body) {
          const prMd = `# ${pr.title}\n\n${pr.body}`;
          await uploadBuffer(bucket, Buffer.from(prMd, 'utf-8'), `${owner}-${repo}-pr-${pr.number}.md`);
        }
      }
      prsSpinner.succeed(`Uploaded ${prs.data.length} PRs`);
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