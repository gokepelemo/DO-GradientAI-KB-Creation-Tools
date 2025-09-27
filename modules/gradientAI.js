import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Create an indexing job for a knowledge base using direct API calls
 * @param {string} accessToken - DigitalOcean access token
 * @param {string} knowledgeBaseUuid - UUID of the knowledge base
 * @param {string[]} dataSourceUuids - Array of data source UUIDs to index
 * @returns {Promise<Object>} - Indexing job response
 */
export async function createIndexingJob(accessToken, knowledgeBaseUuid, dataSourceUuids = []) {
  const spinner = ora('Creating indexing job...').start();

  try {
    const response = await fetch('https://api.digitalocean.com/v2/gen-ai/indexing_jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        knowledge_base_uuid: knowledgeBaseUuid,
        data_source_uuids: dataSourceUuids
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();

    spinner.succeed(chalk.green(`Indexing job created successfully!`));
    console.log(chalk.blue(`Job UUID: ${data.job.uuid}`));
    console.log(chalk.blue(`Status: ${data.job.status}`));
    console.log(chalk.blue(`Knowledge Base: ${data.job.knowledge_base_uuid}`));
    if (dataSourceUuids.length > 0) {
      console.log(chalk.blue(`Data Sources: ${dataSourceUuids.join(', ')}`));
    }

    return data.job;
  } catch (error) {
    spinner.fail(chalk.red('Failed to create indexing job'));
    throw error;
  }
}

/**
 * Prompt user for indexing job parameters
 * @param {Object} inquirer - Inquirer instance
 * @returns {Promise<Object>} - User responses
 */
export async function promptForIndexingJob(inquirer) {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createJob',
      message: 'Would you like to create an indexing job for this upload?',
      default: false
    },
    {
      type: 'input',
      name: 'knowledgeBaseUuid',
      message: 'Enter the Knowledge Base UUID:',
      when: (answers) => answers.createJob,
      validate: (input) => {
        if (!input.trim()) {
          return 'Knowledge Base UUID is required';
        }
        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(input)) {
          return 'Please enter a valid UUID';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'dataSourceUuids',
      message: 'Enter Data Source UUIDs (comma-separated, optional):',
      when: (answers) => answers.createJob,
      filter: (input) => {
        return input.split(',').map(uuid => uuid.trim()).filter(uuid => uuid.length > 0);
      }
    }
  ]);

  return answers;
}