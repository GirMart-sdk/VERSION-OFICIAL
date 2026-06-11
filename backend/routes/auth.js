/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/auth.js (Rutas de Autenticación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const { scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(scrypt);
const { sendResetEmail } = require("../../emails/mailer");
const { validate, schemas } = require("../middlewares/validation");

const { prisma } = require("../database");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;
const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!JWT_SECRET && IS_PRODUCTION) {
  console.error(
    "❌ ERROR CRÍTICO: JWT_SECRET no definido. El servidor no puede iniciar en producción.",
  );
  process.exit(1);
}

/**
 * Verifica si una contraseña coincide con un hash guardado
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  try {
    const derivedKey = await scryptAsync(password, HASH_SALT, 64);
    return timingSafeEqual(derivedKey, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

router.post("/login", validate(schemas.login), async (req, res) => {
  const { user, pass } = req.body;

  // 1. Buscar usuario en la DB
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: user }, { email: user }],
      active: true,
    },
  });

  if (!dbUser) {
    console.warn(`❌ Login fallido (Usuario no existe): ${user}`);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // 2. Verificar contraseña
  const isPassValid = await verifyPassword(pass, dbUser.password);

  if (isPassValid) {
    console.log(`✅ Login exitoso para: ${dbUser.username}`);
    const token = jwt.sign(
      { userId: dbUser.id, user: dbUser.username, role: dbUser.role },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Detectar si estamos usando un túnel HTTPS (como ngrok) para permitir la cookie
    const isSecure =
      IS_PRODUCTION ||
      req.get("x-forwarded-proto") === "https" ||
      (req.hostname.includes("ngrok") && IS_PRODUCTION);

    // Si es localhost y no hay HTTPS, desactivamos secure para que la sesión funcione
    const finalSecure =
      isSecure && req.hostname !== "localhost" && req.hostname !== "127.0.0.1";

    // Usar las opciones calculadas centralmente si existen, o el fallback seguro
    res.cookie(
      "w_token",
      token,
      req.cookieOptions || {
        httpOnly: true,
        secure: finalSecure,
        sameSite: finalSecure ? "None" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return res.json({
      success: true,
      token,
      user: dbUser.username,
      role: dbUser.role,
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

/**
 * POST /api/auth/forgot-password
 * Endpoint para solicitar la recuperación de contraseña.
 */
router.post(
  "/auth/forgot-password",
  validate(schemas.forgotPassword),
  async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "El correo es obligatorio" });
    }

    try {
      // Buscamos al usuario por correo electrónico o username
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: email }],
        },
      });

      if (user && typeof sendResetEmail === "function") {
        console.log(
          `📩 [Auth] Enviando correo de recuperación a: ${user.email || user.username}`,
        );
        await sendResetEmail(user);
      } else {
        console.warn(
          `⚠️ [Auth] No se envió correo: Usuario no encontrado o sin email registrado para: ${email}`,
        );
      }

      // Siempre respondemos éxito para evitar enumeración de usuarios
      res.json({
        success: true,
        message:
          "Si el correo está registrado, recibirás instrucciones pronto.",
      });
    } catch (err) {
      console.error("❌ Error en forgot-password:", err.message);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

module.exports = router;
