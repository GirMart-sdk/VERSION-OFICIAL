/**
 * WINNER STORE - Módulo de Configuración Centralizada
 *
 * Carga y valida las variables de entorno desde el archivo .env apropiado.
 * Exporta un objeto de configuración para ser usado en toda la aplicación.
 */
"use strict";

const path = require("path");
const fs = require("fs");

// 1. Cargar configuración de entorno
const isProdMode = process.env.NODE_ENV === "production";
const envPath = path.resolve(
  __dirname,
  "..",
  "..",
  isProdMode ? ".env.production" : ".env",
);

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
  console.log(`📡 [Config] Entorno cargado desde: ${path.basename(envPath)}`);
} else {
  require("dotenv").config();
}

// 2. Validación de variables de entorno críticas
const requiredEnvVars = [
  "JWT_SECRET",
  "ADMIN_API_KEY",
  "API_KEY",
  "DATABASE_URL",
];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `❌ [Error Crítico] Faltan variables de entorno esenciales: ${missingVars.join(", ")}`,
  );
  console.error("   El servidor no puede iniciar. Revisa tu archivo .env");
  process.exit(1); // Detiene el servidor si faltan claves
}

// 3. Validación de Mailer (Evita error: Missing credentials for "PLAIN")
const requiredMailVars = ["SMTP_USER", "SMTP_PASS"];
const missingMailVars = requiredMailVars.filter((v) => !process.env[v]);
if (missingMailVars.length > 0) {
  console.warn(
    `⚠️  [Mailer] Advertencia: Faltan credenciales (${missingMailVars.join(", ")}). El envío de correos no funcionará.`,
  );
}

// 4. Exportar configuración
module.exports = {
  isProduction: isProdMode,
  port: parseInt(process.env.PORT || "3000"),
  jwtSecret: process.env.JWT_SECRET,
  apiKey: process.env.API_KEY,
  adminApiKey: process.env.ADMIN_API_KEY,
  networkIp: process.env.NETWORK_IP,
  ngrokUrl: process.env.NGROK_URL,
  csrfSecret: process.env.CSRF_SECRET || require("crypto").randomBytes(32).toString("hex"),
  csrfEnforcement: process.env.CSRF_ENFORCEMENT !== "false",
};