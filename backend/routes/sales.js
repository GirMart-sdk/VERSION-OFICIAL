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
    // MODIFICACIÓN: Ahora el servicio de ventas incluirá los items detallados con su costo. Esto es crucial para que el frontend pueda calcular la rentabilidad.
    // El método `getAllSales` en `salesService.js` debe ser actualizado para que haga un `include` en la consulta de Prisma y traiga los `items` con la información del `product` relacionado.
    // Ejemplo en salesService.js:
    // return prisma.sale.findMany({ include: { items: { include: { product: true } } } })
    // Al hacer esto, cada 'item' de la venta tendrá un objeto 'product' con su 'cost'.
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
    const { payment_details, amount, method, notes } = req.body || {};

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Cuerpo de la petición vacío" });
    }

    let updated;

    // Si viene 'amount', es un abono. Usamos el servicio de pagos.
    if (amount !== undefined) {
      updated = await SalesService.addPayment(saleId, { amount, method, notes });
    } 
    // Si viene 'payment_details', es una actualización de logística.
    else if (payment_details) {
      updated = await SalesService.updateSaleLogistics(saleId, payment_details);
    } 
    // Si no es ninguno de los dos, es una petición inválida.
    else {
      return res.status(400).json({ error: "No se especificó una acción válida (pago o logística)." });
    }

    return res.json({ success: true, saleId: updated.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
