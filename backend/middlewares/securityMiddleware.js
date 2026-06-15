"use strict";

const { bannedIp } = require("../database");
const logger = require("../utils/logger");

// Rutas trampa que un usuario normal NUNCA tocaría
const TRAP_PATHS = [
  "/phpmyadmin",
  "/.git",
  "/.env",
  "/wp-admin",
  "/wp-login.php",
  "/shell.php",
  "/cmd.php",
  "/config.php",
  "/setup.php",
  "/.vscode",
  "/etc/passwd"
];

const securityMiddleware = {
  /**
   * Verifica si la IP está en la cárcel antes de procesar cualquier petición.
   */
  async checkIP(req, res, next) {
    const ip = req.ip;
    
    const ban = await bannedIp.findUnique({ where: { ip } });
    
    if (ban) {
      if (new Date() < ban.expiresAt) {
        return res.status(403).json({
          error: "ACCESS_DENIED",
          message: "Tu IP ha sido bloqueada por actividad sospechosa."
        });
      }
      // Si expiró, la borramos de forma segura (deleteMany evita error si ya no existe)
      await bannedIp.deleteMany({ where: { ip } });
    }
    next();
  },

  /**
   * Activa la trampa si se accede a rutas prohibidas.
   */
  async honeypot(req, res, next) {
    const path = req.path.toLowerCase();
    if (TRAP_PATHS.some(trap => path.includes(trap))) {
      const ip = req.ip;
      const duration = 12 * 60 * 60 * 1000; // Bloqueo de 12 horas
      const expiresAt = new Date(Date.now() + duration);

      await bannedIp.upsert({
        where: { ip },
        update: { expiresAt, reason: "HONEYPOT_HIT" },
        create: { ip, expiresAt, reason: "HONEYPOT_HIT" }
      });
      
      logger.security("HONEYPOT_TRAP_HIT", { 
        ip, 
        path, 
        userAgent: req.get('user-agent'),
        message: "IP persistida en BannedIps por 12 horas." 
      });

      return res.status(403).json({ error: "Security violation" });
    }
    next();
  }
};

module.exports = securityMiddleware;