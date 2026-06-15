"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireAuth, requireApiKey } = require("../middlewares/auth");
const { randomUUID, createHash } = require("crypto");
const { sendSaleEmail } = require("../../emails/mailer");
const { validate, schemas } = require("../middlewares/validation");
const asyncHandler = require("../utils/asyncHandler");
const StatsService = require("../services/statsService");
const SalesService = require("../services/salesService");

const router = express.Router();

// Helper local para formateo de moneda en logs de error
const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

// GET /api/sales — Historial completo
router.get("/sales", requireAuth, asyncHandler(async (req, res) => {
  const { from, to, limit = 500 } = req.query;
  // Solo mostrar ventas que NO han sido anuladas
  const where = {
    deletedAt: null
  };
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true } } } },
        orders: { take: 1, orderBy: { createdAt: "desc" } },
        salePayments: true,
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    const formatted = sales.map((sale) => ({
      id: sale.id,
      timestamp: sale.createdAt.toISOString(),
      client: sale.customerName,
      customer_phone: sale.customerPhone,
      shipping_address: sale.shippingAddress,
      shipping_carrier: sale.shippingCarrier,
      total: sale.totalAmount,
      method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      channel: sale.id.startsWith("ON") ? "online" : "fisica",
      payment_details: {
        ...(typeof sale.payment_details === "string"
          ? JSON.parse(sale.payment_details || "{}")
          : sale.payment_details || {}),
        ...(sale.orders?.[0]
          ? {
              shipping_status: sale.orders[0].status,
              tracking_number: sale.orders[0].trackingNumber,
            }
          : {}),
      },
      total_paid: sale.salePayments.reduce((sum, p) => sum + Number(p.amount), 0),
    }));
    res.json(formatted);
}));

// POST /api/sales — registrar venta (desde admin o tienda online)
router.post("/sales", validate(schemas.sale), asyncHandler(async (req, res) => {
    // Delegar toda la complejidad al SalesService para garantizar atomicidad
    // y consistencia en el descuento de inventario.
    const sale = await SalesService.createSale(req.body);
    return res.json({ success: true, id: sale.id });
}));

// PATCH /api/sales/:id — Actualizar logística
router.patch("/sales/:id", requireAuth, asyncHandler(async (req, res) => {
  const { payment_details, payment_status, shipping_address } = req.body;
    await prisma.$transaction(async (tx) => {
      const saleUpdate = {};
      if (shipping_address) saleUpdate.shippingAddress = shipping_address;
      const details =
        typeof payment_details === "string"
          ? JSON.parse(payment_details)
          : payment_details;

      if (
        ["ENTREGADO", "PAGADO"].includes(details?.shipping_status) ||
        payment_status === "completed"
      ) {
        saleUpdate.paymentStatus = "completed";
        const currentSale = await tx.sale.findUnique({
          where: { id: req.params.id },
          include: { salePayments: true },
        });
        if (currentSale) {
          const paid = currentSale.salePayments.reduce((sum, p) => sum + Number(p.amount), 0);
          const balance = currentSale.totalAmount - paid;
          if (balance > 0) {
            await tx.salePayment.create({
              data: {
                saleId: currentSale.id,
                amount: balance,
                method: currentSale.paymentMethod || "Efectivo",
                notes: "Cierre automático por entrega",
              },
            });
          }
        }
      } else if (payment_status) {
        saleUpdate.paymentStatus = payment_status;
      }

      if (Object.keys(saleUpdate).length > 0)
        await tx.sale.update({
          where: { id: req.params.id },
          data: saleUpdate,
        });

      if (payment_details) {
        const order = await tx.order.findFirst({
          where: { saleId: req.params.id },
        });
        if (order) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: details.shipping_status,
              trackingNumber: details.tracking_number,
            },
          });
        } else {
          await tx.order.create({
            data: {
              id: "ORD-" + randomUUID().slice(0, 8),
              saleId: req.params.id,
              status: details.shipping_status || "PENDIENTE",
              trackingNumber: details.tracking_number || "",
            },
          });
        }
      }
    });
    res.json({ success: true });
}));

// DELETE /api/sales/:id
router.delete("/sales/:id", requireAuth, asyncHandler(async (req, res) => {
  const saleId = req.params.id;

  // En lugar de borrar, marcamos como eliminado (Soft Delete)
  await prisma.sale.update({
    where: { id: saleId },
    data: { deletedAt: new Date() }
  });

  await AuditService.log(req, {
    action: "ANNULMENT",
    targetType: "SALE",
    targetId: saleId,
    details: { message: "Venta anulada por el administrador" }
  });

  res.json({ success: true, message: "Venta anulada correctamente" });
}));

// Gestión de Abonos
router.get("/sales/:id/payments", requireAuth, asyncHandler(async (req, res) => {
  const payments = await prisma.salePayment.findMany({
    where: { saleId: req.params.id },
    orderBy: { timestamp: "desc" },
  });
  res.json(payments);
}));

router.post("/sales/:id/payments", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body; // { amount, method, notes }

  const updatedSale = await SalesService.addPayment(id, paymentData);
  res.json({ success: true, sale: updatedSale });
}));

// GET /api/stats — KPI Dashboard
router.get("/stats", requireAuth, asyncHandler(async (req, res) => {
  const stats = await StatsService.getDashboardStats();
  res.json(stats);
}));

// GET /api/analytics/top-products — KPI de productos más vendidos para el Dashboard
router.get("/analytics/top-products", requireAuth, asyncHandler(async (req, res) => {
  const topProducts = await StatsService.getTopProducts(5);
  res.json(topProducts);
}));

// POST /api/checkout/init — Generar parámetros de seguridad para Wompi
router.post(
  "/checkout/init",
  validate(schemas.checkoutInit),
  asyncHandler(async (req, res) => {
    const { saleId, email } = req.body;

    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    // SEGURIDAD: No confiar en el 'amount' del body. Buscar el valor real en la DB.
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { totalAmount: true }
    });

    if (!sale) return res.status(404).json({ error: "Venta no encontrada" });
    const realAmount = Number(sale.totalAmount);

    // Si no hay configuración de Wompi en el .env, indicamos al front que use pago manual
    if (!publicKey || !integritySecret) {
      console.warn(
        "⚠️ Wompi no configurado correctamente. Derivando a pago manual.",
      );
      return res.json({ isManual: true });
    }

    const amountInCents = Math.round(realAmount * 100);
    const currency = "COP";

    // Generar firma de integridad (Integrity Check) requerida por Wompi
    const chain = `${saleId}${amountInCents}${currency}${integritySecret.trim()}`;
    const integrity = require("crypto")
      .createHash("sha256")
      .update(chain)
      .digest("hex");

    res.json({
      config: {
        publicKey,
        currency,
        amountInCents,
        reference: saleId,
        signature: { integrity },
        customerEmail: email || "",
      },
    });
  }),
);

module.exports = router;
