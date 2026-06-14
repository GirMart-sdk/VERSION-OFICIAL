/* ═══════════════════════════════════════════════════════
   WINNER — database-backup.js (PostgreSQL Backup System)
   ═══════════════════════════════════════════════════════ */
"use strict";

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const isProdMode = process.env.NODE_ENV === "production";
let envPath = path.resolve(__dirname, "..", isProdMode ? ".env.production" : ".env");

// Fallback: Si no existe el archivo específico, intentar con el .env genérico
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, "..", ".env");
}

require("dotenv").config({ path: envPath });

const BACKUP_DIR = path.join(__dirname, "../backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Elimina respaldos con más de 7 días de antigüedad
 */
function cleanupOldBackups() {
  const MAX_DAYS = 7;
  const now = Date.now();

  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return;

    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageInDays > MAX_DAYS) {
          fs.unlink(filePath, () => console.log(`🗑️ [Backup] Limpieza: ${file} eliminado por antigüedad.`));
        }
      });
    });
  });
}

/**
 * Ejecuta el comando pg_dump para extraer la estructura y datos
 */
function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `winner_backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // Extraemos la URL de la DB del .env
  let dbUrl = String(process.env.DATABASE_URL || "").trim();

  if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL no encontrada en el archivo .env");
    return;
  }

  // Limpieza profunda: eliminamos comillas de inicio/fin y parámetros de query (?schema=...)
  // Esto garantiza que pg_dump reciba una URI de conexión pura.
  dbUrl = dbUrl.replace(/^["']|["']$/g, "").split("?")[0].trim();

  console.log(`🚀 Iniciando respaldo de Winner Store v3.5...`);

  // Comando para PostgreSQL (requiere tener pg_dump instalado en el sistema)
  const command = `pg_dump "${dbUrl}" > "${filePath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ [Backup] Error al crear el respaldo: ${error.message}`);
      return;
    }
    if (stderr) {
      console.warn(`⚠️ [Backup] Advertencia: ${stderr}`);
    }
    const stats = fs.statSync(filePath);
    const fileSize = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ [Backup] Respaldo completado con éxito: ${fileName} (${fileSize} MB)`);
    cleanupOldBackups();
  });
}

performBackup();
