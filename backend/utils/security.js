/**
 * WINNER STORE - Módulo de Utilidades de Seguridad
 *
 * Centraliza la lógica para el seguimiento de intentos fallidos,
 * bloqueo de IPs y otras funciones de seguridad.
 */
"use strict";

const { createHash, exec } = require("child_process");
const { prisma } = require("../database");
const { sendSecurityAlert, sendAdminAlert } = require("../../emails/mailer");

const failureTracker = new Map();

/**
 * Registra un fallo y verifica si se debe disparar una alerta de seguridad.
 */
async function trackFailure(req, user) {
  const ip = req.ip;

  const isBanned = await prisma.bannedIp.findUnique({ where: { ip } });
  if (isBanned && isBanned.expiresAt > new Date()) return;
  if (isBanned) await prisma.bannedIp.delete({ where: { ip } });

  if (ip === "::1" || ip === "127.0.0.1" || ip.includes("192.168.")) return;

  const now = Date.now();
  let data = failureTracker.get(ip) || { shortTerm: [], total: 0 };

  data.shortTerm = data.shortTerm.filter((t) => now - t < 60000);
  data.shortTerm.push(now);
  data.total += 1;

  failureTracker.set(ip, data);

  if (data.shortTerm.length === 10) {
    console.warn(`⚠️ [Security] Ráfaga detectada desde ${ip}. Enviando aviso...`);
    sendSecurityAlert(ip, user, req.get("User-Agent")).catch(console.error);
  }

  if (data.total >= 50) {
    await prisma.bannedIp.upsert({
      where: { ip },
      update: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      create: {
        ip,
        reason: `Fuerza bruta contra usuario: ${user}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    blockIPInWindowsFirewall(ip, user);
  }
}

function blockIPInWindowsFirewall(ip, user) {
  const ruleName = `WINNER_BLOCK_${createHash("md5").update(ip).digest("hex").slice(0, 8)}`;
  const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${ip} description="Bloqueo automatico por fuerza bruta WINNER - Usuario: ${user}"`;

  console.error(`🚫 [HARD BLOCK] Bloqueando IP ${ip} en el Firewall de Windows...`);
  if (process.platform === "win32") {
    exec(command, (error) => {
      if (error) console.error(`❌ Error al ejecutar bloqueo de Firewall: ${error.message}.`);
      else sendAdminAlert("IP BLOQUEADA PERMANENTEMENTE", `La IP ${ip} ha sido baneada del servidor tras 50 intentos fallidos contra el usuario ${user}.`, "error");
    });
  } else {
    console.warn(`⚠️ Intento de baneo en plataforma no Windows (${process.platform}). IP: ${ip}`);
  }
}

module.exports = { trackFailure };