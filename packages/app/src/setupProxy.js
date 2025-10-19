/**
 * Proxy setup for development server
 * Routes API requests to the backend running on port 7007
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:7007',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api',
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(503).json({ error: 'Backend service unavailable' });
      },
    })
  );
};
