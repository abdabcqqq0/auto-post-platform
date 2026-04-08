module.exports = {
  apps: [
    {
      name: 'auto-post-platform',
      script: './dist/index.js',
      cwd: '/www/wwwroot/auto-post-platform',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
    },
  ],
};
