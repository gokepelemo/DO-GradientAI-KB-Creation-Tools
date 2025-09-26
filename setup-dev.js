#!/usr/bin/env node

// Developer setup script for KB Tools
// This script helps developers get started quickly

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up KB Tools for development...\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file...');
    const defaultEnv = `# KB Tools Environment Configuration
# Add your API keys and configuration here

# GitHub API (required for GitHub crawling)
# GITHUB_TOKEN=your_github_token_here

# DigitalOcean Spaces (optional, defaults to gradientai-kb)
# DO_SPACES_BUCKET=your_bucket_name

# Intercom API (required for Intercom articles)
# INTERCOM_ACCESS_TOKEN=your_intercom_token

# Reddit API (required for Reddit posts)
# REDDIT_CLIENT_ID=your_reddit_client_id
# REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Stack Overflow API (optional, increases rate limits)
# STACKOVERFLOW_API_KEY=your_stackoverflow_key
`;

    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ Created .env file with template configuration');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
}

// Link globally for development
console.log('🔗 Linking CLI globally...');
try {
    execSync('npm link', { stdio: 'inherit' });
    console.log('✅ CLI linked globally');
} catch (error) {
    console.log('⚠️  Global linking failed (you may need sudo)');
}

// Run tests
console.log('🧪 Running tests...');
try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ Tests passed');
} catch (error) {
    console.log('⚠️  Some tests failed - check implementation');
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Run: kb --help');
console.log('3. Try: kb github microsoft vscode --dry-run');
console.log('\nFor development:');
console.log('- npm run test:watch  # Run tests in watch mode');
console.log('- npm run build        # Build for production');