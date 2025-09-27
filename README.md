# KB Tools

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/gpl-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

CLI tools for creating knowledge bases for DigitalOcean GradientAI

Extract, process, and upload documentation from GitHub, Stack Overflow, Reddit, Intercom,
and web content to create comprehensive knowledge bases for retrieval augmented generation.

📖 **[Comprehensive Documentation](DOCUMENTATION.md)** - Complete guide for beginners, product managers, and sys admins

## ✨ Features

- 🚀 **Multiple Data Sources**: GitHub repos, Stack Overflow, Reddit, Intercom, web pages
- 📦 **Document Processing**: PDF, DOCX, TXT, MD files with automatic text extraction
- ☁️ **Cloud Storage**: Direct upload to DigitalOcean Spaces or AWS S3
- 🤖 **GradientAI Integration**: Automatic indexing job creation after uploads
- 🔧 **Developer Friendly**: Interactive setup, dry-run mode, comprehensive logging
- 🛠️ **Batch Processing**: JSON configuration for complex workflows
- 📋 **LLMs.txt Support**: Crawl documentation sites with LLMs.txt standards
- 🗂️ **Operation Management**: Track, list, and delete upload operations with unique hashes

## 🚀 Quick Start

```bash
# Install
git clone https://github.com/gokepelemo/DO-GradientAI-KB-Creation-Tools.git
cd DO-GradientAI-KB-Creation-Tools
./install.sh

# Basic usage
kbcreationtools github microsoft vscode
kbcreationtools stackoverflow "javascript promises"
kbcreationtools processdoc https://example.com/docs
```

## 🤖 GradientAI Indexing

Create indexing jobs automatically after successful uploads:

```bash
# Automatic indexing with knowledge base UUID
kbcreationtools github microsoft vscode --auto-index --knowledge-base-uuid 123e4567-e89b-12d3-a456-426614174000

# Specify data sources for indexing
kbcreationtools github microsoft vscode --knowledge-base-uuid 123e4567-e89b-12d3-a456-426614174000 --data-source-uuids "uuid1,uuid2,uuid3"

# Interactive mode (prompts for UUID if not provided)
kbcreationtools github microsoft vscode
```

## 📖 Usage

### Basic Commands

```bash
# Data sources
kbcreationtools github <owner> <repo>          # Crawl GitHub repository
kbcreationtools stackoverflow <query>          # Search Stack Overflow
kbcreationtools reddit <query>                 # Search Reddit posts
kbcreationtools intercom                       # Fetch Intercom articles

# Content processing
kbcreationtools processdoc <url>               # Process single webpage
kbcreationtools docprocessor <file>            # Process local documents
kbcreationtools extractlinks <url> <output>    # Extract links from webpage

# Workflows
kbcreationtools batchprocess <config.json>     # Process multiple sources
kbcreationtools validate-config <config.json>  # Validate batch config
kbcreationtools processllms <url> <output>     # Process LLMs.txt sites

# Utilities
kbcreationtools --help                         # Show help
kbcreationtools --version                      # Show version
```

### Global Options

- `--dry-run, -d`: Simulate operations without uploading
- `--verbose, -v`: Enable detailed logging
- `--auto-index`: Create GradientAI indexing job after upload
- `--knowledge-base-uuid <uuid>`: Knowledge base UUID for indexing
- `--data-source-uuids <uuids>`: Comma-separated data source UUIDs
- `--gradientai-token <token>`: DigitalOcean access token

### Environment Setup

The CLI automatically prompts for required API keys on first use. Or configure manually in `.env`:

```env
# Required for data sources
GITHUB_TOKEN=your_github_token
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
INTERCOM_ACCESS_TOKEN=your_intercom_token

# Cloud storage (choose one)
DO_SPACES_BUCKET=your_bucket_name
# OR for AWS S3:
AWS_BUCKET_REGION=us-east-1

# GradientAI (optional)
DIGITALOCEAN_ACCESS_TOKEN=your_digitalocean_token
GRADIENTAI_KNOWLEDGE_BASE_UUID=your_kb_uuid
GRADIENTAI_AUTO_INDEX=true
```

## 🛠️ Batch Processing

Process multiple sources with a JSON configuration file:

```bash
```bash
# Using a config file
kbcreationtools batchprocess config.json

# Or pipe a config directly (auto-detected by "kbcreationtools" key)
cat config.json | kbcreationtools
```

All kbcreationtools configuration files must include a top-level `"kbcreationtools"` key to identify them as valid configurations.

See [`batch-config-example.json`](batch-config-example.json) for complete configuration options.

## 🏗️ Project Structure

```text
├── bin/                    # CLI entry points
├── modules/               # Core business logic
├── sources/               # Data source integrations
├── urls/                  # URL processing utilities
├── tests/                 # Test suite
├── install.sh            # Installation script
├── setup-dev.js          # Developer setup
├── Makefile              # Development tasks
└── kb-completion.sh      # Shell completion
```

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

GPL-2.0 - See [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### "chalk is not defined"

- Ensure Node.js v18+ is installed
- Run: `nvm use node`

#### API Authentication Errors

- Run commands without arguments first to be prompted for credentials
- Check `.env` file has correct API keys

#### Upload Failures

- Verify DigitalOcean Spaces or AWS S3 credentials
- Check bucket permissions
- Use `--dry-run` to test without uploading

### Getting Help

```bash
kbcreationtools --help
kbcreationtools <command> --help
```

## 🔒 Security & Best Practices

- **Robots.txt Compliance**: Automatically checks website policies before crawling
- **Rate Limiting**: Built-in delays and retry logic for API calls
- **Input Validation**: All inputs validated with Zod schemas
- **Error Boundaries**: Comprehensive error handling prevents crashes

## 📈 Performance

- **Browser Pooling**: Shared Puppeteer instances reduce startup time
- **Connection Reuse**: HTTP keep-alive for API requests
- **Batch Processing**: Efficient handling of multiple sources
- **Memory Management**: Proper cleanup of resources

## 🐛 Bug Reports

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
