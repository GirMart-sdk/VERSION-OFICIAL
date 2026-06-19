"use strict";

const logger = require("../utils/logger");

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Middleware to validate the API Key.
 * It checks for 'x-api-key' in headers and validates against environment variables.
 * Allows access if a valid JWT token is already present.
 */
function requireApiKey(req, res, next) {
  // If user is already authenticated via JWT, skip API key check
  if (req.user) {
    return next();
  }

  const clientApiKey = req.headers["x-api-key"];
  const adminApiKey = process.env.ADMIN_API_KEY;
  const standardApiKey = process.env.API_KEY;

  if (IS_PROD && clientApiKey === "dev-api-key") {
    logger.warn(`🛡️ Bloqueo: Llave de desarrollo denegada en producción desde IP: ${req.ip}`);
    return res.status(403).json({ error: "Seguridad: Llave de desarrollo denegada en producción" });
  }

  if (clientApiKey === adminApiKey || clientApiKey === standardApiKey) {
    return next();
  }

  logger.error(`❌ API key inválida o ausente desde IP: ${req.ip}`);
  return res.status(401).json({ error: "API key inválida" });
}

/**
 * Middleware to restrict access to a whitelist of IPs.
 * Skips check if the request is authenticated with the ADMIN_API_KEY.
 */
function requireAdminIp(req, res, next) {
  // The ADMIN_API_KEY grants universal access, bypassing the IP check.
  if (req.headers["x-api-key"] === process.env.ADMIN_API_KEY) {
    return next();
  }

  const allowedIps = (process.env.ALLOWED_ADMIN_IPS || "127.0.0.1,::1").split(",");
  if (allowedIps.includes(req.ip)) {
    return next();
  }

  logger.warn(`🛡️ Bloqueo de IP no autorizada: ${req.ip}`);
  return res.status(403).json({ error: "Seguridad: Acceso denegado desde esta dirección IP." });
}

module.exports = { requireApiKey, requireAdminIp };