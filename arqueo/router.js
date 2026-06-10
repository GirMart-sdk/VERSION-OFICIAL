/* ═══════════════════════════════════════════════════════════
   WINNER — arqueo/router.js (Control de Caja)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const router = express.Router();
const prisma = require("../backend/database");
const { requireAuth } = require("../backend/middlewares/auth");

/**
 * POST /api/arqueo/open
 * Inicia una sesión de caja con un saldo inicial (Base).
 */
router.post("/open", requireAuth, async (req, res) => {
  const { initialBalance, notes } = req.body;
  const user = req.user.user || "admin";

  try {
    const active = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
    });
    if (active)
      return res
        .status(400)
        .json({ error: "Ya existe una sesión de caja abierta" });

    const session = await prisma.cashSession.create({
      data: {
        id: "CS-" + Date.now().toString(36).toUpperCase(),
        initialBalance: parseFloat(initialBalance) || 0,
        openedBy: user,
        notes: notes || "",
      },
    });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/arqueo/status
 * Calcula el saldo teórico actual sumando ventas y restando gastos en EFECTIVO.
 */
router.get("/status", requireAuth, async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });

    if (!session) return res.json({ active: false });

    // Agregamos pagos de ventas realizados en efectivo desde la apertura
    const sales = await prisma.salePayment.aggregate({
      _sum: { amount: true },
      where: {
        timestamp: { gte: session.openedAt },
        method: { mode: "insensitive", equals: "Efectivo" },
      },
    });

    // Restamos gastos realizados en efectivo desde la apertura
    const expenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: { gte: session.openedAt },
        method: { mode: "insensitive", equals: "Efectivo" },
      },
    });

    const tSales = parseFloat(sales._sum.amount || 0);
    const tExpenses = parseFloat(expenses._sum.amount || 0);
    const tBalance = parseFloat(session.initialBalance) + tSales - tExpenses;

    res.json({
      active: true,
      session,
      calculations: {
        theoreticalSales: tSales,
        theoreticalExpenses: tExpenses,
        theoreticalBalance: tBalance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/arqueo/close
 * Realiza el arqueo comparando el dinero contado (real) vs el teórico.
 */
router.post("/close", requireAuth, async (req, res) => {
  const { realBalance, notes } = req.body;
  const user = req.user.user || "admin";

  try {
    const session = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
    });
    if (!session)
      return res.status(404).json({ error: "No hay sesión abierta" });

    // Recalcular montos finales para el registro histórico
    const statusResponse = await router.handleStatusCalculation(session);
    const tBalance = statusResponse.theoreticalBalance;
    const rBalance = parseFloat(realBalance) || 0;

    const closed = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: user,
        theoreticalSales: statusResponse.theoreticalSales,
        theoreticalExpenses: statusResponse.theoreticalExpenses,
        realBalance: rBalance,
        difference: rBalance - tBalance,
        notes: notes ? `${session.notes}\nCierre: ${notes}` : session.notes,
      },
    });

    res.json({ success: true, session: closed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Función auxiliar interna para los cálculos
router.handleStatusCalculation = async (session) => {
  const sales = await prisma.salePayment.aggregate({
    _sum: { amount: true },
    where: {
      timestamp: { gte: session.openedAt },
      method: { mode: "insensitive", equals: "Efectivo" },
    },
  });
  const expenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      createdAt: { gte: session.openedAt },
      method: { mode: "insensitive", equals: "Efectivo" },
    },
  });

  const s = parseFloat(sales._sum.amount || 0);
  const e = parseFloat(expenses._sum.amount || 0);
  return {
    theoreticalSales: s,
    theoreticalExpenses: e,
    theoreticalBalance: parseFloat(session.initialBalance) + s - e,
  };
};

module.exports = router;
