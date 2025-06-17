export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  composio: {
    apiKey: process.env.COMPOSIO_API_KEY,
    baseUrl: process.env.COMPOSIO_BASE_URL,
  },
  redirectUri: process.env.REDIRECT_URI,
});
