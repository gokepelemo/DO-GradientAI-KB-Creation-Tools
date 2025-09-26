.PHONY: help install test clean build release setup-dev

# Default target
help: ## Show this help message
	@echo "KB Tools - Developer Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install dependencies and link globally
	npm install
	npm link

setup-dev: ## Developer setup with environment and dependencies
	node setup-dev.js

# Testing
test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage
	npm run test:coverage

# Development
lint: ## Run linting (if configured)
	@echo "Linting not yet configured"

format: ## Format code (if prettier configured)
	@echo "Code formatting not yet configured"

# Building
build: ## Build for production
	npm run build

# Release
release: ## Create a new release
	@echo "Creating release..."
	@read -p "Enter version (e.g., 1.2.0): " version; \
	git tag -a v$$version -m "Release v$$version"; \
	git push origin v$$version; \
	echo "Release v$$version created"

# Cleanup# Cleanup
clean: ## Clean build artifacts
	rm -rf node_modules
	rm -rf coverage
	rm -f *.log

clean-all: clean ## Clean everything including global links
	npm unlink -g
	rm -f .env

# CI/CD
ci: test build ## Run CI pipeline locally

# Quick commands for common tasks
github-test: ## Test GitHub functionality
	./bin/cli.js github microsoft vscode --dry-run

reddit-test: ## Test Reddit functionality (requires credentials)
	./bin/cli.js reddit "javascript" --dry-run

stackoverflow-test: ## Test Stack Overflow functionality
	./bin/cli.js stackoverflow "javascript array methods" --dry-run

all-tests: github-test stackoverflow-test ## Run all API tests (except those requiring credentials)