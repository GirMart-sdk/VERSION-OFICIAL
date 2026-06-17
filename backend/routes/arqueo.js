"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

/**
 * GET /api/arqueo/status
 * Retorna la sesión de caja abierta actualmente y los cálculos en tiempo real.
 */
router.get("/arqueo/status", requireAuth, asyncHandler(async (req, res) => {
  const activeSession = await prisma.cashSession.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });

  if (!activeSession) {
    return res.json({ active: false });
  }

  // Calcular ventas y gastos en EFECTIVO desde la apertura para el saldo teórico
  const [sales, expenses] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: activeSession.openedAt },
        deletedAt: null,
        paymentMethod: { contains: "Efectivo", mode: "insensitive" }
      },
      _sum: { totalAmount: true }
    }),
    prisma.expense.aggregate({
      where: {
        createdAt: { gte: activeSession.openedAt },
        method: { contains: "Efectivo", mode: "insensitive" }
      },
      _sum: { amount: true }
    })
  ]);

  const theoreticalSales = Number(sales._sum.totalAmount || 0);
  const theoreticalExpenses = Number(expenses._sum.amount || 0);
  const theoreticalBalance = Number(activeSession.initialBalance) + theoreticalSales - theoreticalExpenses;

  res.json({
    active: true,
    session: activeSession,
    calculations: {
      theoreticalSales,
      theoreticalExpenses,
      theoreticalBalance
    }
  });
}));

/**
 * POST /api/arqueo/open
 * Inicia un nuevo turno de caja.
 */
router.post("/arqueo/open", requireAuth, asyncHandler(async (req, res) => {
  const { initialBalance, notes } = req.body;

  const existing = await prisma.cashSession.findFirst({ where: { status: "OPEN" } });
  if (existing) return res.status(400).json({ error: "Ya hay un turno de caja abierto" });

  const session = await prisma.cashSession.create({
    data: {
      id: "CASH-" + Date.now().toString(36).toUpperCase(),
      openedBy: req.user.user, // Tomado del token JWT
      initialBalance: Number(initialBalance) || 0,
      status: "OPEN",
      notes: notes || ""
    }
  });

  res.json({ success: true, session });
}));

/**
 * POST /api/arqueo/close
 * Finaliza el turno actual y registra la diferencia (sobrante/faltante).
 */
router.post("/arqueo/close", requireAuth, asyncHandler(async (req, res) => {
  const { realBalance, notes } = req.body;

  const activeSession = await prisma.cashSession.findFirst({ where: { status: "OPEN" } });
  if (!activeSession) return res.status(400).json({ error: "No hay una sesión activa para cerrar" });

  await prisma.cashSession.update({
    where: { id: activeSession.id },
    data: {
      closedAt: new Date(),
      closedBy: req.user.user,
      realBalance: Number(realBalance),
      status: "CLOSED",
      notes: notes || activeSession.notes
    }
  });

  res.json({ success: true, message: "Caja cerrada correctamente" });
}));

module.exports = router;