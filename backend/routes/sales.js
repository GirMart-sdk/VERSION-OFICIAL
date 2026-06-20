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

// PATCH /api/sales/:saleId - Actualizar logística (separados)
router.patch("/sales/:saleId", async (req, res, next) => {
  try {
    const { saleId } = req.params;
    const { payment_details } = req.body || {};

    if (!payment_details || typeof payment_details !== "object") {
      return res.status(400).json({ error: "payment_details inválido" });
    }

    const { shipping_status, tracking_number } = payment_details;

    const updated = await SalesService.updateSaleLogistics(saleId, {
      shipping_status,
      tracking_number,
      // mantener el resto si viniera
      ...payment_details,
    });

    return res.json({ success: true, saleId: updated.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
