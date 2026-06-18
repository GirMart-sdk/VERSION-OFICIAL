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
const asyncHandler = require("../utils/asyncHandler");
const AuditService = require("../services/auditService");

const { prisma } = require("../database");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

// Rastrear intentos fallidos en memoria (se limpia al reiniciar el servidor)
const failureTracker = new Map();
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;
const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Genera una contraseña segura de un solo uso
 */
function generateRandomPassword(length = 10) {
  return randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Registra un fallo y verifica si se debe disparar una alerta de seguridad.
 */
async function trackFailure(req, user) {
  // Con trust proxy activo, req.ip será la IP real del atacante incluso tras Ngrok
  const ip = req.ip; 
  
  // Verificar si ya está en la tabla de baneo persistente
  const isBanned = await prisma.bannedIp.findUnique({ where: { ip } });
  if (isBanned) {
    if (isBanned.expiresAt > new Date()) return; // Ya está bloqueado
    await prisma.bannedIp.delete({ where: { ip } }); // El bloqueo expiró
  }

  if (ip === "::1" || ip === "127.0.0.1" || ip.includes("192.168.")) return; // No bloquear red local

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
    // Registrar en base de datos para persistencia
    await prisma.bannedIp.upsert({
      where: { ip },
      update: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 días
      create: { 
        ip, 
        reason: `Fuerza bruta contra usuario: ${user}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
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
  // NOTA DE SEGURIDAD: Si el servidor está detrás de un proxy (ej. Ngrok, Cloudflare),
  // 'req.ip' podría ser la IP del proxy, no la del atacante real.
  // Bloquear la IP del proxy podría dejar el servicio inaccesible.
  // En producción, se recomienda usar un WAF o bloqueo a nivel del proxy.
  
  if (process.platform === "win32") {
    exec(command, (error) => {
      if (error) {
        console.error(`❌ Error al ejecutar bloqueo de Firewall: ${error.message}. ¿Node tiene permisos de Admin?`);
      } else {
        sendAdminAlert("IP BLOQUEADA PERMANENTEMENTE", `La IP ${ip} ha sido baneada del servidor tras 50 intentos fallidos contra el usuario ${user}.`, "error");
      }
    });
  } else {
    console.warn(`⚠️ Intento de baneo en plataforma no Windows (${process.platform}). IP: ${ip}`);
  }
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

  // Verificación temprana de IP baneada
  const ban = await prisma.bannedIp.findUnique({ where: { ip: req.ip } });
  if (ban && ban.expiresAt > new Date()) {
    logger.error(`🛡️ Intento de acceso desde IP Baneada: ${req.ip}`);
    return res.status(403).json({ error: "Tu dirección IP ha sido bloqueada permanentemente por razones de seguridad." });
  }

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
    console.log(`✅ Login exitoso para: ${dbUser.username}`);
    const token = jwt.sign(
      { userId: dbUser.id, user: dbUser.username, role: dbUser.role },
      JWT_SECRET, // Use JWT_SECRET for signing the token
      {
        expiresIn: "7d",
      },
    );

    // Crear registro de sesión activa para auditoría
    await prisma.activeSession.create({
      data: {
        userId: dbUser.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        tokenHash: createHash('sha256').update(token).digest('hex'), // Store hash of token
        isActive: true,
      },
    });

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
  return res.status(401).json({ error: "Credenciales inválidas" });
});

/**
 * PATCH /api/auth/update-password
 * Cambio manual de contraseña con validación de seguridad
 */
router.patch("/auth/update-password", requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña es demasiado débil." });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  
  // Validar contraseña actual
  const isMatch = await verifyPassword(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: "La contraseña actual es incorrecta." });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed }
  });

  await AuditService.log(req, {
    action: "UPDATE",
    targetType: "USER",
    targetId: user.id,
    details: { message: "Contraseña actualizada por el usuario" }
  });

  res.json({ success: true, message: "Contraseña actualizada con éxito." });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies.w_token;

  if (token) { // If a token is present, blacklist it and mark session inactive
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Mark active session as inactive
    await prisma.activeSession.updateMany({
      where: { tokenHash: tokenHash, isActive: true },
      data: { isActive: false },
    });

    // Add to blacklist (expires in 7 days for automatic DB cleanup)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await prisma.blacklistedToken.create({ data: { token: tokenHash, expiresAt } }); // Store hash in blacklist
  }

  res.clearCookie("w_token");
  res.json({ success: true });
}));

/**
 * POST /api/auth/forgot-password
 * Endpoint para solicitar la recuperación de contraseña.
 */
router.post(
  "/auth/forgot-password",
  validate(schemas.forgotPassword),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "El correo es obligatorio" });
    }

      // Buscamos al usuario por correo electrónico o username
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: email }],
        },
      });

      if (user) {
        const tempPassword = generateRandomPassword(); // Generar nueva contraseña temporal
        const hashedTempPassword = await hashPassword(tempPassword); // Hashear la contraseña

        // Actualizar la contraseña del usuario en la base de datos
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedTempPassword },
        });

        // Enviar correo con la nueva contraseña temporal
        if (typeof sendResetEmail === "function") {
        console.log(
          `📩 [Auth] Enviando correo de recuperación a: ${user.email || user.username}`,
        );
          await sendResetEmail(user, tempPassword); // Pasar la contraseña temporal
        }
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
  }),
);
module.exports = router;
