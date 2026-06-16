/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/expenses.js (Rutas de Gastos Operativos)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireAuth } = require("../middlewares/auth");
const { validate, schemas } = require("../middlewares/validation");
<<<<<<< HEAD
=======
const asyncHandler = require("../utils/asyncHandler");
const AuditService = require("../services/auditService");
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

const router = express.Router();

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&category=xxx
<<<<<<< HEAD
router.get("/expenses", requireAuth, async (req, res) => {
=======
router.get("/expenses", requireAuth, asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
  const { from, to, category, month } = req.query;
  const where = {};

  if (month) {
    // Si viene 'month' (YYYY-MM), calculamos el rango del mes
    // Usamos el primer día del mes en formato ISO simple
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    where.createdAt = { gte: start, lt: end };
  } else {
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };
  }

  if (category) where.category = category;

<<<<<<< HEAD
  try {
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Mapeo para compatibilidad con el frontend (agrega el campo 'date')
    const formatted = expenses.map((e) => ({
      ...e,
      date: e.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching expenses:", err.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});

// GET /api/expenses/summary?month=YYYY-MM
router.get("/expenses/summary", requireAuth, async (req, res) => {
=======
  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Mapeo para compatibilidad con el frontend (agrega el campo 'date')
  const formatted = expenses.map((e) => ({
    ...e,
    date: e.createdAt.toISOString(),
  }));

  res.json(formatted);
}));

// GET /api/expenses/summary?month=YYYY-MM
router.get("/expenses/summary", requireAuth, asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
  const { month } = req.query; // formato YYYY-MM
  if (!month)
    return res.status(400).json({ error: "Se requiere mes (YYYY-MM)" });

<<<<<<< HEAD
  try {
=======
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const summary = await prisma.$queryRaw`
      SELECT
        SUM(amount) AS total_month,
        SUM(CASE WHEN EXTRACT(WEEK FROM "created_at") = EXTRACT(WEEK FROM NOW()) AND TO_CHAR("created_at", 'YYYY-MM') = ${month} THEN amount ELSE 0 END) AS total_week,
        AVG(amount) AS avg_weekly,
        (SELECT category FROM "expenses"
         WHERE TO_CHAR("created_at", 'YYYY-MM') = ${month}
         GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) AS top_category,
        (SELECT SUM(amount) FROM "expenses"
         WHERE TO_CHAR("created_at", 'YYYY-MM') = ${month}
         GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) AS top_amount
      FROM "expenses"
      WHERE TO_CHAR("created_at", 'YYYY-MM') = ${month}
    `;

    // $queryRaw devuelve un array, tomamos el primer elemento
    const result = summary[0] || {
      total_month: 0,
      total_week: 0,
      avg_weekly: 0,
      top_category: null,
      top_amount: 0,
    };

    // Convertir valores de Decimal a Float para JSON
    result.total_month = parseFloat(result.total_month || 0);
    result.total_week = parseFloat(result.total_week || 0);
    result.avg_weekly = parseFloat(result.avg_weekly || 0);
    result.top_amount = parseFloat(result.top_amount || 0);

    res.json(result);
<<<<<<< HEAD
  } catch (err) {
    console.error("❌ Error fetching expenses summary:", err.message);
    res.status(500).json({ error: "Error al obtener resumen de gastos" });
  }
});

// GET /api/expenses/weekly?month=YYYY-MM
router.get("/expenses/weekly", requireAuth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Se requiere mes" });

  try {
=======
}));

// GET /api/expenses/weekly?month=YYYY-MM
router.get("/expenses/weekly", requireAuth, asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Se requiere mes" });

>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const weeklyExpenses = await prisma.$queryRaw`
      SELECT
        EXTRACT(WEEK FROM "created_at") AS week_number,
        MIN("created_at") AS week_start,
        SUM(amount) AS total
      FROM "expenses"
      WHERE TO_CHAR("created_at", 'YYYY-MM') = ${month}
      GROUP BY EXTRACT(WEEK FROM "created_at")
      ORDER BY EXTRACT(WEEK FROM "created_at")
    `;

    // Convertir valores de Decimal a Float
    const result = weeklyExpenses.map((row) => ({
      ...row,
      total: parseFloat(row.total || 0),
      week_number: parseInt(row.week_number),
    }));

    res.json(result);
<<<<<<< HEAD
  } catch (err) {
    console.error("❌ Error fetching weekly expenses:", err.message);
    res.status(500).json({ error: "Error al obtener gastos semanales" });
  }
});

// GET /api/expenses/by-category?month=YYYY-MM
router.get("/expenses/by-category", requireAuth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Se requiere mes" });

  try {
=======
}));

// GET /api/expenses/by-category?month=YYYY-MM
router.get("/expenses/by-category", requireAuth, asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Se requiere mes" });

>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const totalMonthAmount = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(
            new Date(`${month}-01`).setMonth(
              new Date(`${month}-01`).getMonth() + 1,
            ),
          ),
        },
      },
    });
    const totalAmount = parseFloat(totalMonthAmount._sum.amount || 0);

    const expensesByCategory = await prisma.$queryRaw`
      SELECT
        category,
        SUM(amount) AS total
      FROM "expenses"
      WHERE TO_CHAR("created_at", 'YYYY-MM') = ${month}
      GROUP BY category
      ORDER BY total DESC
    `;

    const result = expensesByCategory.map((row) => ({
      ...row,
      total: parseFloat(row.total || 0),
      percentage: totalAmount
        ? parseFloat(((row.total / totalAmount) * 100).toFixed(1))
        : 0,
    }));

    res.json(result);
<<<<<<< HEAD
  } catch (err) {
    console.error("❌ Error fetching expenses by category:", err.message);
    res.status(500).json({ error: "Error al obtener gastos por categoría" });
  }
});
=======
}));
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

// POST /api/expenses
router.post(
  "/expenses",
  requireAuth,
  validate(schemas.expense),
<<<<<<< HEAD
  async (req, res) => {
=======
  asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    let { id, date, category, concept, detail, amount, method, description } =
      req.body;

    // Generar ID si no viene
    const expenseId = id || "EXP-" + Date.now().toString(36).toUpperCase();

    // Limpiar monto (por si viene como string desde el frontend)
    const cleanAmount =
      parseFloat(String(amount).replace(/[^0-9.-]+/g, "")) || 0;

<<<<<<< HEAD
    try {
=======
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
      // VALIDACIÓN DE DUPLICADOS
      const existing = await prisma.expense.findUnique({
        where: { id: expenseId },
      });
      if (existing) {
        return res
          .status(400)
          .json({ error: `Ya existe un gasto con el ID ${expenseId}` });
      }

      const expense = await prisma.expense.create({
        data: {
          id: expenseId,
          // Sincronizar fecha manual y de auditoría
          date: date && !isNaN(new Date(date)) ? new Date(date) : new Date(),
          createdAt:
            date && !isNaN(new Date(date)) ? new Date(date) : new Date(),
          category: category || null,
          concept: concept || null,
          detail: detail || null,
          description: description || null,
          method: method || "Efectivo",
          amount: cleanAmount,
        },
      });
<<<<<<< HEAD
=======

      await AuditService.log(req, {
        action: "CREATE",
        targetType: "EXPENSE",
        targetId: expenseId,
        details: { amount: cleanAmount, concept }
      });

>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
      res.status(201).json({
        success: true,
        expense: { ...expense, date: expense.createdAt.toISOString() },
      });
<<<<<<< HEAD
    } catch (err) {
      console.error("❌ Error creating expense:", err.message);
      res.status(500).json({ error: "Error al registrar gasto" });
    }
  },
=======
  }),
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
);

// PUT /api/expenses/:id
router.put(
  "/expenses/:id",
  requireAuth,
  validate(schemas.expense),
<<<<<<< HEAD
  async (req, res) => {
=======
  asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const { date, category, concept, detail, amount, method, description } =
      req.body;
    const cleanAmount =
      parseFloat(String(amount).replace(/[^0-9.-]+/g, "")) || 0;

<<<<<<< HEAD
    try {
      const expenseDate =
        date && !isNaN(new Date(date)) ? new Date(date) : undefined;

      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          date: expenseDate,
          createdAt: expenseDate,
          category: category !== undefined ? category || null : undefined,
          concept: concept !== undefined ? concept || null : undefined,
          detail: detail !== undefined ? detail || null : undefined,
          description:
            description !== undefined ? description || null : undefined,
          method: method !== undefined ? method || "Efectivo" : undefined,
          amount: cleanAmount,
          updatedAt: new Date(),
        },
      });
      res.json({
        success: true,
        expense: { ...expense, date: expense.createdAt.toISOString() },
      });
    } catch (err) {
      console.error("❌ Error updating expense:", err.message);
      res.status(500).json({ error: "Error al actualizar gasto" });
    }
  },
);

// DELETE /api/expenses/:id
router.delete("/expenses/:id", requireAuth, async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Gasto eliminado" });
  } catch (err) {
    console.error("❌ Error deleting expense:", err.message);
    res.status(500).json({ error: "Error al eliminar gasto" });
  }
});
=======
    const expenseDate =
      date && !isNaN(new Date(date)) ? new Date(date) : undefined;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        date: expenseDate,
        createdAt: expenseDate,
        category: category !== undefined ? category || null : undefined,
        concept: concept !== undefined ? concept || null : undefined,
        detail: detail !== undefined ? detail || null : undefined,
        description:
          description !== undefined ? description || null : undefined,
        method: method !== undefined ? method || "Efectivo" : undefined,
        amount: cleanAmount,
        updatedAt: new Date(),
      },
    });

    await AuditService.log(req, {
      action: "UPDATE",
      targetType: "EXPENSE",
      targetId: req.params.id,
      details: { amount: cleanAmount, concept }
    });

    res.json({
      success: true,
      expense: { ...expense, date: expense.createdAt.toISOString() },
    });
  }),
);

// DELETE /api/expenses/:id
router.delete("/expenses/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  
  await AuditService.log(req, {
    action: "DELETE",
    targetType: "EXPENSE",
    targetId: req.params.id
  });

  res.json({ success: true, message: "Gasto eliminado" });
}));
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

module.exports = router;
