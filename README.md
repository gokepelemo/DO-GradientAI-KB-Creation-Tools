# KB Tools

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/gpl-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

**CLI tools for creating knowledge bases for DigitalOcean GradientAI**

Extract, process, and upload documentation from GitHub, Stack Overflow, Reddit, Intercom, and web content to create comprehensive knowledge bases for AI training.

## ✨ Features

- 🚀 **Multiple Data Sources**: GitHub repos, Stack Overflow, Reddit, Intercom, web pages
- 📦 **Document Processing**: PDF, DOCX, TXT, MD files with automatic text extraction
- ☁️ **Cloud Storage**: Direct upload to DigitalOcean Spaces/S3
- 🔧 **Developer Friendly**: Interactive setup, dry-run mode, comprehensive logging
- 🛠️ **Batch Processing**: JSON configuration for complex workflows
- 📋 **LLMs.txt Support**: Crawl documentation sites with LLMs.txt standards

## 🚀 Quick Install

```bash
# Clone and install
git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
cd DO-GradientAI-KB-Creation-Tools

# Run setup script
./install.sh

# Or manual installation
npm install
npm link
```

### Developer Setup

```bash
git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
cd DO-GradientAI-KB-Creation-Tools

# Run developer setup
node setup-dev.js
```

## 📖 Usage

### Basic Commands

```bash
# Show help
kbcreationtools --help

# Crawl a GitHub repository
kbcreationtools github microsoft vscode

# Search Stack Overflow
kbcreationtools stackoverflow "javascript promises"

# Search Reddit posts
kbcreationtools reddit "web development"

# Process a single webpage
kbcreationtools processdoc https://example.com/docs

# Process local documents
kbcreationtools docprocessor my-document.pdf

# Extract links from a webpage
kbcreationtools extractlinks https://example.com output.txt
```

### Advanced Usage

```bash
# Dry run (no uploads)
kbcreationtools github microsoft vscode --dry-run

# Custom bucket
kbcreationtools github microsoft vscode my-custom-bucket

# Batch processing
kbcreationtools batchprocess config.json

# Process LLMs.txt site
kbcreationtools processllms https://example.com/llms.txt docs.json
```

### Environment Setup

The CLI will automatically prompt for required API keys on first use:

```bash
# First run will prompt for GitHub token
kbcreationtools github microsoft vscode

# Will prompt for Reddit credentials
kbcreationtools reddit "javascript"

# Will prompt for Intercom token
kbcreationtools intercom
```

Or configure manually in `.env`:

```env
GITHUB_TOKEN=your_github_token
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
INTERCOM_ACCESS_TOKEN=your_intercom_token
DO_SPACES_BUCKET=your_bucket_name
```

## 🛠️ Developer Tooling Integration

### VS Code Integration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "KB: Crawl Current Repo",
      "type": "shell",
      "command": "kb",
      "args": ["github", "${workspaceFolderBasename}", "HEAD"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Generate Knowledge Base
  run: |
    npm install -g @gokepelemo/kb-tools
    kbcreationtools github ${{ github.repository }} --dry-run
```

### Shell Aliases

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Quick KB commands
alias kb-gh='kbcreationtools github'
alias kb-so='kbcreationtools stackoverflow'
alias kb-rd='kbcreationtools reddit'
alias kb-docs='kbcreationtools processdoc'
```

## �️ Developer Tools & Automation

### Makefile Commands

Use the included `Makefile` for common development tasks:

```bash
# Show all available commands
make help

# Install dependencies and link globally
make install

# Run tests
make test

# Run tests in watch mode
make test-watch

# Generate coverage report
make test-coverage

# Clean build artifacts
make clean

# Developer setup with environment
make setup-dev

# Create a new release
make release

# Quick API tests
make github-test
make stackoverflow-test
make reddit-test
```

### Shell Completion

Enable tab completion for bash/zsh:

```bash
# Source the completion script
source kb-completion.sh

# Or add to your shell profile
echo "source $(pwd)/kb-completion.sh" >> ~/.zshrc
```

### CI/CD Pipeline

The project includes GitHub Actions for automated testing and releases:

- **Test Matrix**: Runs tests on Node.js 18.x and 20.x
- **Build Verification**: Ensures CLI builds and basic commands work

### Project Structure

```text
├── bin/                    # CLI entry points
├── modules/               # Core business logic
├── sources/               # Data source integrations
├── urls/                  # URL processing utilities
├── .github/workflows/     # CI/CD pipelines
├── install.sh            # Installation script
├── setup-dev.js          # Developer setup
├── Makefile              # Development tasks
└── kb-completion.sh      # Shell completion
```

## �📋 Command Reference

### Data Source Commands

| Command | Description | Requirements |
|---------|-------------|--------------|
| `kbcreationtools github <owner> <repo>` | Crawl GitHub repository | GitHub token |
| `kbcreationtools stackoverflow <query>` | Search Stack Overflow | None (API key optional) |
| `kbcreationtools reddit <query>` | Search Reddit posts | Reddit API credentials |
| `kbcreationtools intercom` | Fetch Intercom articles | Intercom access token |

### Content Processing

| Command | Description | Requirements |
|---------|-------------|--------------|
| `kbcreationtools processdoc <url>` | Process single webpage | None |
| `kbcreationtools processurls <file>` | Process URLs from file | None |
| `kbcreationtools extractlinks <url> <output>` | Extract links from webpage | None |
| `kbcreationtools docprocessor <file>` | Process local documents | None |
| `kbcreationtools processllms <url> <output>` | Process LLMs.txt sites | None |

### Workflow Commands

| Command | Description |
|---------|-------------|
| `kbcreationtools batchprocess <config>` | Process multiple sources |
| `kbcreationtools pipestdin <output>` | Process piped input |

### Global Options

- `--dry-run, -d`: Simulate operations without uploading
- `--verbose, -v`: Enable detailed logging
- `--help, -h`: Show help
- `--version, -V`: Show version

## 🔧 Configuration

### Bucket Configuration

Commands that upload data support an optional `[bucket]` parameter:

```bash
kbcreationtools github microsoft vscode my-bucket
```

Priority order:
1. Command argument (highest priority)
2. `DO_SPACES_BUCKET` environment variable
3. Default: `gradientai-kb`

### API Rate Limits

- **GitHub**: 5000 requests/hour with token
- **Stack Overflow**: 300 requests/day (10000 with key)
- **Reddit**: Varies by endpoint
- **Intercom**: Based on plan limits

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a pull request

## 📄 License

GPL-2.0 - See [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**"chalk is not defined"**
- Ensure Node.js v16+ is installed
- Run: `nvm use node` (if using nvm)

**API Authentication Errors**
- Run the command without arguments first to be prompted for credentials
- Check `.env` file has correct API keys

**Upload Failures**
- Verify DigitalOcean Spaces credentials
- Check bucket permissions
- Use `--dry-run` to test without uploading

### Getting Help

```bash
# Show detailed help
kbcreationtools --help

# Command-specific help
kbcreationtools github --help

# Verbose logging
kbcreationtools github microsoft vscode --verbose
```
- Bucket parameter is the **last argument** in all commands where supported

# All commands support --dry-run and --verbose flags
kbcreationtools batchprocess config.json --dry-run --verbose
```

## 🆕 **New CLI Commands**

### Default Behavior: Process Piped Input

When no subcommand is provided, the tool defaults to processing piped stdin input:

```bash
# Default behavior (no subcommand needed)
cat myfile.txt | kbcreationtools output.md
echo "Some content" | kbcreationtools output.txt

# Explicit pipestdin command (same as above)
cat myfile.txt | kbcreationtools pipestdin output.md
```

### Process LLMs.txt Files

The `processllms` command processes content based on what LLMs files are available:

- **If `llms-full.txt` exists**: Downloads and uploads the complete file directly to Spaces
- **If only `llms.txt` exists**: Extracts URLs from the file and processes each URL using the document processing pipeline
- **If neither exists**: Converts the main page body content to plain text or markdown (based on output file extension)

```bash
# Process LLMs content from a website
kbcreationtools processllms https://example.com output.md

# Use dry-run to preview what would be processed
kbcreationtools processllms https://example.com output.md --dry-run
```

The command automatically detects the best processing method based on available LLMs files.

### Process Piped Input (Explicit)

The `pipestdin` command explicitly processes content piped from other commands (same as default behavior):

```bash
# Explicit pipestdin command
echo "Test content" | kbcreationtools pipestdin test.md --dry-run
```

This command:

- Reads all input from stdin
- Creates an output file with the content
- Uploads the file to DigitalOcean Spaces
- Supports both `.txt` and `.md` extensions

## 🔧 **Configuration**

### Environment Variables

Create a `.env` file with your configuration:

```env
# Spaces/S3 Configuration
SPACES_REGION=us-east-1
BUCKET_ENDPOINT=https://your-region.digitaloceanspaces.com
SPACES_BUCKET=your-knowledge-base-bucket

# API Tokens (optional, depending on sources used)
GITHUB_TOKEN=your_github_token
INTERCOM_ACCESS_TOKEN=your_intercom_token
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
STACKOVERFLOW_API_KEY=your_stackoverflow_key
```

### Batch Configuration

See `batch-config-example.json` for a complete configuration example with all supported options.

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏛️ **Architecture Details**

### Core Modules

- **`modules/config.js`**: Centralized configuration constants
- **`modules/validation.js`**: Zod schemas for runtime validation
- **`modules/errorHandling.js`**: Standardized error handling utilities
- **`modules/browser.js`**: Shared Puppeteer browser instance management
- **`modules/apiClients.js`**: Reusable API client classes
- **`modules/uploadToSpaces.js`**: DigitalOcean Spaces upload utilities

### Source Modules

Each source module follows a consistent pattern:

- Export async functions for processing
- Accept `dryRun` parameter for testing
- Use shared utilities for common operations
- Return structured results for batch processing

### CLI Layer

- **Single entry point**: `bin/kbcreationtools.js`
- **Commander.js**: Professional CLI with help, validation, and options
- **Error handling**: Consistent error reporting and exit codes
- **Global options**: `--dry-run`, `--verbose` available on all commands

## 🔒 **Security & Best Practices**

- **Environment variables**: Sensitive data stored securely
- **Input validation**: All user inputs validated with Zod schemas
- **Robots.txt compliance**: Automatic checking before web scraping
- **Rate limiting**: Built-in delays and retry logic for API calls
- **Error boundaries**: Comprehensive error handling prevents crashes

## 📊 **Performance Optimizations**

- **Browser pooling**: Shared Puppeteer instances reduce startup time
- **Connection reuse**: HTTP keep-alive for API requests
- **Batch processing**: Efficient handling of multiple sources
- **Memory management**: Proper cleanup of resources

## 🤝 **Contributing**

1. **Code Style**: Follow existing patterns and use ESLint
2. **Testing**: Add tests for new features with >80% coverage
3. **Documentation**: Update README and inline docs for changes
4. **Validation**: Use Zod schemas for new configuration options

## 📈 **Developer Experience Improvements**

✅ **Unified CLI**: Single command with subcommands instead of separate scripts
✅ **Type Safety**: Runtime validation with Zod prevents configuration errors
✅ **Error Handling**: Consistent, user-friendly error messages
✅ **Testing**: Comprehensive test suite with mocking utilities
✅ **Documentation**: Clear examples and API documentation
✅ **Performance**: Optimized resource usage and faster execution
✅ **Maintainability**: Modular architecture with clear separation of concerns

## Features

- **User Agent**: All requests use the user agent "GradientAIToolsv1".
- **Robots.txt Compliance**: Tools check robots.txt before scraping websites to respect site policies.
- **AWS SDK v3**: Uses the latest AWS SDK for JavaScript v3 for better performance and modern async/await patterns.
- **Progress Indicators**: All async operations show progress spinners using ora.
- **Colored CLI Output**: Progress and error messages are highlighted using chalk for better readability.
- **Dry Run Mode**: All CLI tools support a `--dry-run` flag to simulate operations without actually uploading or writing files.
- **Batch Processing**: Process multiple files and sources using JSON configuration files for automated workflows, supporting documents, web pages, link extraction, sitemaps, GitHub repos, Intercom articles, Reddit searches, Stack Overflow queries, and RSS feeds.
- **Output Format Support**: Generate plain text (.txt) or markdown (.md) formatted output files.

## Getting Started

- Install Node 18+ (required for AWS SDK v3 and modern JavaScript features)
- Run the install script: `./install.sh`
- Use the CLI: `kbcreationtools <subcommand> [options]`

## CLI Usage

After installation, use the `kbcreationtools` command with subcommands:

```bash
kbcreationtools extractlinks <url> [selector] [selectorType] <outputFile> [--dry-run]
kbcreationtools parsesitemap <sitemap file or URL> <output file> [--dry-run]
kbcreationtools processdocs <file> <selector> <selector type: id/class/html tag> <spaces bucket> [--dry-run]
kbcreationtools intercom [bucket] [--dry-run]
kbcreationtools reddit <query> [bucket] [--dry-run]
kbcreationtools stackoverflow <search term> [bucket] [--dry-run]
kbcreationtools processdoc <url> <selector> <selector type: id/class/html tag> <spaces bucket> [--dry-run]
kbcreationtools github <owner> <repo> [--dry-run]
kbcreationtools docprocessor <file> [bucket] [--dry-run]
kbcreationtools batchprocess <config.json> [--dry-run]
```

## Batch Processing

The `batchprocess` command allows you to process multiple files and sources in a single operation using a JSON configuration file. This is useful for setting up automated workflows that process multiple documents, web pages, extract links, parse sitemaps, and crawl various data sources.

### Configuration File Format

Create a JSON file with the following structure:

```json
{
  "defaultBucket": "gradientai-knowledge-base",
  "documents": [
    {
      "file": "path/to/document.pdf",
      "bucket": "optional-specific-bucket"
    }
  ],
  "webPages": [
    {
      "url": "https://example.com/page",
      "selector": "main",
      "selectorType": "css",
      "bucket": "optional-specific-bucket"
    }
  ],
  "linkExtraction": [
    {
      "url": "https://example.com",
      "selector": "nav a",
      "outputFile": "links.txt",
      "processDocs": {
        "selector": "main",
        "selectorType": "css",
        "bucket": "optional-specific-bucket"
      }
    }
  ],
  "sitemaps": [
    {
      "source": "https://example.com/sitemap.xml",
      "outputFile": "urls.txt",
      "processDocs": {
        "selector": "main",
        "selectorType": "css",
        "bucket": "optional-specific-bucket"
      }
    }
  ],
  "github": [
    {
      "owner": "username",
      "repo": "repository",
      "outputFile": "github.md"
    }
  ],
  "intercom": [
    {
      "bucket": "optional-bucket",
      "outputFile": "intercom.md"
    }
  ],
  "reddit": [
    {
      "query": "search term",
      "bucket": "optional-bucket",
      "outputFile": "reddit.md"
    }
  ],
  "stackoverflow": [
    {
      "searchTerm": "query",
      "bucket": "optional-bucket",
      "outputFile": "stackoverflow.md"
    }
  ],
  "rss": [
    {
      "feedUrl": "https://example.com/feed.xml",
      "outputFile": "rss.md"
    }
  ]
}
```

### Automatic Document Processing Integration

The batch processor supports automatic integration with the `processDocs` method for link extraction and sitemap outputs. When you include a `processDocs` configuration in your `linkExtraction` or `sitemaps` entries, the extracted URLs will be automatically processed as documents in the same batch operation.

The `processDocs` configuration supports:

- `selector`: CSS selector to extract content from each URL (default: "body")
- `selectorType`: Type of selector - "css", "id", "class", or HTML tag (default: "css")
- `bucket`: Spaces bucket to upload processed documents (defaults to the entry's bucket or defaultBucket)

This enables seamless workflows where you can extract links from a navigation page and immediately process all those links as documents, or parse a sitemap and process all discovered URLs.

### Output Formats

- **`.txt` extension**: Plain text format
- **`.md` extension**: Markdown format

### Example Usage

```bash
# Process a batch configuration
kbcreationtools batchprocess my-batch-config.json

# Dry run to see what would be processed
kbcreationtools batchprocess my-batch-config.json --dry-run
```

See `batch-config-example.json` for a complete example configuration.

## Tools

- processDoc.js can be used to extract an HTML element from a web page. It uses the query selector method which will select the first element on the DOM if there are multiple elements that match the selector. It extracts the inner text of the element without its HTML tags, and adds the extracted text to a DigitalOcean Spaces bucket for use in a DO GradientAI knowledge base.
  - Usage: `kbcreationtools processdoc <url> <selector> <selector type: id/class/html tag> <spaces bucket> [--dry-run]`
- processDocs.js can be used to extract an HTML element from multiple similar web pages using the query selector method. Using processDoc.js, it loops through a txt file containing a list of links and adds each processed document to a Spaces bucket.
  - Usage: `kbcreationtools processdocs <file> <selector> <selector type: id/class/html tag> <spaces bucket> [--dry-run]`
- stackoverflow.js can be used to extract questions and their top voted answer for a given search term. It uses the StackOverflow API to extract the question and answer. It extracts the question and answer text, converts to markdown, and adds each extracted text as an object to a DigitalOcean Spaces bucket for use in a DO GradientAI knowledge base. In order to get the required API quota from StackOverflow, you must register an app and get an API key from [StackApps](https://stackapps.com/apps/oauth/register).
  - Usage: `kbcreationtools stackoverflow <search term> [bucket] [--dry-run]`
- reddit.js can be used to extract posts from a reddit search query. It uses the Reddit API to extract the post title and post body. It extracts the title and body text, converts to markdown, extracts the comments sorted by votes, and adds each extracted post as an object to a DigitalOcean Spaces bucket for use in a knowledge base. Excludes known job posting subreddits.
  - Usage: `kbcreationtools reddit <search term> [bucket] [--dry-run]`
- parseSitemap.js can be used to extract URLs from a sitemap.xml file to a txt file that can be processed by ./processDocs.js. It uses the sitemap.xml file to extract the URLs of all the pages on a website.
  - Usage: `kbcreationtools parsesitemap <sitemap file or URL> <output file> [--dry-run]`
- extractLinks.js can be used to extract URLs from an HTML element, like a navigation bar from a page, to a text file that can then be used with processDocs.js for crawling HTML pages and adding them to a Spaces bucket for use with a Knowledgebase.
  - Usage: `kbcreationtools extractlinks <url> [selector] [selectorType] <outputFile> [--dry-run]`
- intercom.js fetches all published articles from Intercom and uploads them to a Spaces bucket.
  - Usage: `kbcreationtools intercom [bucket] [--dry-run]`
- githubCrawler.js crawls a GitHub repository, extracting README, issues, and PRs, converting to markdown, and uploading to Spaces.
  - Usage: `kbcreationtools github <owner> <repo> [--dry-run]`
- githubCrawler.js crawls a GitHub repository, extracting README, issues, and PRs, converting to markdown, and uploading to Spaces.
  - Usage: Import and call `crawlGitHubRepo(owner, repo)` (requires GITHUB_TOKEN env var)
- deduplicator.js takes a list of documents, removes duplicates based on similarity, and uploads unique ones to Spaces.
  - Usage: Import and call `deduplicateAndUpload(docs, threshold)`
- kbManager.js provides functions to list, search, and retrieve documents from the Spaces bucket.
  - Usage: Import `listKBContents()`, `searchKB(query)`, `getKBDocument(key)`
- rssFeedCrawler.js parses an RSS feed and processes each item as a document.
  - Usage: Import and call `crawlRSSFeed(feedUrl)`
- docProcessor.js processes local files in various formats (PDF, DOCX, TXT, MD, RST, CSV, TSV, JSON, JSONL, XML, HTML), extracts text, and uploads to Spaces.
  - Usage: `kbcreationtools docprocessor <file> [bucket] [--dry-run]`
- batchProcessor.js processes multiple files and sources based on a JSON configuration file, supporting batch operations for documents, web pages, link extraction, and sitemap processing.
  - Usage: `kbcreationtools batchprocess <config.json> [--dry-run]`

## 📄 **License**

This project is licensed under the GNU General Public License version 2.0 (GPL-2.0). See the [LICENSE](LICENSE) file for details.
