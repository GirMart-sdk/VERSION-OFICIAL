/* ═══════════════════════════════════════════════════════════
   WINNER — backend/middlewares/auth.js (Middlewares de Autenticación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const jwt = require("jsonwebtoken");
const { prisma } = require("../database");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Middleware para requerir autenticación JWT o API Key.
 */
async function requireAuth(req, res, next) {
  const auth = req.header("authorization") || "";
  const tokenFromCookie = req.cookies.w_token;
  const apiKey = req.header("x-api-key");

  // Priorizar token de cookie, luego Bearer token para compatibilidad
  const token =
    tokenFromCookie || (auth.startsWith("Bearer ") ? auth.slice(7) : null);

  if (token) {
    // SEGURIDAD: Verificar si el token está en la lista negra
    const crypto = require("crypto");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const isBlacklisted = await prisma.blacklistedToken.findFirst({
      where: { token: tokenHash }
    });
    if (isBlacklisted) {
      if (isBlacklisted.expiresAt > new Date()) {
        return res.status(401).json({ error: "Sesión invalidada por seguridad" });
      }
      await prisma.blacklistedToken.delete({ where: { id: isBlacklisted.id } });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.authenticated = "jwt";
      return next();
    } catch (e) {
      console.warn("JWT Auth Failed:", e.message);
      res.clearCookie("w_token"); // Limpia la cookie automáticamente si la firma es inválida o expiró
      // Continúa a verificar API_KEY como fallback
    }
  }

  // --- Fallback to API Key Validation ---
  const adminApiKey = process.env.ADMIN_API_KEY;
  const standardApiKey = process.env.API_KEY;

  // Block development key in production
  if (IS_PRODUCTION && apiKey === "dev-api-key") {
    logger.warn(`🛡️ Bloqueo: Llave de desarrollo denegada en producción desde IP: ${req.ip}`);
    return res.status(403).json({ error: "Seguridad: Llave de desarrollo denegada en producción" });
  }

  // Check for either admin or standard key
  if (apiKey === adminApiKey || apiKey === standardApiKey) {
    req.authenticated = "api-key";
    return next();
  }

  logger.error(`❌ API key inválida o ausente desde IP: ${req.ip}`);
  return res.status(401).json({ error: "API key inválida" });
}

module.exports = { requireAuth };
