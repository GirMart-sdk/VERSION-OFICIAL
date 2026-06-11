"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireApiKey, requireAuth } = require("../middlewares/auth");
const { validate, schemas } = require("../middlewares/validation");

const router = express.Router();

// GET /api/products — todos los productos con stock
router.get("/products", requireApiKey, async (req, res) => {
  const { category, search } = req.query;
  try {
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
      include: { inventory: true },
    });

    const formatted = products.map((p) => {
      const stockObj = {};
      p.inventory?.forEach((inv) => {
        stockObj[inv.size] = inv.quantity;
      });
      return { ...p, cat: p.category, stock: stockObj };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id — un producto
router.get("/products/:id", requireApiKey, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!product)
      return res.status(404).json({ error: "Producto no encontrado" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/barcode/:code — Buscar talla específica
router.get("/inventory/barcode/:code", requireApiKey, async (req, res) => {
  try {
    const item = await prisma.inventory.findUnique({
      where: { barcode: req.params.code },
      include: { product: true },
    });
    if (!item)
      return res.status(404).json({ error: "Código de barras no registrado" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — crear o actualizar producto
router.post(
  "/products",
  requireAuth,
  validate(schemas.product),
  async (req, res) => {
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

    try {
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
      res.json({ success: true, id: productId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// PUT /api/products/:id/stock — solo stock
router.put("/products/:id/stock", requireAuth, async (req, res) => {
  const { stock } = req.body;
  const productId = req.params.id;
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/low-stock — Alertas de bajo inventario
router.get("/analytics/low-stock", requireAuth, async (req, res) => {
  const threshold = Number(req.query.threshold) || 5;
  try {
    const lowStock = await prisma.inventory.findMany({
      where: {
        quantity: { lte: threshold },
      },
      include: {
        product: true,
      },
    });
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar alertas de stock" });
  }
});

module.exports = router;
