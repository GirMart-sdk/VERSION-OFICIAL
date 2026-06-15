/* ═══════════════════════════════════════════════════════════
   WINNER — backend/middlewares/auth.js (Middlewares de Autenticación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const jwt = require("jsonwebtoken");
const { prisma } = require("../database");

const API_KEY = process.env.API_KEY || "prod-api-key-winner-2026";
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para requerir una API Key válida.
 */
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  // SEGURIDAD: Permitir la llave de producción o la de desarrollo
  if (key === API_KEY || key === "dev-api-key") {
    req.authenticated = "api-key";
    return next();
  }
  return res.status(401).json({ error: "API key inválida" });
}

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
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { token }
    });
    if (isBlacklisted) {
      return res.status(401).json({ error: "Sesión invalidada por seguridad" });
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

  // Si no hay token válido, intenta con API_KEY
  if (apiKey === API_KEY) {
    req.authenticated = "api-key";
    return next();
  }

  // Si nada funciona, rechaza
  return res.status(401).json({ error: "No autorizado" });
}

module.exports = { requireApiKey, requireAuth };
