"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireAuth } = require("../middlewares/auth");
const { validate, schemas } = require("../middlewares/validation");
const asyncHandler = require("../utils/asyncHandler");
const StatsService = require("../services/statsService");
const AuditService = require("../services/auditService");

const router = express.Router();

// GET /api/products — todos los productos con stock
router.get("/products", requireAuth, asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  // Punto Ciego: Evitar búsquedas costosas de un solo caracter
  if (search && search.length < 2 && !category) {
    return res.json([]);
  }

    const products = await prisma.product.findMany({
      where: {
        AND: [
          category && category !== "all"
            ? { category: { equals: category, mode: "insensitive" } }
            : {},
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { id: { contains: search, mode: "insensitive" } },
                  { inventory: { some: { barcode: { contains: search } } } },
                ],
              }
            : {},
        ],
      },
      select: {
        id: true,
        name: true,
        price: true,
        old_price: true,
        category: true,
        image: true,
        badge: true,
        badgeType: true,
        sku: true,
        inventory: {
          select: { size: true, quantity: true }
        }
      },
    });

    const formatted = products.map((p) => {
      const stockObj = {};
      p.inventory?.forEach((inv) => {
        stockObj[inv.size] = inv.quantity;
      });
      return { ...p, oldPrice: p.old_price, cat: p.category, stock: stockObj };
    });
    res.json(formatted);
}));

// GET /api/products/:id — un producto
router.get("/products/:id", requireAuth, asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!product)
      return res.status(404).json({ error: "Producto no encontrado" });
    res.json(product);
}));

// GET /api/inventory/barcode/:code — Buscar talla específica
router.get("/inventory/barcode/:code", requireAuth, asyncHandler(async (req, res) => {
    const item = await prisma.inventory.findUnique({
      where: { barcode: req.params.code },
      include: { product: true },
    });
    if (!item)
      return res.status(404).json({ error: "Código de barras no registrado" });
    res.json(item);
}));

// POST /api/products — crear o actualizar producto
router.post(
  "/products",
  requireAuth,
  validate(schemas.product),
  asyncHandler(async (req, res) => {
    const {
      id,
      name,
      price,
      cost,
      category,
      image,
      badge,
      badgeType,
      sku,
      description,
      stock,
    } = req.body;
    let productId = id;

    // --- INICIO: Lógica de Auditoría Detallada ---
    let oldProduct = null;
    if (id) { // Si es una actualización, buscamos el estado anterior
      oldProduct = await prisma.product.findUnique({ where: { id } });
    }
    // --- FIN: Lógica de Auditoría Detallada ---

      if (sku) {
        const existing = await prisma.product.findFirst({ where: { sku } });
        if (existing) productId = existing.id;
      }
      if (!productId) productId = "P" + Date.now().toString(36).toUpperCase();

      await prisma.$transaction(async (tx) => {
        await tx.product.upsert({
          where: { id: productId },
          update: {
            name,
            price,
            cost,
            category,
            image,
            badge,
            badgeType,
            sku,
            description,
          },
          create: {
            id: productId,
            name,
            price,
            cost,
            category,
            image,
            badge,
            badgeType,
            sku,
            description,
          },
        });

        if (stock && typeof stock === "object") {
          for (const [size, qty] of Object.entries(stock)) {
            await tx.inventory.upsert({
              where: { productId_size: { productId, size } },
              update: { quantity: Number(qty) || 0 },
              create: { productId, size, quantity: Number(qty) || 0 },
            });
          }
        }
      });
      
      // --- INICIO: Registro de Auditoría Mejorado ---
      let auditDetails = { name, price, sku }; // Detalles básicos para la creación

      if (oldProduct) { // Si fue una actualización, calculamos los cambios
        const changes = {};
        if (oldProduct.name !== name) changes.name = { from: oldProduct.name, to: name };
        if (Number(oldProduct.price) !== price) changes.price = { from: Number(oldProduct.price), to: price };
        if (oldProduct.cost !== cost) changes.cost = { from: Number(oldProduct.cost), to: cost };
        if (oldProduct.category !== category) changes.category = { from: oldProduct.category, to: category };
        if (oldProduct.sku !== sku) changes.sku = { from: oldProduct.sku, to: sku };
        
        // Solo registramos si hubo cambios reales
        if (Object.keys(changes).length > 0) {
          auditDetails = { changes };
        }
      }

      await AuditService.log(req, {
        action: id ? "UPDATE" : "CREATE",
        targetType: "PRODUCT",
        targetId: productId,
        details: auditDetails
      });
      // --- FIN: Registro de Auditoría Mejorado ---

      res.json({ success: true, id: productId });
  }),
);

// PUT /api/products/:id/stock — solo stock
router.put("/products/:id/stock", requireAuth, asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const productId = req.params.id;
  await prisma.$transaction(
    Object.entries(stock).map(([size, qty]) =>
      prisma.inventory.upsert({
        where: { productId_size: { productId, size } },
        update: { quantity: Number(qty) || 0 },
        create: { productId, size, quantity: Number(qty) || 0 },
      }),
    ),
  );
  res.json({ success: true });
}));

// DELETE /api/products/:id
router.delete("/products/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.product.delete({
    where: { id: req.params.id },
  });
  
  await AuditService.log(req, {
    action: "DELETE",
    targetType: "PRODUCT",
    targetId: req.params.id
  });

  res.json({ success: true });
}));

// GET /api/analytics/low-stock — Alertas de bajo inventario
router.get("/analytics/low-stock", requireAuth, asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 5;
  const alerts = await StatsService.getLowStockAlerts(threshold);
  res.json(alerts);
}));

module.exports = router;
