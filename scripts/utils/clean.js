/**
 * WINNER STORE - Robust Cleanup Script
 *
 * This script forcefully terminates all Node.js processes and then reliably
 * deletes specified directories using rimraf. This is more stable than
 * complex shell commands in package.json, especially on Windows.
 */
"use strict";

const { exec } = require("child_process");
const { rimraf } = require("rimraf");
const path = require("path");

async function runCleanup() {
  const projectRoot = path.resolve(__dirname, "..");

  console.log("[*] Terminating all running Node.js processes...");

  const killCommand =
    process.platform === "win32"
      ? "taskkill /f /im node.exe"
      : "pkill -f node";

  // Use a promise to wrap exec and ensure it resolves even if the command fails
  await new Promise((resolve) => {
    exec(killCommand, (error) => {
      if (error && !error.message.includes("no process found")) {
        console.warn(`[!] Warning during taskkill: ${error.message}`);
      }
      // Always resolve to continue the script
      resolve();
    });
  });

  const pathsToDelete = [
    path.join(projectRoot, "node_modules", ".prisma", "client"),
    path.join(projectRoot, "node_modules", "@prisma", "client"),
    path.join(projectRoot, "backend", "*.db"),
  ];

  console.log("[*] Deleting temporary and client files...");
  await rimraf(pathsToDelete, { force: true });
  console.log("✅ Cleanup complete.");
}

runCleanup();