"use strict";

const express = require("express");
const { prisma } = require("../database");
const { requireApiKey, requireAuth } = require("../middlewares/auth");
const { validate, schemas } = require("../middlewares/validation");
<<<<<<< HEAD
=======
const asyncHandler = require("../utils/asyncHandler");
const StatsService = require("../services/statsService");
const AuditService = require("../services/auditService");
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

const router = express.Router();

// GET /api/products — todos los productos con stock
<<<<<<< HEAD
router.get("/products", requireApiKey, async (req, res) => {
  const { category, search } = req.query;
  try {
=======
router.get("/products", requireApiKey, asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  // Punto Ciego: Evitar búsquedas costosas de un solo caracter
  if (search && search.length < 2 && !category) {
    return res.json([]);
  }

>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
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
<<<<<<< HEAD
      include: { inventory: true },
=======
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
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    });

    const formatted = products.map((p) => {
      const stockObj = {};
      p.inventory?.forEach((inv) => {
        stockObj[inv.size] = inv.quantity;
      });
<<<<<<< HEAD
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
=======
      return { ...p, oldPrice: p.old_price, cat: p.category, stock: stockObj };
    });
    res.json(formatted);
}));

// GET /api/products/:id — un producto
router.get("/products/:id", requireApiKey, asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!product)
      return res.status(404).json({ error: "Producto no encontrado" });
    res.json(product);
<<<<<<< HEAD
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/barcode/:code — Buscar talla específica
router.get("/inventory/barcode/:code", requireApiKey, async (req, res) => {
  try {
=======
}));

// GET /api/inventory/barcode/:code — Buscar talla específica
router.get("/inventory/barcode/:code", requireApiKey, asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
    const item = await prisma.inventory.findUnique({
      where: { barcode: req.params.code },
      include: { product: true },
    });
    if (!item)
      return res.status(404).json({ error: "Código de barras no registrado" });
    res.json(item);
<<<<<<< HEAD
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
=======
}));
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

// POST /api/products — crear o actualizar producto
router.post(
  "/products",
  requireAuth,
  validate(schemas.product),
<<<<<<< HEAD
  async (req, res) => {
=======
  asyncHandler(async (req, res) => {
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
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

<<<<<<< HEAD
    try {
=======
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
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
<<<<<<< HEAD
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

/**
 * GET /api/merchant/feed.csv
 * Genera un feed compatible con Google/Facebook Shopping
 */
router.get("/merchant/feed.csv", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { inventory: true } });
    const baseUrl = process.env.FRONTEND_URL || `http://${req.get('host')}`;
    
    let csv = "id,title,description,link,image_link,availability,price,brand,condition,gender\n";
    
    products.forEach(p => {
      const hasStock = p.inventory.some(i => i.quantity > 0);
      const row = [
        p.id,
        `"${p.name}"`,
        `"${p.description || p.name}"`,
        `${baseUrl}/#productos?product=${p.id}`,
        `${baseUrl}${p.image || p.img}`,
        hasStock ? "in stock" : "out of stock",
        `${p.price} COP`,
        "Winner",
        "new",
        p.category.toLowerCase().includes("dama") ? "female" : "unisex"
      ];
      csv += row.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=merchant_feed.csv");
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).send("Error generando feed");
  }
});
=======
      
      await AuditService.log(req, {
        action: id ? "UPDATE" : "CREATE",
        targetType: "PRODUCT",
        targetId: productId,
        details: { name, price, sku }
      });

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
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733

module.exports = router;
