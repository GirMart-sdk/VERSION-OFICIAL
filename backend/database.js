/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js (Prisma Client Edition)
   ✅ Conexión unificada para PostgreSQL
   ═══════════════════════════════════════════════════════════ */
"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

// 1. Asegurar carga de variables si el archivo se requiere fuera de server.js (como en el seed)
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
}

let dbUrl = String(process.env.DATABASE_URL || "").trim();
// Limpiar comillas accidentales de la cadena
dbUrl = dbUrl.replace(/^["']|["']$/g, "");

// Refuerzo: Asegurar que la variable limpia esté disponible para el motor interno de Prisma
process.env.DATABASE_URL = dbUrl;

if (!dbUrl) {
  console.error(
    "❌ ERROR CRÍTICO: DATABASE_URL no está definida en el entorno.",
  );
  console.error(
    "   Asegúrate de que el archivo .env existe en la raíz y tiene el formato correcto.",
  );
} else {
  // Diagnóstico de URL (sin mostrar pass)
  const debugUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Intentando conectar a: ${debugUrl}`);
}

const pool = new Pool({
  connectionString: dbUrl,
  max: 20, // Máximo de conexiones simultáneas en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // Tiempo de espera para conectar
});

pool.on("error", (err) => {
  console.error("❌ Error inesperado en el pool de PostgreSQL:", err.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

console.log(
  "🐘 Prisma Client (PostgreSQL) inicializado con capa de compatibilidad",
);

// Exportamos la instancia completa de Prisma Client y también los modelos individuales
// para facilitar la importación selectiva en otros módulos.
// Esto es útil si se prefiere desestructurar los modelos directamente.
module.exports = {
  prisma, // La instancia completa de PrismaClient
  user: prisma.user,
  product: prisma.product,
  inventory: prisma.inventory,
  sale: prisma.sale,
  saleItem: prisma.saleItem,
  salePayment: prisma.salePayment,
  order: prisma.order,
  expense: prisma.expense,
  cashSession: prisma.cashSession,
  customerProfile: prisma.customerProfile,
  reorderRule: prisma.reorderRule,
  demandForecast: prisma.demandForecast,
  auditLog: prisma.auditLog,
  blacklistedToken: prisma.blacklistedToken,
  bannedIp: prisma.bannedIp,
};
