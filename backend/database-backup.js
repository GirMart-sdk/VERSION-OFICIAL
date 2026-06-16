/* ═══════════════════════════════════════════════════════
   WINNER — database-backup.js (PostgreSQL Backup System)
   ═══════════════════════════════════════════════════════ */
"use strict";

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const BACKUP_DIR = path.join(__dirname, "../backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Ejecuta el comando pg_dump para extraer la estructura y datos
 */
function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `winner_backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // Extraemos la URL de la DB del .env
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL no encontrada en el archivo .env");
    return;
  }

  console.log(`🚀 Iniciando respaldo de Winner Store v3.5...`);

  // Comando para PostgreSQL (requiere tener pg_dump instalado en el sistema)
  const command = `pg_dump "${dbUrl}" > "${filePath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error al crear el respaldo: ${error.message}`);
      return;
    }
    if (stderr) {
      console.warn(`⚠️ Advertencia: ${stderr}`);
    }
    console.log(`✅ Respaldo completado con éxito: ${fileName}`);
  });
}

performBackup();
