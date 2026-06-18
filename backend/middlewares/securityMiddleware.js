"use strict";

const logger = require("../utils/logger");

/**
 * Middleware para restringir el acceso a IPs específicas para el panel administrativo.
 * Las IPs permitidas se configuran en la variable de entorno ALLOWED_ADMIN_IPS,
 * separadas por comas.
 */
function requireAdminIp(req, res, next) {
  const allowedIps = process.env.ALLOWED_ADMIN_IPS;
  const clientIp = req.ip; // req.ip ya es la IP real gracias a app.set('trust proxy', 1)

  if (!allowedIps) {
    logger.warn("⚠️ [Seguridad] ALLOWED_ADMIN_IPS no configurado. Acceso al panel sin restricción de IP.");
    return next(); // Permitir acceso si no hay IPs configuradas (solo en desarrollo, no recomendado en prod)
  }

  // Normalize IP addresses for comparison
  const normalizeIp = (ip) => {
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return '::1'; // IPv6 localhost
    if (ip === '127.0.0.1') return '127.0.0.1'; // IPv4 localhost
    return ip;
  };

  const normalizedClientIp = normalizeIp(clientIp);
  const allowedIpList = allowedIps.split(',').map(ip => normalizeIp(ip.trim()));

  logger.info(`🛡️ [Seguridad] Verificando IP: ${normalizedClientIp} contra lista: [${allowedIpList.join(', ')}]`);
  if (allowedIpList.includes(normalizedClientIp)) {
    return next();
  }

  logger.warn(`🛡️ [Seguridad] Acceso denegado al panel desde IP no autorizada: ${clientIp}`);
  res.status(403).json({ error: "Acceso denegado: IP no autorizada para el panel administrativo." });
}

module.exports = { requireAdminIp };