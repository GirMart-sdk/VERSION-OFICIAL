/* ═══════════════════════════════════════════════════════════
   WINNER — backend/utils/helpers.js (Funciones de Utilidad Comunes)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const prisma = require("../database");

const parseJson = (val, defaultVal = {}) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val || (Array.isArray(defaultVal) ? "[]" : "{}"));
    } catch {
      return defaultVal;
    }
  }
  return val || defaultVal;
};

// Helper para asegurar que el ID de producto sea válido antes de transacciones
async function validateProductId(tx, pid) {
  if (!pid) return false;
  const p = await tx.product.findUnique({ where: { id: pid } });
  return !!p;
}

module.exports = {
  parseJson,
  validateProductId,
};
