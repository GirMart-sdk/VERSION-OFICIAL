/**
 * WINNER STORE - Robust Cleanup Script
 *
 * This script reliably deletes specified directories using rimraf. This is more
 * stable than complex shell commands in package.json, especially on Windows.
 */
"use strict";

const { rimraf } = require("rimraf");

async function runCleanup() {
  const pathsToDelete = [
    "node_modules/.prisma/client",
    "node_modules/@prisma/client",
    "backend/*.db", // rimraf handles glob patterns
  ];

  console.log("[*] Eliminando archivos temporales y del cliente Prisma...");

  try {
    await rimraf(pathsToDelete, { glob: true });
    console.log("✅ Cleanup complete.");
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error.message);
  }
}

runCleanup();