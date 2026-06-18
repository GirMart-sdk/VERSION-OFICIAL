"use strict";

const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const { requireAdminIp } = require("../middlewares/securityMiddleware");
const { prisma } = require("../database");
const logger = require("../utils/logger");

const router = express.Router();

// GET /api/admin/sessions - List all active sessions
router.get("/admin/sessions", requireAuth, requireAdminIp, asyncHandler(async (req, res) => {
  const sessions = await prisma.activeSession.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: { username: true, email: true, role: true }
      }
    },
    orderBy: { lastActivity: 'desc' }
  });

  res.json(sessions.map(session => ({
    id: session.id,
    username: session.user.username,
    email: session.user.email,
    role: session.user.role,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    loginTime: session.loginTime,
    lastActivity: session.lastActivity,
  })));
}));

// DELETE /api/admin/sessions/:id - Revoke a specific session
router.delete("/admin/sessions/:id", requireAuth, requireAdminIp, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.activeSession.update({
    where: { id: id },
    data: { isActive: false },
  });

  logger.info(`🛡️ Sesión ${id} revocada por ${req.user.user} desde IP: ${req.ip}`);
  res.json({ success: true, message: "Sesión revocada con éxito." });
}));

// GET /api/admin/banned-ips - Lista de IPs bloqueadas permanentemente
router.get("/admin/banned-ips", requireAuth, requireAdminIp, asyncHandler(async (req, res) => {
  const bans = await prisma.bannedIp.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(bans);
}));

// DELETE /api/admin/banned-ips/:id - Desbloquear IP manualmente
router.delete("/admin/banned-ips/:id", requireAuth, requireAdminIp, asyncHandler(async (req, res) => {
  await prisma.bannedIp.delete({ where: { id: req.params.id } });
  logger.info(`🔓 IP desbloqueada por administrador: ${req.user.user}`);
  res.json({ success: true });
}));

module.exports = router;