module.exports = {
  apps: [
    {
      name: "winner-store-backend",
      script: "./backend/server.js",
      interpreter: "node",
      cwd: "C:/MI TIENDA/WINNER",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      cron_restart: "0 0 * * *",
      exp_backoff_restart_delay: 100,
    },
    {
      name: "winner-store-backup-task",
      script: "./scripts/backup-db.bat",
      cwd: "C:/MI TIENDA/WINNER",
      cron_restart: "0 3 * * *", // Se ejecuta todos los días a las 3:00 AM
      autorestart: false, // No reiniciar al terminar, esperar al siguiente cron
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
