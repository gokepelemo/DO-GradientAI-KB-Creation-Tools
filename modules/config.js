/**
 * Configuration settings for the KB Creation Tools.
 */
export const config = {
  /**
   * The user agent string for all requests.
   */
  USER_AGENT: "GradientAIToolsv1",

  /**
   * Default bucket region for Spaces.
   */
  DEFAULT_REGION: "us-east-1",

  /**
   * Maximum number of comments to fetch from Reddit.
   */
  MAX_REDDIT_COMMENTS: 10,

  /**
   * Page size for API requests.
   */
  API_PAGE_SIZE: 25,

  /**
   * API base URLs.
   */
  APIs: {
    INTERCOM: "https://api.intercom.io",
    REDDIT_OAUTH: "https://oauth.reddit.com",
    REDDIT_ACCESS_TOKEN: "https://www.reddit.com/api/v1/access_token",
    STACKOVERFLOW: "https://api.stackexchange.com/2.3",
  },
};