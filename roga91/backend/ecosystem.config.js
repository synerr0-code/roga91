module.exports = {
  apps: [
    {
      name: 'roga91',
      script: 'server.js',     // Point to your actual entry file
      instances: 'max',          // Use all available CPU cores (2 in your case)
      exec_mode: 'cluster',      // Enable cluster mode
      watch: false,              // Don't use watch in production (it eats CPU)
      env: {
        NODE_ENV: 'production',
        PORT: 3000               // Update if your app uses a different port
      }
    }
  ]
};
