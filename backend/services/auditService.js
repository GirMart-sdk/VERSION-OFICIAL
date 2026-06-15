"use strict";

const { prisma } = require("../database");
const logger = require("../utils/logger");

/**
 * Servicio para el registro de auditoría de acciones administrativas.
 */
const AuditService = {
  /**
   * Registra una acción en la base de datos.
   */
  async log(req, { action, targetType, targetId, details }) {
    try {
      const adminId = req.user?.userId;
      if (!adminId) return;

      // Punto Ciego: Evitar registrar datos sensibles en los detalles del log
      const sensitiveKeys = ["password", "pass", "token", "apiKey", "currentPassword", "newPassword"];
      const filteredDetails = details ? { ...details } : {};
      
      sensitiveKeys.forEach(key => {
        if (key in filteredDetails) filteredDetails[key] = "[REDACTED]";
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId: String(targetId),
          details: filteredDetails,
          ip: req.ip || req.get('x-forwarded-for') || "0.0.0.0"
        }
      });
    } catch (err) {
      logger.error("❌ [AuditService] Fallo al registrar log:", err.message);
    }
  }
};

module.exports = AuditService;