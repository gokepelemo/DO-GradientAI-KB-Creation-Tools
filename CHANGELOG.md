# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-09-26

### Added

- **GradientAI Indexing Integration**: Complete support for creating indexing jobs after successful uploads
  - New CLI flags: `--gradientai-token`, `--knowledge-base-uuid`, `--data-source-uuids`, `--auto-index`
  - Interactive prompts for knowledge base UUID when not provided via flags
  - Automatic indexing option that creates indexing jobs immediately after uploads
  - Direct integration with DigitalOcean GradientAI API for job creation
  - Comprehensive error handling and user feedback for indexing operations

### Changed

- Enhanced CLI with new global options for GradientAI indexing
- Improved user experience with interactive prompts and progress indicators
- Updated environment variable schema to include GradientAI configuration

### Testing

- Added comprehensive Jest test suite for GradientAI functionality
- Mocked API calls for reliable testing of indexing job creation
- Error scenario testing for API failures and invalid inputs

## [1.1.0] - 2025-09-25

### Added

- **LLMs.txt Processing Support**: Added comprehensive LLMs.txt processing to batch operations
  - Support for both `llms-full.txt` and `llms.txt` files
  - Automatic detection and processing of LLMs-compliant documentation sites
  - Integration with batch processing system for multiple sites
  - Enhanced documentation and configuration examples

### Fixed

- CLI hanging issue after LLMs processing completion
- CI/CD integration documentation for correct installation method

### Changed

- Simplified project structure by removing Homebrew/Docker tooling
- Standardized command name to `kbcreationtools` across documentation
- Cleaned up repository for production deployment

### Documentation

- Updated README.md with comprehensive batch processing examples
- Added LLMs configuration examples to batch-config-example.json
- Improved installation and usage documentation

## [1.0.0] - 2024-11-24

### Features

- Initial release of KB Creation Tools for DigitalOcean GradientAI
- CLI tools for processing various data sources:
  - Web pages and documents
  - GitHub repositories
  - Intercom articles
  - Reddit posts
  - Stack Overflow questions
  - RSS feeds
  - Sitemap parsing
  - Link extraction
- Batch processing capabilities
- DigitalOcean Spaces integration
- Markdown conversion support
- PDF and DOCX document processing
- Command-line interface with multiple processing commands
- Batch configuration file support
- Dry-run mode for testing
- Verbose logging options
- Environment variable configuration
- Error handling and progress indicators
