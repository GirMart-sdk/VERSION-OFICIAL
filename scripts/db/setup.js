/**
 * WINNER STORE - Asistente de Configuración de Base de Datos
 *
 * Guía al usuario para crear el archivo .env con la URL de la base de datos.
 * Es una alternativa más segura y amigable que un script .bat.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const envPath = path.resolve(__dirname, "..", "..", ".env");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("--- Asistente de Configuración de Base de Datos ---");

if (fs.existsSync(envPath)) {
  console.log("✅ El archivo .env ya existe. No se necesita configuración.");
  rl.close();
  return;
}

rl.question("Usuario de PostgreSQL (ej: postgres): ", (user) => {
  rl.question("Contraseña de PostgreSQL: ", (password) => {
    rl.question("Host (ej: localhost): ", (host) => {
      rl.question("Nombre de la Base de Datos (ej: winner_db): ", (db) => {
        const dbUrl = `postgresql://${user}:${password}@${host}:5432/${db}`;
        const envContent = `DATABASE_URL="${dbUrl}"\n\n# --- Claves de Seguridad (Generar con 'openssl rand -hex 32') ---\nJWT_SECRET=\nADMIN_API_KEY=\nAPI_KEY=\n`;

        fs.writeFileSync(envPath, envContent);
        console.log("\n✅ ¡Perfecto! Se ha creado el archivo .env con tu configuración.");
        console.log("   Ahora necesitas añadir tus claves de seguridad (JWT_SECRET, etc.).");
        rl.close();
      });
    });
  });
});