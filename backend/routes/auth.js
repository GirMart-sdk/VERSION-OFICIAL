/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/auth.js (Rutas de Autenticación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const { scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(scrypt);

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_SALT = process.env.ADMIN_SALT;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!JWT_SECRET && IS_PRODUCTION) {
  console.error(
    "❌ ERROR CRÍTICO: JWT_SECRET no definido. El servidor no puede iniciar en producción.",
  );
  process.exit(1);
}

if (!ADMIN_SALT && IS_PRODUCTION) {
  console.error(
    "❌ CRITICAL: ADMIN_SALT is not defined in environment variables.",
  );
}

let ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;

// SEGURIDAD: Si el hash es el de ejemplo o no existe, generarlo desde la clave plana
if (!ADMIN_HASH || ADMIN_HASH === "EL_HASH_GENERADO_DE_TU_CLAVE") {
  if (IS_PRODUCTION && ADMIN_HASH === "EL_HASH_GENERADO_DE_TU_CLAVE") {
    console.error(
      "❌ ERROR: Estás usando un HASH de ejemplo en producción. El login fallará.",
    );
  }

  ADMIN_HASH = require("crypto")
    .scryptSync(process.env.ADMIN_PASSWORD, ADMIN_SALT, 64)
    .toString("hex");
}

/**
 * Verifica la contraseña usando scrypt asíncrono y comparación de tiempo constante.
 */
async function passwordMatches(pass) {
  if (!pass) return false;
  try {
    const derivedKey = await scryptAsync(
      pass,
      ADMIN_SALT || "fallback_dev_salt",
      64,
    );
    const a = derivedKey;
    const b = Buffer.from(ADMIN_HASH, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

router.post("/login", async (req, res) => {
  const { user, pass } = req.body;
  console.log(`[Login Attempt] Usuario: ${user}`);

  const isUserValid = user === ADMIN_USER;
  const isPassValid = await passwordMatches(pass);

  if (isUserValid && isPassValid) {
    console.log(`✅ Login exitoso para: ${user}`);
    const token = jwt.sign({ user: ADMIN_USER, role: "Admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("w_token", token, {
      httpOnly: true,
      secure: true, // Siempre true si usamos HTTPS
      sameSite: "None", // Requerido para integraciones de terceros como Wompi
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    return res.json({
      success: true,
      token,
      user: ADMIN_USER,
      role: "Admin",
      apiKey: API_KEY,
    });
  }
  console.warn(`❌ Login fallido para: ${user}`);
  res.status(401).json({ error: "Credenciales inválidas" });
});

router.post("/logout", (req, res) => {
  res.clearCookie("w_token");
  res.json({ success: true });
});

module.exports = router;
