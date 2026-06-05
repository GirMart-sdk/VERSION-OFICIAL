/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js (Prisma Client Edition)
   ✅ Conexión unificada para PostgreSQL
   ═══════════════════════════════════════════════════════════ */
"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const dbUrl = String(process.env.DATABASE_URL || "");
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

const pool = new Pool({ connectionString: dbUrl });

pool.on("error", (err) => {
  console.error("❌ Error inesperado en el pool de PostgreSQL:", err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log(
  "🐘 Prisma Client (PostgreSQL) inicializado con capa de compatibilidad",
);
module.exports = prisma;
