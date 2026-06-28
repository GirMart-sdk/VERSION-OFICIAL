/**
 * WINNER STORE - Robust Database Backup Script (Node.js)
 *
 * Replaces backup-db.bat for cross-platform compatibility and better integration.
 * Reads database configuration from the .env file.
 */
"use strict";

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Cargar variables de entorno para acceder a la configuración de la DB
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

const projectRoot = path.resolve(__dirname, "..", "..");
const backupDir = path.join(projectRoot, "backups");

function getDbConfigFromUrl(dbUrl) {
  try {
    const url = new URL(dbUrl);
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1),
    };
  } catch (e) {
    console.error("❌ URL de base de datos inválida en .env");
    return null;
  }
}

async function runBackup() {
  console.log("[*] Iniciando respaldo de la base de datos...");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dbConfig = getDbConfigFromUrl(process.env.DATABASE_URL);
  if (!dbConfig) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `winner_backup_${timestamp}.sql`;
  const filePath = path.join(backupDir, fileName);

  // Establecer la contraseña para pg_dump de forma segura
  const env = { ...process.env, PGPASSWORD: dbConfig.password };

  const command = `pg_dump -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database} -f "${filePath}"`;

  console.log("[*] Ejecutando pg_dump...");

  exec(command, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ERROR CRÍTICO: El respaldo falló.`);
      console.error(`   Mensaje: ${error.message}`);
      console.error(`   Detalle: ${stderr}`);
      fs.writeFileSync(
        path.join(backupDir, "last_error.log"),
        `[${new Date().toISOString()}] ${stderr}`
      );
      return;
    }

    console.log(`✅ Respaldo completado con éxito: ${fileName}`);

    // Lógica de limpieza (ejemplo: borrar backups de más de 30 días)
    fs.readdir(backupDir, (err, files) => {
      if (err) return;
      // eslint-disable-next-line no-unused-vars
      files.forEach(file => {
        // Lógica de borrado por fecha aquí si es necesario
      });
    });
  });
}

runBackup();