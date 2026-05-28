"use strict";

/* ═══════════════════════════════════════════════════════════
   BACKUP AUTOMÁTICO - Base de datos local
   Respalda winner_store.db automáticamente
   ═══════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

// Configuración
const dbPath = path.join(__dirname, "../backend/winner_store.db");
const backupDir = path.join(__dirname, "../backups");
const maxBackups = 30; // Mantener últimos 30 backups

// Generar nombre con fecha (YYYYMMDD_HHMMSS)
const now = new Date();
const timestamp =
  now.getFullYear() +
  String(now.getMonth() + 1).padStart(2, "0") +
  String(now.getDate()).padStart(2, "0") +
  "_" +
  String(now.getHours()).padStart(2, "0") +
  String(now.getMinutes()).padStart(2, "0") +
  String(now.getSeconds()).padStart(2, "0");

const backupFilename = `winner_store_${timestamp}.db`;
const backupPath = path.join(backupDir, backupFilename);

// Crear carpeta de backups si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

try {
  // Verificar que BD existe
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Base de datos no encontrada: ${dbPath}`);
    process.exit(1);
  }

  // Hacer backup
  fs.copyFileSync(dbPath, backupPath);

  // Obtener información del archivo
  const stats = fs.statSync(backupPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const displaySize = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           ✅ BACKUP CREADO CORRECTAMENTE                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`📁 Archivo: ${backupFilename}`);
  console.log(`📊 Tamaño: ${displaySize}`);
  console.log(`📍 Ubicación: ${backupDir}`);
  console.log("");

  // Listar backups existentes
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("winner_store_"))
    .map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime,
    }))
    .sort((a, b) => b.time - a.time);

  console.log(`📋 Backups existentes: ${files.length}`);
  console.log("");

  // Mostrar últimos 5 backups
  console.log("📚 Últimos backups:");
  files.slice(0, 5).forEach((f, idx) => {
    const date = f.time.toLocaleString("es-CO");
    const size = (fs.statSync(f.path).size / 1024).toFixed(2);
    console.log(`   ${idx + 1}. ${f.name} (${size} KB) - ${date}`);
  });
  console.log("");

  // Limpiar backups antiguos (mantener máximo)
  if (files.length > maxBackups) {
    console.log(`🗑️  Limpiando backups antiguos (máximo: ${maxBackups})...`);
    const toDelete = files.slice(maxBackups);
    toDelete.forEach((f) => {
      fs.unlinkSync(f.path);
      console.log(`   ❌ Eliminado: ${f.name}`);
    });
    console.log("");
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ Backup completado exitosamente                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
} catch (error) {
  console.error("");
  console.error(
    "╔════════════════════════════════════════════════════════════╗",
  );
  console.error(
    "║           ❌ ERROR EN BACKUP                              ║",
  );
  console.error(
    "╚════════════════════════════════════════════════════════════╝",
  );
  console.error("");
  console.error(`Mensaje: ${error.message}`);
  console.error("");
  process.exit(1);
}
