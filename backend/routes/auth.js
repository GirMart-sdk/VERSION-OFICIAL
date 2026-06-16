/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/auth.js (Rutas de Autenticación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const { scrypt, timingSafeEqual, randomBytes, createHash } = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(scrypt);
const { sendResetEmail, sendSecurityAlert, sendAdminAlert } = require("../../emails/mailer");
const { validate, schemas } = require("../middlewares/validation");
const { exec } = require("child_process");

const { prisma } = require("../database");
const router = express.Router();

// Rastrear intentos fallidos en memoria (se limpia al reiniciar el servidor)
const failureTracker = new Map();

const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;
const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Registra un fallo y verifica si se debe disparar una alerta de seguridad.
 */
async function trackFailure(req, user) {
  const ip = req.ip;
  if (ip === "::1" || ip === "127.0.0.1") return; // No bloquear localhost

  const now = Date.now();
  let data = failureTracker.get(ip) || { shortTerm: [], total: 0 };
  
  // Limpiar intentos de hace más de 1 min para la alerta de ráfaga
  data.shortTerm = data.shortTerm.filter(t => now - t < 60000);
  data.shortTerm.push(now);
  data.total += 1;
  
  failureTracker.set(ip, data);

  // Alerta 1: 10 fallos en 1 minuto (Aviso)
  if (data.shortTerm.length === 10) {
    console.warn(`⚠️ [Security] Rafaga detectada desde ${ip}. Enviando aviso...`);
    sendSecurityAlert(ip, user, req.get('User-Agent')).catch(e => console.error(e));
  }

  // Alerta 2: 50 fallos totales (Bloqueo Permanente en Firewall)
  if (data.total >= 50) {
    blockIPInWindowsFirewall(ip, user);
  }
}

/**
 * Ejecuta comando de sistema para bloquear la IP en el Firewall de Windows
 */
function blockIPInWindowsFirewall(ip, user) {
  const ruleName = `WINNER_BLOCK_${createHash('md5').update(ip).digest('hex').slice(0,8)}`;
  const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${ip} description="Bloqueo automatico por fuerza bruta WINNER - Usuario: ${user}"`;

  console.error(`🚫 [HARD BLOCK] Bloqueando IP ${ip} permanentemente en el Firewall de Windows...`);
  
  exec(command, (error) => {
    if (error) {
      console.error(`❌ Error al ejecutar bloqueo de Firewall: ${error.message}. ¿Node tiene permisos de Admin?`);
    } else {
      sendAdminAlert("IP BLOQUEADA PERMANENTEMENTE", `La IP ${ip} ha sido baneada del servidor tras 50 intentos fallidos contra el usuario ${user}.`, "error");
    }
  });
}

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

/**
 * Genera un hash seguro para la nueva contraseña
 */
async function hashPassword(password) {
  const derivedKey = await scryptAsync(password, HASH_SALT, 64);
  return derivedKey.toString("hex");
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
    console.warn(`🚨 [Security] Intento de login con usuario inexistente: "${user}" desde IP: ${req.ip}`);
    await trackFailure(req, user);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // 2. Verificar contraseña
  const isPassValid = await verifyPassword(pass, dbUser.password);

  if (isPassValid) {
    failureTracker.delete(req.ip); // Limpiar historial tras éxito
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

  console.warn(`🚨 [Security] Contraseña incorrecta para usuario: "${user}" desde IP: ${req.ip}`);
  await trackFailure(req, user);
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
  "/forgot-password",
  validate(schemas.forgotPassword),
  async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "El correo es obligatorio" });
    }

    try {
      console.log(`🔍 [Auth] Buscando usuario para: "${email}"`);

      const totalUsers = await prisma.user.count();
      if (totalUsers === 0) {
        console.error("❌ [Auth] ¡ERROR CRÍTICO! No hay usuarios en la base de datos.");
      } else {
        const existingUsers = await prisma.user.findMany({ select: { username: true, email: true, active: true } });
        console.log(`📋 [Auth] Usuarios actuales en DB:`, existingUsers);
      }

      // Buscamos al usuario por correo electrónico o username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: email, mode: 'insensitive' } },
            { username: { equals: email, mode: 'insensitive' } }
          ],
        },
      });

      if (user) {
        const target = user.email || (user.username.includes("@") ? user.username : null);
        if (target) {
          // Generar Token de un solo uso (válido por 1 hora)
          const resetToken = randomBytes(32).toString("hex");
          const resetExpires = new Date(Date.now() + 3600000); 

          await prisma.user.update({
            where: { id: user.id },
            data: { 
              resetToken: resetToken,
              resetExpires: resetExpires 
            }
          });

          console.log(`📩 [Auth] Token generado para ${user.username}. Enviando...`);
          await sendResetEmail(user, resetToken);
        } else {
          console.warn(`⚠️ [Auth] El usuario ${user.username} existe pero no tiene un correo válido registrado.`);
        }
      } else {
        console.warn(
          `⚠️ [Auth] Intento de recuperación fallido: El correo/usuario "${email}" no existe en la base de datos.`,
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

/**
 * POST /api/auth/reset-password
 * Endpoint para procesar el cambio de contraseña usando el token.
 */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    // Buscar usuario con token válido y no expirado
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      console.warn(`⚠️ [Auth] Intento de reset con token inválido o expirado: ${token}`);
      return res.status(400).json({ error: "El enlace es inválido o ha expirado" });
    }

    // Encriptar nueva contraseña
    const passwordHash = await hashPassword(newPassword);

    // Actualizar y limpiar token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetExpires: null
      }
    });

    console.log(`✅ [Auth] Contraseña actualizada para el usuario: ${user.username}`);
    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error procesando el cambio" });
  }
});

module.exports = router;
