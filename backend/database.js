/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js (Prisma Client Edition)
   ✅ Conexión unificada para PostgreSQL
   ═══════════════════════════════════════════════════════════ */
"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log(
  "🐘 Prisma Client (PostgreSQL) inicializado con capa de compatibilidad",
);
module.exports = prisma;
