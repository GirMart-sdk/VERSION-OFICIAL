/* ═══════════════════════════════════════════════════════════
   WINNER — backend/utils/helpers.js (Common Utility Functions)
   ═══════════════════════════════════════════════════════════ */
"use strict";

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

/**
 * Checks if a product exists within a given Prisma transaction client.
 * @param {object} tx - The Prisma transaction client.
 * @param {string} pid - The product ID to validate.
 * @returns {Promise<boolean>} - True if the product exists, false otherwise.
 */
async function doesProductExist(tx, pid) {
  if (!pid) return false;
  const p = await tx.product.findUnique({ where: { id: pid } });
  return !!p;
}

module.exports = {
  parseJson,
  doesProductExist,
};
