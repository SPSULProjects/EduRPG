// Development-specific Next.js configuration
// This file can be used to override settings for development

const nextDevConfig = {
  // Disable certain features in development that might conflict with browser extensions
  experimental: {
    // Disable React strict mode in development to reduce console warnings
    reactStrictMode: false,
  },
  
  // Development server configuration
  devServer: {
    // Disable host checking to avoid browser extension conflicts
    allowedHosts: 'all',
    // Set up proper headers for development
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  
  // Webpack configuration for development
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable source maps for faster builds (optional)
      // config.devtool = false;
      
      // Add better error handling
      config.stats = {
        errorDetails: true,
        children: true,
      };
    }
    
    return config;
  },
};

module.exports = nextDevConfig;
