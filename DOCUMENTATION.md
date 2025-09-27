# KB Creation Tools - Comprehensive Documentation

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/gpl-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## Table of Contents

- [Purpose](#purpose)
- [Data Sources](#data-sources)
- [Configuration](#configuration)
- [CLI Commands](#cli-commands)
- [Operation Logging & Management](#operation-logging--management)
- [Global Flags](#global-flags)
- [Use Cases & Automation](#use-cases--automation)
- [Stdin Processing Feature](#stdin-processing-feature)
- [Troubleshooting](#troubleshooting)
- [Contributing & Bug Reports](#contributing--bug-reports)

## Purpose

KB Creation Tools is a comprehensive CLI utility designed to simplify the ingestion of content
into DigitalOcean GradientAI agent's knowledge bases. The tool automates the extraction,
processing, and uploading of documentation from multiple sources, making it easier for
developers, product managers, and system administrators to build rich knowledge bases
for retrieval-augmented generation (RAG) applications.

### Key Benefits

- **Multi-Source Content Ingestion**: Extract content from GitHub repositories, Stack Overflow,
  Reddit, Intercom, web pages, and local documents
- **Automated Processing**: Handle PDF, DOCX, TXT, and MD files with automatic text extraction
- **Cloud Integration**: Direct upload to DigitalOcean Spaces or AWS S3
- **GradientAI Integration**: Automatic indexing job creation for seamless knowledge base updates
- **Batch Processing**: Process multiple sources with JSON configuration files
- **Pipeline Automation**: Perfect for CI/CD pipelines and automated content workflows

## Data Sources

The tool supports content extraction from the following sources:

### 🌐 **Web Content**

- **Single Web Pages**: Extract content from any URL with CSS selectors
- **Bulk URL Processing**: Process multiple URLs from a file
- **LLMs.txt Support**: Crawl documentation sites following LLMs.txt standards
- **Sitemap Processing**: Extract and process all URLs from XML sitemaps

#### 🤖 Robots.txt Compliance

This tool **respects robots.txt by default** and automatically checks website policies before
crawling. To prevent this tool from accessing your website, add the following lines to your
`robots.txt` file:

```robots.txt
User-agent: kbcreationtools
Disallow: /
```

This will block all crawling by the KB Creation Tools. You can also block specific paths:

```robots.txt
User-agent: kbcreationtools
Disallow: /private/
Disallow: /admin/
Disallow: /api/
```

### 📚 **Developer Platforms**

- **GitHub Repositories**: Crawl code repositories, README files, and documentation
- **Stack Overflow**: Search and extract Q&A content by topic
- **Reddit**: Gather community discussions and posts

### 💬 **Support & Communication**

- **Intercom**: Extract help articles and support documentation

### 📄 **Document Files**

- **Local Files**: Process PDF, DOCX, TXT, and MD files
- **RSS Feeds**: Extract content from RSS feeds and blogs

### 🔗 **Link Extraction**

- Extract and optionally process links from web pages

## Configuration

### Environment Variables

Create a `.env` file in your project root or set environment variables:

```env
# Required API Tokens (prompted interactively on first use)
GITHUB_TOKEN=your_github_personal_access_token
REDDIT_CLIENT_ID=your_reddit_app_client_id
REDDIT_CLIENT_SECRET=your_reddit_app_client_secret
INTERCOM_ACCESS_TOKEN=your_intercom_api_token
STACKOVERFLOW_KEY=your_stackoverflow_api_key

# Cloud Storage (choose one)
DO_SPACES_BUCKET=your_spaces_bucket_name
DO_SPACES_ENDPOINT=https://your-region.digitaloceanspaces.com
DO_SPACES_ACCESS_KEY=your_spaces_access_key
DO_SPACES_SECRET_KEY=your_spaces_secret_key

# OR for AWS S3
AWS_BUCKET_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_s3_bucket_name

# GradientAI Integration (optional)
DIGITALOCEAN_ACCESS_TOKEN=your_digitalocean_token
GRADIENTAI_KNOWLEDGE_BASE_UUID=your_kb_uuid
GRADIENTAI_AUTO_INDEX=true
```

### Interactive Setup

The tool will prompt for missing API credentials on first use:

```bash
kbcreationtools github microsoft vscode
# Follow prompts to enter required tokens
```

## CLI Commands

All uploads are organized using a structured path format: `{operationId}/{uploadHash}/{filename}`.
The operation ID is derived from the source (e.g., repository name, domain), and the upload hash is a
(truncated…)

### Core Commands

#### `kbcreationtools [outputFile] [bucket]`

Process piped stdin content to a file and optionally upload to cloud storage.

```bash
# Process text content from stdin
echo "Your content here" | kbcreationtools output.txt

# With cloud upload
echo "Content" | kbcreationtools output.txt my-bucket
```

#### `kbcreationtools github <owner> <repo> [bucket]`

Crawl a GitHub repository and extract documentation.

```bash
# Basic repository crawl
kbcreationtools github microsoft vscode

# With custom bucket
kbcreationtools github facebook react my-docs-bucket

# With GradientAI indexing
kbcreationtools github microsoft vscode --auto-index --knowledge-base-uuid 123e4567-e89b-12d3-a456-426614174000
```

#### `kbcreationtools stackoverflow <query> [bucket]`

Search Stack Overflow for questions and answers.

```bash
# Search by topic
kbcreationtools stackoverflow "javascript async await"

# Search with tags
kbcreationtools stackoverflow "python pandas dataframe"

# With custom bucket
kbcreationtools stackoverflow "react hooks" my-stackoverflow-bucket
```

#### `kbcreationtools reddit <query> [bucket]`

Search Reddit posts and discussions.

```bash
# Search Reddit posts
kbcreationtools reddit "machine learning"

# Search specific subreddits
kbcreationtools reddit "python programming"

# With custom bucket
kbcreationtools reddit "kubernetes" my-reddit-bucket
```

#### `kbcreationtools intercom [bucket]`

Extract all articles from Intercom help center.

```bash
# Extract Intercom articles
kbcreationtools intercom

# With custom bucket
kbcreationtools intercom my-support-bucket
```

### Content Processing Commands

#### `kbcreationtools processdoc <url> [selector] [selectorType] [bucket]`

Process a single webpage and extract content.

```bash
# Process entire page
kbcreationtools processdoc https://docs.example.com/guide

# Extract specific content with CSS selector
kbcreationtools processdoc https://docs.example.com main .content

# Extract with XPath selector
kbcreationtools processdoc https://docs.example.com //div[@class='content'] xpath

# With custom bucket
kbcreationtools processdoc https://docs.example.com main my-docs-bucket
```

#### `kbcreationtools processurls <filePath> [selector] [selectorType] [bucket]`

Process multiple URLs from a file.

```bash
# Process URLs from file
kbcreationtools processurls urls.txt

# With custom selector and bucket
kbcreationtools processurls urls.txt main my-docs-bucket
```

#### `kbcreationtools docprocessor <filePath> [bucket]`

Process local document files (PDF, DOCX, TXT, MD).

```bash
# Process a PDF file
kbcreationtools docprocessor documentation.pdf

# Process multiple formats
kbcreationtools docprocessor api-reference.docx
kbcreationtools docprocessor changelog.md

# With custom bucket
kbcreationtools docprocessor guide.pdf my-docs-bucket
```

### Utility Commands

#### `kbcreationtools extractlinks <url> [selector] [selectorType] <outputFile> [bucket]`

Extract links from a webpage and save to file.

```bash
# Extract all links from navigation
kbcreationtools extractlinks https://docs.example.com "nav a" css links.txt

# Extract with XPath
kbcreationtools extractlinks https://docs.example.com "//a[@href]" xpath links.txt

# With cloud upload
kbcreationtools extractlinks https://docs.example.com "nav a" css links.txt my-bucket
```

#### `kbcreationtools parsesitemap <url> <outputFile> [bucket]`

Parse XML sitemap and extract all URLs.

```bash
# Parse sitemap and save URLs
kbcreationtools parsesitemap https://docs.example.com/sitemap.xml urls.txt

# With cloud upload
kbcreationtools parsesitemap https://docs.example.com/sitemap.xml urls.txt my-bucket
```

#### `kbcreationtools processllms <url> <outputFile> [bucket]`

Process documentation sites following LLMs.txt standards.

```bash
# Process LLMs.txt compatible site
kbcreationtools processllms https://docs.example.com llms-content.md

# With cloud upload
kbcreationtools processllms https://docs.example.com llms-content.md my-bucket
```

### Batch Processing Commands

#### `kbcreationtools batchprocess <configFile>`

Process multiple sources using a JSON configuration file.

```bash
# Process batch configuration
kbcreationtools batchprocess batch-config.json

# Use example configuration
kbcreationtools batchprocess batch-config-example.json
```

#### `kbcreationtools validate-config <configFile>`

Validate a batch configuration JSON file for syntax, structure, and data integrity before processing.

```bash
# Validate configuration file
kbcreationtools validate-config batch-config.json

# Validate example configuration
kbcreationtools validate-config batch-config-example.json
```

The validator checks for:

- JSON syntax validity
- Required configuration fields
- File existence for document processing
- URL format validation
- Bucket name format compliance
- Data structure validation for all supported sections

#### `kbcreationtools pipestdin <outputFile> [bucket]`

Explicitly process piped stdin content (alternative to default behavior).

```bash
# Process piped content
cat content.txt | kbcreationtools pipestdin output.txt

# With bucket
cat content.txt | kbcreationtools pipestdin output.txt my-bucket
```

### Management Commands

#### `kbcreationtools delete [operationId] [bucket]`

Delete all uploads from a specific operation ID or operation\\hash combination. If no operation ID is
specified, lists available operations for interactive selection.

```bash
# Delete all uploads from an operation
kbcreationtools delete microsoft-vscode my-bucket

# Delete uploads from a specific hash within an operation
kbcreationtools delete microsoft-vscode\a1b2c3d4 my-bucket

# Interactive selection - lists operations and prompts for choice
kbcreationtools delete

# Use default bucket from environment
kbcreationtools delete github-repo-abc123
```

#### `kbcreationtools list-operations [bucket]`

List all logged operations from both bucket and local logs.

```bash
# Show all operations
kbcreationtools list-operations
```

## Operation Logging & Management

The tool provides comprehensive operation logging to track all upload activities, enabling system
administrators to monitor, manage, and troubleshoot content ingestion operations.

### 📊 **Log Storage**

Operations are logged to two locations for redundancy and accessibility:

- **Bucket Logs**: Successful operations stored in your cloud storage bucket at `.kbcreationtools/log`
- **Local Logs**: All operations (successful and failed) stored on the local machine at `~/.kbcreationtools/log`

**Note**: Failed operations are logged locally only to avoid cluttering cloud storage with error entries.

### 📋 **Log Contents**

Each log entry contains detailed operation information:

```json
{
  "timestamp": "2025-09-26T10:30:00.000Z",
  "username": "sysadmin",
  "operationId": "microsoft-vscode",
  "uploadHash": "a1b2c3d4",
  "sourceType": "github",
  "documentsProcessed": 15,
  "documentDetails": ["README.md", "docs/api.md", ...],
  "totalSizeBytes": 245760,
  "totalSizeMB": "0.23",
  "operationParams": {
    "url": "https://github.com/microsoft/vscode",
    "sourceType": "github"
  }
}
```

Failed operations include additional error information:

```json
{
  "timestamp": "2025-09-26T10:35:00.000Z",
  "username": "sysadmin",
  "operationId": "example-com",
  "uploadHash": "e5f6g7h8",
  "sourceType": "webpage",
  "status": "failed",
  "error": "Connection timeout",
  "documentsProcessed": 0,
  "documentDetails": [],
  "totalSizeBytes": 0,
  "totalSizeMB": "0.00",
  "operationParams": {
    "url": "https://example.com/docs",
    "sourceType": "webpage",
    "selector": ".content",
    "selectorType": "css"
  }
}
```

### 🔍 **Finding Operations**

System administrators can locate specific operations using the `list-operations` command:

```bash
# List all operations from bucket and local logs
kbcreationtools list-operations

# List operations from specific bucket
kbcreationtools list-operations --bucket my-bucket
```

### 🗑️ **Deleting Operations Before Updates**

Before uploading new versions of content, parse the log file to identify and remove previous
operations. Each operation has a unique `operationId` and `uploadHash` for precise targeting.

```bash
# 1. List operations to find the operation ID and upload hash
kbcreationtools list-operations

# 2. Delete specific operation (removes all uploads for that operation)
kbcreationtools delete microsoft-vscode

# 3. Delete specific upload hash within an operation (more precise)
kbcreationtools delete microsoft-vscode/a1b2c3d4

# 4. Re-run the operation with updated content
kbcreationtools github microsoft vscode
```

#### **Automated Cleanup with jq**

Use `jq` to parse logs and automate cleanup in cron scripts:

```bash
#!/bin/bash
# Cron script: Clean up old GitHub repo operations before weekly updates

# Find operations older than 7 days for a specific repo
OLD_OPERATIONS=$(jq -r 'select(.sourceType == "github" and (.operationParams.url // "" | \
contains("microsoft/vscode"))) | select((now - (.timestamp | fromdate)) > (7 * 24 * 60 * 60)) | \
.operationId' ~/.kbcreationtools/log)

# Delete old operations
for op in $OLD_OPERATIONS; do
  echo "Deleting old operation: $op"
  kbcreationtools delete "$op"
done

# Re-run the operation with fresh content
kbcreationtools github microsoft vscode
```

#### **Extract Operation Details with jq**

Parse logs to extract specific operation parameters for reuse:

```bash
# Get the latest operation ID for a specific source
LATEST_OP=$(jq -r 'select(.sourceType == "github" and (.operationParams.url // "" | \
contains("microsoft/vscode"))) | select(.status != "failed") | .operationId' ~/.kbcreationtools/log | tail -1)

# Get operation parameters as shell variables
OP_DETAILS=$(jq -r 'select(.operationId == "'$LATEST_OP'") | {operationId, uploadHash, sourceType, \
url: .operationParams.url}' ~/.kbcreationtools/log | tail -1)

# Extract individual values
OP_ID=$(echo "$OP_DETAILS" | jq -r '.operationId')
UPLOAD_HASH=$(echo "$OP_DETAILS" | jq -r '.uploadHash')
SOURCE_URL=$(echo "$OP_DETAILS" | jq -r '.url')

echo "Latest operation: $OP_ID (hash: $UPLOAD_HASH) from $SOURCE_URL"
```

#### **Advanced jq Use Cases**

```bash
# Find failed operations for retry
FAILED_OPS=$(jq -r 'select(.status == "failed") | \
  select(.timestamp | fromdate > (now - 86400)) | .operationId' ~/.kbcreationtools/log)

# Get operations by source type with document counts
OP_STATS=$(jq -r 'select(.status != "failed") | \
  "\(.sourceType): \(.documentsProcessed) docs, \(.totalSizeMB)MB"' ~/.kbcreationtools/log | sort | uniq -c)

# Find operations that processed specific files
DOC_OPS=$(jq -r 'select(.documentDetails[] | contains("README.md")) | \
  .operationId' ~/.kbcreationtools/log)

# Extract URLs from webpage operations for re-crawling
WEB_URLS=$(jq -r 'select(.sourceType == "webpage") | .operationParams.url' \
  ~/.kbcreationtools/log | sort | uniq)

# Monitor operation success rate
SUCCESS_RATE=$(jq -r 'select(.timestamp | fromdate > (now - 604800)) | \
  if .status == "failed" then 0 else 1 end' ~/.kbcreationtools/log | \
  awk '{sum+=$1; count++} END {print sum/count*100 "% success rate"}')

# Get largest operations by size
LARGE_OPS=$(jq -r 'select(.totalSizeBytes > 1000000) | \
  "\(.operationId): \(.totalSizeMB)MB"' ~/.kbcreationtools/log | sort -k2 -n -r | head -5)
```

### 📤 **Log Forwarding**

Local log files can be forwarded to remote logging services for centralized monitoring:

```bash
# Example: Forward logs to a remote syslog server
tail -f ~/.kbcreationtools/log | logger -n log.example.com -P 514 -t kbcreationtools

# Example: Forward to Elasticsearch or other log aggregation services
tail -f ~/.kbcreationtools/log | curl -X POST -H "Content-Type: application/json" \
  -d @- https://logging.example.com/api/logs
```

### 🚨 **Failure Monitoring**

Failed operations are automatically logged with error details, enabling:

- **Automated Alerts**: Set up monitoring to detect failed operations
- **Retry Logic**: Parse logs to identify and retry failed operations
- **Root Cause Analysis**: Detailed error information for troubleshooting

```bash
# Monitor for failed operations
grep '"status":"failed"' ~/.kbcreationtools/log | jq -r '.error'

# Count failures by source type
grep '"status":"failed"' ~/.kbcreationtools/log | jq -r '.operationParams.sourceType' | sort | uniq -c
```

## Global Flags

### Core Flags

#### `--dry-run, -d`

Simulate operations without actually uploading to cloud storage or creating indexing jobs.

```bash
# Test operations without side effects
kbcreationtools github microsoft vscode --dry-run

# Combine with verbose for detailed output
kbcreationtools processdoc https://docs.example.com --dry-run --verbose
```

#### `--verbose, -v`

Enable detailed logging and progress information.

```bash
# Show detailed operation logs
kbcreationtools github microsoft vscode --verbose

# Useful for debugging issues
kbcreationtools processdoc https://docs.example.com --verbose
```

### GradientAI Integration Flags

#### `--auto-index`

Automatically create a GradientAI indexing job after successful upload.

```bash
# Auto-create indexing job (requires --knowledge-base-uuid)
kbcreationtools github microsoft vscode --auto-index --knowledge-base-uuid 123e4567-e89b-12d3-a456-426614174000
```

#### `--knowledge-base-uuid <uuid>`

Specify the GradientAI knowledge base UUID for indexing jobs.

```bash
# Create indexing job for specific knowledge base
kbcreationtools github microsoft vscode --knowledge-base-uuid 123e4567-e89b-12d3-a456-426614174000
```

#### `--data-source-uuids <uuids>`

Specify GradientAI data source UUIDs for indexing (comma-separated).

```bash
# Index specific data sources
kbcreationtools github microsoft vscode --data-source-uuids "uuid1,uuid2,uuid3"
```

#### `--gradientai-token <token>`

Provide DigitalOcean access token for GradientAI operations.

```bash
# Use specific token
kbcreationtools github microsoft vscode --gradientai-token your_token_here
```

### Cloud Storage Flags

#### `--bucket <name>`

Specify DigitalOcean Spaces or AWS S3 bucket name.

```bash
# Override default bucket
kbcreationtools github microsoft vscode --bucket my-custom-bucket
```

#### `--bucket-endpoint <url>`

Specify custom Spaces/S3 endpoint URL.

```bash
# Custom endpoint
kbcreationtools github microsoft vscode --bucket-endpoint https://custom.endpoint.com
```

#### `--bucket-region <region>`

Specify AWS region for S3 buckets.

```bash
# AWS S3 region
kbcreationtools github microsoft vscode --bucket-region us-west-2
```

### API Token Flags

#### `--github-token <token>`

Provide GitHub personal access token.

```bash
# Override environment token
kbcreationtools github microsoft vscode --github-token your_token_here
```

#### `--intercom-token <token>`

Provide Intercom API access token.

```bash
kbcreationtools intercom --intercom-token your_token_here
```

#### `--reddit-client-id <id>` & `--reddit-client-secret <secret>`

Provide Reddit API credentials.

```bash
kbcreationtools reddit "topic" --reddit-client-id your_id --reddit-client-secret your_secret
```

#### `--stackoverflow-key <key>`

Provide Stack Overflow API key.

```bash
kbcreationtools stackoverflow "query" --stackoverflow-key your_key
```

### System Administration Flags

#### `--operation-id <id>` (hidden)

Specify a custom operation ID for sys admin updates. When provided with `--upload-hash`, \
allows updating an existing operation's output file in place.

```bash
# Update existing operation with specific ID and hash
kbcreationtools github microsoft vscode --operation-id vscode-docs --upload-hash a1b2c3d4
```

#### `--upload-hash <hash>` (hidden)

Specify a custom upload hash for sys admin updates. Must be used with `--operation-id` \
to update existing operations.

```bash
# Resume or update specific operation
kbcreationtools processdoc https://docs.example.com --operation-id example-com --upload-hash e5f6g7h8
```

**Note**: These flags are intended for system administrators to update existing operations. \
The output file will be uploaded to the same cloud storage path as the original operation.

## Use Cases & Automation

### Content Development Pipelines

#### Automated Documentation Updates

```bash
#!/bin/bash
# Update documentation nightly
kbcreationtools github your-org docs --auto-index --knowledge-base-uuid $KB_UUID
kbcreationtools processdoc https://your-docs.com/changelog --bucket docs-bucket
```

#### Multi-Source Knowledge Base Building

```json
// batch-config.json
{
  "kbcreationtools": "1.0",
  "github": [
    {"owner": "your-org", "repo": "api-docs"},
    {"owner": "your-org", "repo": "user-guide"}
  ],
  "webPages": [
    {"url": "https://docs.yourcompany.com/api"},
    {"url": "https://docs.yourcompany.com/tutorials"}
  ],
  "stackoverflow": [
    {"searchTerm": "your-product"}
  ]
}
```

```bash
# Process entire knowledge base
kbcreationtools batchprocess batch-config.json
```

### Developer Pipelines

#### CI/CD Integration

```yaml
# .github/workflows/update-docs.yml
name: Update Documentation
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install KB Tools
        run: |
          git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
          cd DO-GradientAI-KB-Creation-Tools
          ./install.sh
      - name: Update Knowledge Base
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DO_TOKEN }}
        run: |
          kbcreationtools batchprocess batch-config.json --auto-index --knowledge-base-uuid ${{ secrets.KB_UUID }}
```

#### Ephemeral CI Environment Operations

In temporary environments like CI jobs, you can pull operation logs from the bucket to \
continue or update existing operations using specific operation IDs and hashes.

```yaml
# .github/workflows/incremental-updates.yml
name: Incremental Content Updates
on:
  push:
    branches: [ main ]
    paths:
      - 'docs/**'

jobs:
  update-content:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install KB Tools
        run: |
          git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
          cd DO-GradientAI-KB-Creation-Tools
          ./install.sh
      - name: Pull Operation Logs
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Pull latest operation logs from bucket
          aws s3 cp s3://your-bucket/.kbcreationtools/log ./operation-log.jsonl --region us-east-1
          
          # Extract the latest successful operation for this repository
          LATEST_OP=$(jq -r 'select(.status == "success" and (.sourceType == "github" or \
            .sourceType == "processdoc")) | select(.timestamp | fromdate > (now - 86400)) | \
            .operationId' ./operation-log.jsonl | tail -1)
          
          if [ -n "$LATEST_OP" ]; then
            echo "Found existing operation: $LATEST_OP"
            echo "OPERATION_ID=$LATEST_OP" >> $GITHUB_ENV
            
            # Extract upload hash for the operation
            UPLOAD_HASH=$(jq -r "select(.operationId == \"$LATEST_OP\") | .uploadHash" ./operation-log.jsonl | tail -1)
            echo "UPLOAD_HASH=$UPLOAD_HASH" >> $GITHUB_ENV
          fi
      - name: Update Content
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DO_TOKEN }}
        run: |
          if [ -n "$OPERATION_ID" ] && [ -n "$UPLOAD_HASH" ]; then
            echo "Updating existing operation $OPERATION_ID with hash $UPLOAD_HASH"
            # Update the existing operation in place
            kbcreationtools github your-org docs --operation-id $OPERATION_ID \
              --upload-hash $UPLOAD_HASH --auto-index --knowledge-base-uuid ${{ secrets.KB_UUID }}
          else
            echo "No existing operation found, creating new one"
            kbcreationtools github your-org docs --auto-index --knowledge-base-uuid ${{ secrets.KB_UUID }}
          fi

This approach enables:
- **Incremental Updates**: Continue existing operations instead of creating duplicates
- **Resource Efficiency**: Reuse existing cloud storage paths and indexing jobs
- **Cost Optimization**: Avoid redundant processing in ephemeral environments
- **State Continuity**: Maintain operation history across CI runs

```bash
# Manual equivalent for local development
# Pull logs and extract operation details
aws s3 cp s3://your-bucket/.kbcreationtools/log ./operation-log.jsonl
OP_ID=$(jq -r 'select(.status == "success") | .operationId' ./operation-log.jsonl | tail -1)
HASH=$(jq -r "select(.operationId == \"$OP_ID\") | .uploadHash" ./operation-log.jsonl | tail -1)

# Update existing operation
kbcreationtools processdoc https://docs.example.com --operation-id $OP_ID --upload-hash $HASH
```

#### Pre-commit Documentation Checks

```bash
#!/bin/bash
# pre-commit hook to validate documentation
echo "Validating documentation..."

# Extract links from new docs
kbcreationtools extractlinks https://docs.yourcompany.com nav a links.txt --dry-run

# Process documentation files
kbcreationtools docprocessor docs/*.md --dry-run --verbose

echo "Documentation validation complete"
```

### System Administration Use Cases

#### Automated Content Ingestion

```bash
#!/bin/bash
# Cron job for weekly content updates
# 0 3 * * 1 /path/to/update-content.sh

# Update from multiple sources
kbcreationtools github your-org product-docs --bucket weekly-updates
kbcreationtools stackoverflow "your product" --bucket support-content
kbcreationtools reddit "your product" --bucket community-content

# Process RSS feeds
kbcreationtools rssfeed https://blog.yourcompany.com/rss.xml --bucket blog-content
```

#### Backup and Archival

```bash
#!/bin/bash
# Archive documentation quarterly
DATE=$(date +%Y-%m-%d)
kbcreationtools batchprocess quarterly-backup.json --bucket archive-$DATE
```

#### Monitoring and Alerting

```bash
#!/bin/bash
# Monitor documentation changes
if kbcreationtools processdoc https://docs.yourcompany.com --dry-run | grep -q "changes detected"; then
    echo "Documentation updated, triggering re-indexing"
    kbcreationtools processdoc https://docs.yourcompany.com --auto-index --knowledge-base-uuid $KB_UUID
fi
```

## Stdin Processing Feature

### Overview

The stdin processing feature allows you to pipe content directly into the tool, making it perfect for
automation and integration with other command-line tools.

### Basic Usage

```bash
# Pipe text content
echo "Your documentation content here" | kbcreationtools output.txt

# Pipe from files
cat documentation.md | kbcreationtools processed-docs.txt

# Pipe from other commands
curl https://api.example.com/docs | jq -r '.content' | kbcreationtools api-docs.txt
```

### Batch Configuration via Stdin

The most powerful feature is the ability to pipe JSON batch configurations directly:

```bash
# Pipe batch configuration
cat batch-config.json | kbcreationtools

# Or from generated JSON
echo '{"kbcreationtools": "1.0", "github": [{"owner": "microsoft", "repo": "vscode"}]}' | kbcreationtools
```

### Validation and Auto-Detection

The tool automatically detects whether piped input is:

1. **Batch Configuration**: JSON with `"kbcreationtools": "1.0"` key
2. **Text Content**: Requires output filename parameter

```bash
# Valid batch config (processed automatically)
echo '{"kbcreationtools": "1.0", "github": []}' | kbcreationtools

# Text content (requires output file)
echo "plain text content" | kbcreationtools output.txt

# Invalid input (shows helpful error)
echo '{"invalid": "config"}' | kbcreationtools
```

### Advanced Automation Examples

#### Dynamic Content Processing

```bash
#!/bin/bash
# Process content from API responses
curl -s https://api.github.com/repos/microsoft/vscode/readme \
  | jq -r '.content' \
  | base64 -d \
  | kbcreationtools vscode-readme.md
```

#### CI/CD Pipeline Integration

```yaml
# GitHub Actions workflow
- name: Process Generated Documentation
  run: |
    # Generate docs from code comments
    ./generate-docs.sh > temp-docs.md
    # Process and upload
    cat temp-docs.md | kbcreationtools processed-docs.md docs-bucket
    # Cleanup
    rm temp-docs.md
```

#### Log Processing and Analysis

```bash
#!/bin/bash
# Process application logs for knowledge base
tail -n 1000 /var/log/application.log \
  | grep "ERROR\|WARN" \
  | kbcreationtools error-analysis.txt logs-bucket
```

## Troubleshooting

### Common Issues

#### "chalk is not defined"

```bash
# Upgrade to Node.js v18+ - this tool requires Node.js v18 or higher
node --version  # Should show v18+
# If you have an older version, upgrade Node.js first
```

#### API Authentication Errors

```bash
# Run any command without arguments to be prompted for tokens
kbcreationtools github
# Or check/set environment variables
echo $GITHUB_TOKEN
```

#### Upload Failures

```bash
# Test with dry-run first
kbcreationtools github microsoft vscode --dry-run

# Check bucket permissions
# Verify DO_SPACES_* or AWS_* environment variables
```

#### Memory Issues with Large Repositories

```bash
# Process in smaller batches
kbcreationtools github large-org large-repo --verbose

# Use batch processing for large operations
kbcreationtools batchprocess large-batch-config.json
```

### Getting Help

```bash
# Show general help
kbcreationtools --help

# Show command-specific help
kbcreationtools github --help
kbcreationtools processdoc --help

# Verbose logging for debugging
kbcreationtools github microsoft vscode --verbose
```

## Contributing & Bug Reports

### Bug Reports

If you find any bugs or issues, please create an issue on GitHub:

1. Go to [Issues](https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools/issues)
2. Click "New Issue"
3. Choose "Bug Report" template
4. Provide detailed information:
   - CLI version (`kbcreationtools --version`)
   - Node.js version (`node --version`)
   - Operating system
   - Command that caused the issue
   - Full error output
   - Steps to reproduce

### Feature Requests

For feature requests or enhancements:

1. Check existing [Issues](https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools/issues) for similar requests
2. Create a new issue with "Feature Request" template
3. Describe the use case and expected behavior

### Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Setup

```bash
# Clone and setup
git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
cd DO-GradientAI-KB-Creation-Tools
./install.sh

# Development workflow
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

For quick reference, see the [README](README.md). For the latest updates, visit the [GitHub repository](https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools).
