"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireAuth, requireApiKey } = require("../middlewares/auth");
const { randomUUID, createHash } = require("crypto");
const { sendSaleEmail, sendDailyReportEmail } = require("../../emails/mailer");
const { validate, schemas } = require("../middlewares/validation");

const router = express.Router();

// GET /api/sales — Historial completo
router.get("/sales", requireAuth, async (req, res) => {
  const { from, to, limit = 500 } = req.query;
  const where = {};
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

  try {
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
      total: sale.totalAmount,
      method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      channel: sale.id.startsWith("ON") ? "online" : "fisica",
      payment_details: sale.orders?.[0]
        ? {
            shipping_status: sale.orders[0].status,
            tracking_number: sale.orders[0].trackingNumber,
          }
        : {},
      total_paid: sale.salePayments.reduce((sum, p) => sum + p.amount, 0),
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales — registrar venta (desde admin o tienda online)
router.post("/sales", validate(schemas.sale), async (req, res) => {
  const {
    id,
    total,
    items,
    client,
    customer_email,
    customer_phone,
    payment_method,
    payment_status,
    shipping_address,
    shipping_carrier,
    payment_details,
  } = req.body;

  if (!total || !items?.length)
    return res
      .status(400)
      .json({ error: "Datos de venta incompletos", success: false });

  const saleId = id || `S${Date.now().toString(36).toUpperCase()}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const finalItems = [];
      for (const item of items) {
        let pId = item.id || item.productId;
        const inv = await tx.inventory.findFirst({
          where: { productId: pId, size: item.size || "U" },
        });
        if (!inv || inv.quantity < item.qty)
          throw new Error(
            `Stock insuficiente para ${item.name} (${item.size || "U"})`,
          );
        await tx.inventory.update({
          where: {
            productId_size: {
              productId: inv.productId,
              size: inv.size,
            },
          },
          data: { quantity: { decrement: item.qty } },
        });
        finalItems.push({ ...item, correctedId: pId });
      }

      return await tx.sale.create({
        data: {
          id: saleId,
          customerName: client || "Consumidor Final",
          customerEmail: customer_email || null,
          customerPhone: customer_phone || null,
          totalAmount: total,
          paymentMethod: payment_method || "Efectivo",
          paymentStatus: payment_status || "completed",
          shippingAddress: shipping_address || null,
          referenceNumber: saleId,
          items: {
            create: finalItems.map((it) => ({
              productId: it.correctedId,
              product_name: it.name,
              size: it.size,
              quantity: it.qty,
              unitPrice: it.price,
            })),
          },
          salePayments:
            !payment_status || payment_status === "completed"
              ? {
                  create: [
                    {
                      amount: total,
                      method: payment_method || "Efectivo",
                      notes: "Pago inicial completo",
                    },
                  ],
                }
              : payment_details?.abonoAmount > 0
                ? {
                    create: [
                      {
                        amount: Number(payment_details.abonoAmount),
                        method: payment_method || "Abono",
                        notes: "Abono inicial",
                      },
                    ],
                  }
                : undefined,
          orders:
            shipping_address || shipping_carrier || payment_status === "partial"
              ? {
                  create: [
                    {
                      id: "ORD-" + randomUUID().slice(0, 8),
                      status:
                        payment_details?.shipping_status ||
                        (payment_status === "partial" ? "ABONO" : "PENDIENTE"),
                      shippingMethod: shipping_carrier || "Estándar",
                      shippingAddress:
                        shipping_address ||
                        (payment_status === "partial"
                          ? "Tienda (Apartado)"
                          : ""),
                      trackingNumber: "",
                    },
                  ],
                }
              : [],
        },
      });
    });

    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: { items: { include: { product: true } } },
    });
    sendSaleEmail(fullSale).catch((err) =>
      console.error("❌ Fallo crítico al enviar email:", err.message),
    );

    return res.json({ success: true, id: result.id });
  } catch (error) {
    return res.status(400).json({ error: error.message, success: false });
  }
});

// PATCH /api/sales/:id — Actualizar logística
router.patch("/sales/:id", requireAuth, async (req, res) => {
  const { payment_details, payment_status, shipping_address } = req.body;
  try {
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
          const paid = currentSale.salePayments.reduce(
            (sum, p) => sum + p.amount,
            0,
          );
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sales/:id
router.delete("/sales/:id", requireAuth, async (req, res) => {
  try {
    await prisma.sale.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gestión de Abonos
router.get("/sales/:id/payments", requireAuth, async (req, res) => {
  try {
    const payments = await prisma.salePayment.findMany({
      where: { saleId: req.params.id },
      orderBy: { timestamp: "desc" },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sales/:id/payments", requireAuth, async (req, res) => {
  const { amount, method, notes } = req.body;
  const saleId = req.params.id;
  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Monto inválido" });
  try {
    await prisma.salePayment.create({
      data: {
        saleId,
        amount: Number(amount),
        method: method || "Abono",
        notes: notes || "",
      },
    });
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { salePayments: { select: { amount: true } } },
    });
    const totalPaid = sale.salePayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus = totalPaid >= sale.totalAmount ? "completed" : "partial";
    await prisma.sale.update({
      where: { id: saleId },
      data: { paymentStatus: newStatus },
    });
    res.json({ success: true, message: "Abono registrado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — KPI Dashboard
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const statsWhere = { NOT: { orders: { some: { status: "CANCELADO" } } } };

    const [totalSales, totalRevenueAgg, salesToday, revenueTodayAgg] =
      await Promise.all([
        prisma.sale.count({ where: statsWhere }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: statsWhere,
        }),
        prisma.sale.count({
          where: { ...statsWhere, createdAt: { gte: today } },
        }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: { ...statsWhere, createdAt: { gte: today } },
        }),
      ]);

    const totalRevenue = totalRevenueAgg._sum.totalAmount || 0;

    res.json({
      totalSales,
      totalRevenue,
      salesToday,
      revenueToday: revenueTodayAgg._sum.totalAmount || 0,
      avgTicket: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/top-products — KPI de productos más vendidos para el Dashboard
router.get("/analytics/top-products", requireAuth, async (req, res) => {
  try {
    // Agrupamos los items de venta por producto y sumamos sus cantidades
    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId", "product_name"],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const formatted = topProducts.map((item) => ({
      name: item.product_name,
      qty_sold: item._sum.quantity || 0,
    }));

    res.json(formatted);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error al obtener estadísticas de productos" });
  }
});

// POST /api/checkout/init — Generar parámetros de seguridad para Wompi
router.post(
  "/checkout/init",
  validate(schemas.checkoutInit),
  async (req, res) => {
    const { saleId, amount, email } = req.body;

    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    // Si no hay configuración de Wompi en el .env, indicamos al front que use pago manual
    if (!publicKey || !integritySecret) {
      console.warn(
        "⚠️ Wompi no configurado correctamente. Derivando a pago manual.",
      );
      return res.json({ isManual: true });
    }

    const amountInCents = Math.round(amount * 100);
    const currency = "COP";

    // Generar firma de integridad (Integrity Check) requerida por Wompi
    const chain = `${saleId}${amountInCents}${currency}${integritySecret}`;
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
  },
);

/**
 * POST /api/reports/send-daily
 * Procesa y envía el reporte diario por correo.
 */
router.post("/reports/send-daily", requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Recolectar Ventas de hoy (que no hayan fallado)
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: today }, NOT: { paymentStatus: 'failed' } }
    });

    // 2. Recolectar Gastos de hoy
    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: today } }
    });

    // 3. Cálculos de resumen
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const methodBreakdown = {};
    sales.forEach(s => {
      methodBreakdown[s.paymentMethod] = (methodBreakdown[s.paymentMethod] || 0) + s.totalAmount;
    });

    // 4. Buscar el Arqueo de hoy (si existe)
    const arqueo = await prisma.cashSession.findFirst({
      where: { openedAt: { gte: today } },
      orderBy: { openedAt: 'desc' }
    });

    const reportData = {
      date: new Date().toLocaleDateString('es-CO'),
      totalSales,
      totalExpenses,
      netCash: totalSales - totalExpenses,
      methodBreakdown,
      arqueo: arqueo ? {
        realBalance: arqueo.realBalance,
        difference: arqueo.difference
      } : null
    };

    await sendDailyReportEmail(reportData);

    res.json({ 
      success: true, 
      message: "Informe enviado correctamente al correo del administrador." 
    });
  } catch (err) {
    console.error("Error enviando reporte diario:", err);
    res.status(500).json({ error: "No se pudo generar el reporte" });
  }
});

module.exports = router;
