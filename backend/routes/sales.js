"use strict";

const express = require("express");
const router = express.Router();
const SalesService = require("../services/salesService");
const { requireAuth } = require("../middlewares/auth");
const validateRequest = require("../middlewares/validationMiddleware");
const { createSaleSchema } = require("../services/salesValidator");

// GET /api/sales - Listar todas las ventas (protegido)
router.get("/sales", requireAuth, async (req, res, next) => {
  try {
    // Aquí iría la lógica para obtener las ventas, por ahora devolvemos un array vacío
    const sales = await SalesService.getAllSales(req.query); // Suponiendo que existe un método getAllSales
    res.json(sales);
  } catch (error) {
    next(error);
  }
});

// POST /api/sales - Crear una nueva venta con validación de esquema
router.post("/sales", validateRequest(createSaleSchema), async (req, res, next) => {
  try {
    const sale = await SalesService.createSale(req.body);
    res.status(201).json({ success: true, id: sale.id });
  } catch (error) {
    // El middleware de errores global se encargará de esto
    next(error);
  }
});

module.exports = router;