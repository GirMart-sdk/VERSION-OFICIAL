const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Cargar variables de entorno para obtener la URL de la base de datos
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const backupDir = path.resolve(__dirname, "..", "backups");
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL no está definida en el archivo .env");
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

const command = `pg_dump --dbname="${dbUrl}" --file="${backupFile}" --format=p --verbose`;

exec(command, (error, stdout, stderr) => {
  if (error) return console.error(`❌ Backup fallido: ${stderr}`);
  console.log(`✅ Backup de base de datos creado: ${backupFile}`);
});