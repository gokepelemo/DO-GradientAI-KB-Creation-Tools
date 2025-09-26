import puppeteer from 'puppeteer';
import { config } from './config.js';

let browserInstance = null;

/**
 * Get or create a shared browser instance
 */
export const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
};

/**
 * Close the shared browser instance
 */
export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

/**
 * Create a new page with common setup
 */
export const createPage = async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set common headers and user agent
  await page.setUserAgent(config.USER_AGENT);
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });

  return page;
};

/**
 * Navigate to URL with timeout and error handling
 */
export const navigateWithTimeout = async (page, url, timeout = 30000) => {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout
    });
  } catch (error) {
    throw new Error(`Failed to navigate to ${url}: ${error.message}`);
  }
};

/**
 * Check if a URL exists by attempting to navigate with a short timeout
 */
export const checkUrlExists = async (page, url, timeout = 5000) => {
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });
    // Check if the response status is successful (2xx)
    return response && response.status() >= 200 && response.status() < 300;
  } catch (error) {
    return false;
  }
};