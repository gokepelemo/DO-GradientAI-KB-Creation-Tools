import { config } from './config.js';

/**
 * Constructs a CSS selector based on type.
 * @param {string} selector - The selector value.
 * @param {string} type - The type: 'id', 'class', or 'tag'.
 * @returns {string} The constructed selector.
 * @throws {Error} If type is invalid.
 */
export const constructSelector = (selector, type) => {
  switch (type) {
    case "id":
      return `#${selector}`;
    case "class":
      return `.${selector}`;
    case "tag":
      return selector;
    default:
      throw new Error("Invalid selector type. Use 'id', 'class', or 'tag'.");
  }
};

/**
 * Checks if the given URL is allowed by the site's robots.txt for the specified user agent.
 * @param {string} url - The URL to check.
 * @param {string} userAgent - The user agent string.
 * @returns {boolean} True if allowed, false otherwise.
 */
export const checkRobotsTxt = async (url, userAgent) => {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      // If robots.txt doesn't exist, assume allowed
      return true;
    }
    const robotsTxt = await response.text();
    const lines = robotsTxt.split('\n');
    let currentUserAgent = '';
    let disallowed = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('User-agent:')) {
        currentUserAgent = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('Disallow:') && (currentUserAgent === '*' || currentUserAgent === userAgent)) {
        const path = trimmed.split(':')[1].trim();
        disallowed.push(path);
      }
    }
    // Check if the path is disallowed
    const path = urlObj.pathname;
    for (const disallow of disallowed) {
      if (disallow === '/' || path.startsWith(disallow)) {
        return false;
      }
    }
    return true;
  } catch (error) {
    // If error fetching robots.txt, assume allowed
    return true;
  }
};