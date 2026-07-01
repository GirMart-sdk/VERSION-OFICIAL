/* ═══════════════════════════════════════════════════════
   WINNER — securityMiddleware.js
   Middlewares de seguridad para IP y autenticación.
   ═══════════════════════════════════════════════════════ */
"use strict";

const { prisma } = require('../database');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware para bloquear IPs que han sido baneadas y registradas en la BD.
 */
const checkBannedIp = async (req, res, next) => {
  try {
    const requestIp = req.ip;
    const isBanned = await prisma.bannedIp.findUnique({
      where: { ip: requestIp },
    });

    if (isBanned) {
      logger.warn(`🛡️ [IP BANEADA] Bloqueado intento de acceso desde: ${requestIp}`);
      return res.status(403).json({ error: "Acceso denegado permanentemente desde esta dirección IP." });
    }

    next();
  } catch (error) {
    // Si hay un error de BD, por seguridad, dejamos pasar pero lo registramos.
    logger.error(`❌ Error en middleware checkBannedIp: ${error.message}`);
    next();
  }
};

/**
 * Middleware para requerir que la IP sea de un administrador (definida en .env).
 */
const requireAdminIp = (req, res, next) => {
  const adminIPs = (process.env.ADMIN_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
  const requestIp = req.ip;

  if (config.isProduction && adminIPs.length > 0 && !adminIPs.includes(requestIp)) {
    logger.warn(`🛡️ [IP NO ADMIN] Acceso denegado a ruta admin desde IP no autorizada: ${requestIp}`);
    return res.status(403).json({ error: 'Acceso prohibido desde esta IP' });
  }
  next();
};

module.exports = { checkBannedIp, requireAdminIp };