module.exports = {
  apps: [
    {
<<<<<<< HEAD
      name: "winner-store",
      script: "./backend/server.js",
=======
      name: "winner-store-backend",
      script: "./backend/server.js",
      interpreter: "node",
      cwd: "c:/DEZPY_v01",
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
<<<<<<< HEAD
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2_err.log",
      out_file: "./logs/pm2_out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
=======
        NODE_ENV: "production",
      },
      // Ejecuta las migraciones de Prisma antes de iniciar el servidor
      // Esto sustituye la lógica del .bat
      cron_restart: "0 0 * * *",
      exp_backoff_restart_delay: 100,
    },
    {
      name: "winner-store-backup-task",
      script: "./scripts/backup-db.bat",
      cwd: "c:/DEZPY_v01",
      cron_restart: "0 3 * * *", // Se ejecuta todos los días a las 3:00 AM
      autorestart: false, // No reiniciar al terminar, esperar al siguiente cron
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
