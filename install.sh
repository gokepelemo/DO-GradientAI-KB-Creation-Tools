#!/bin/bash

# Install script for KB Creation Tools CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    print_info "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="16.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    print_warning "Node.js $NODE_VERSION detected. Node.js $REQUIRED_VERSION or higher recommended."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install --production
fi

# Link the package globally
print_info "Installing CLI globally..."
npm link

print_success "Installation complete!"
echo ""
echo "Available commands:"
echo "  kbcreationtools --help                    # Show help"
echo "  kbcreationtools github <owner> <repo>     # Crawl GitHub repository"
echo "  kbcreationtools reddit <query>           # Search Reddit posts"
echo "  kbcreationtools stackoverflow <query>    # Search Stack Overflow"
echo "  kbcreationtools intercom                  # Fetch Intercom articles"
echo "  kbcreationtools processdoc <url>         # Process single webpage"
echo "  kbcreationtools processurls <file>       # Process URLs from file"
echo "  kbcreationtools extractlinks <url>       # Extract links from webpage"
echo "  kbcreationtools docprocessor <file>      # Process local documents"
echo "  kbcreationtools batchprocess <config>    # Process multiple sources"
echo ""
echo "All upload commands support optional [bucket] parameter"
echo "Use --dry-run flag to test without uploading"
echo ""
echo "For more information: kbcreationtools --help"