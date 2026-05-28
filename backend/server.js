/* ═══════════════════════════════════════════════════════════
   WINNER STORE — server.js  v3.2
   Backend completo: Productos · Inventario · Ventas · Auth (PG/SQ)
   Merchant Feed CSV · Estadísticas · Seguridad JWT + API Key
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const { scryptSync, timingSafeEqual, randomUUID } = require("crypto");
const { URL } = require("url");

// Corregimos la ruta del .env para que siempre lo busque en la raíz del proyecto
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

/* ── Adaptador de Base de Datos ─────────────────────────── */
const DB_TYPE = process.env.DB_TYPE || "postgres";
const isPg = DB_TYPE === "postgres";

// Ahora 'prisma' es el motor oficial, reemplazando a 'db'
const prisma = require("./database");
const parseJson = (val, defaultVal = {}) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val || (Array.isArray(defaultVal) ? "[]" : "{}"));
    } catch {
      return defaultVal;
    }
  }
  return val || defaultVal;
};

// Helper para asegurar que el ID de producto sea válido antes de transacciones
async function validateProductId(tx, pid) {
  if (!pid) return false;
  const p = await tx.product.findUnique({ where: { id: pid } });
  return !!p;
}

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/* ── Configuración de seguridad ──────────────────────────── */
const API_KEY = process.env.API_KEY || "dev-api-key";
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-winner-2026";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-webhook-key";
const ADMIN_PLAIN = process.env.ADMIN_PASSWORD;
const ADMIN_SALT = process.env.ADMIN_SALT || "winner_salt_2026";
const ADMIN_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  scryptSync("winner2026", ADMIN_SALT, 64).toString("hex");

function passwordMatches(pass) {
  if (!pass) return false;
  if (ADMIN_PLAIN && pass === ADMIN_PLAIN) return true;
  try {
    const hash = scryptSync(pass, ADMIN_SALT, 64).toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(ADMIN_HASH, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ── CORS ───────────────────────────────────────────────── */
const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// En desarrollo, aseguramos que localhost y 127.0.0.1 estén permitidos
const allowedOrigins = [...envOrigins];
if (!IS_PRODUCTION) {
  if (!allowedOrigins.includes("http://localhost:3000"))
    allowedOrigins.push("http://localhost:3000");
  if (!allowedOrigins.includes("http://127.0.0.1:3000"))
    allowedOrigins.push("http://127.0.0.1:3000");
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Permitir si no hay origen (como apps móviles o curl) o si la lista está vacía
      // Agregamos 'null' para cuando se abren archivos .html directamente en el navegador
      if (!origin || origin === "null" || allowedOrigins.length === 0)
        return cb(null, true);

      // Permitir si el origen está explícitamente en la lista
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // Fallback para desarrollo: permitir cualquier variante de localhost
      if (
        !IS_PRODUCTION &&
        (!origin ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          origin.includes("::1"))
      ) {
        return cb(null, true);
      }

      return cb(null, true);
    },
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);

app.use(cookieParser());
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));

// Logger de peticiones para depuración
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

/* ── Error handler para bodyParser ──────────────────────– */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.warn("⚠️ JSON Parse Error:", err.message);
    return res.status(400).json({
      error: "JSON inválido en el body",
      message: err.message,
    });
  }
  next(err);
});

/* ── Seguridad de archivos sensibles ────────────────────── */
const CLIENT_ROOT = path.join(__dirname, "..");
const BLOCKED_EXTENSIONS = [".db", ".sqlite", ".env", ".log"];
const BLOCKED_FILES = ["seed.js", "database.js", ".env", "server.js"];

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    BLOCKED_EXTENSIONS.some((ext) => p.endsWith(ext)) ||
    BLOCKED_FILES.some((f) => p === "/" + f || p.endsWith("/" + f))
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

app.use(express.static(CLIENT_ROOT));

/* ── Endpoint de actualización masiva (CSV) ───────────────── */
app.post("/api/inventory/bulk-update", requireAuth, async (req, res) => {
  const { updates } = req.body; // Array de { sku/id, size, qty }
  if (!Array.isArray(updates))
    return res.status(400).json({ error: "Formato inválido" });

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const product = await tx.product.findFirst({
          where: { OR: [{ id: item.id }, { sku: item.sku }] },
        });
        if (!product) continue;

        await tx.inventory.upsert({
          where: { productId_size: { productId: product.id, size: item.size } },
          update: { quantity: item.qty },
          create: {
            productId: product.id,
            size: item.size,
            quantity: item.qty,
          },
        });
      }
    });
    res.json({ success: true, message: "Inventario actualizado masivamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Middleware de autenticación ────────────────────────── */
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (key === API_KEY) {
    req.authenticated = "api-key";
    return next();
  }
  return res.status(401).json({ error: "API key inválida" });
}

function requireAuth(req, res, next) {
  const auth = req.header("authorization") || "";
  const tokenFromCookie = req.cookies.w_token;
  const apiKey = req.header("x-api-key");

  // Priorizar token de cookie, luego Bearer token para compatibilidad
  const token =
    tokenFromCookie || (auth.startsWith("Bearer ") ? auth.slice(7) : null);

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.authenticated = "jwt";
      return next();
    } catch (e) {
      console.warn("JWT Auth Failed:", e.message);
      res.clearCookie("w_token"); // Limpia la cookie automáticamente si la firma es inválida o expiró
      // Continúa a verificar API_KEY como fallback
    }
  }

  // Si no hay token válido, intenta con API_KEY
  if (apiKey === API_KEY) {
    req.authenticated = "api-key";
    return next();
  }

  // Si nada funciona, rechaza
  return res.status(401).json({ error: "No autorizado" });
}

function normalizeProduct(row) {
  return {
    ...row,
    stock: parseJson(row.stock, {}),
    metadata: PRODUCT_METADATA[row.id] || {},
  };
}

/* ── Middlewares de Validación ─────────────────────────── */
const schemas = {
  product: Joi.object({
    id: Joi.string().allow(null, ""),
    name: Joi.string().required(),
    price: Joi.number().min(0).required(),
    oldPrice: Joi.number().min(0).allow(null),
    cost: Joi.number().min(0).default(0),
    category: Joi.string().allow(null, ""),
    image: Joi.string().allow(null, ""),
    badge: Joi.string().allow(null, ""),
    badgeType: Joi.string().allow(null, ""),
    sku: Joi.string().allow(null, ""),
    description: Joi.string().allow(null, ""),
    stock: Joi.object()
      .pattern(Joi.string(), Joi.number().integer().min(0))
      .allow(null),
    on_sale: Joi.boolean().default(false),
    promo_price: Joi.number().min(0).allow(null),
  }),
  sale: Joi.object({
    id: Joi.string().allow(null, ""),
    total: Joi.number().min(0).required(),
    items: Joi.array().items(Joi.object()).required(),
    customer_email: Joi.string().email().allow(null, ""),
    customer_phone: Joi.string().allow(null, ""),
    shipping_address: Joi.string().allow(null, ""),
    shipping_carrier: Joi.string().allow(null, ""),
    payment_method: Joi.string().allow(null, ""),
    payment_status: Joi.string()
      .valid("completed", "partial", "pending")
      .default("completed"),
  }).unknown(),
};

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ error: error.details[0].message, success: false });
  next();
};

/* ═══════════════════════════════════════════════════════════
   METADATA GOOGLE MERCHANT (25 productos)
   ═══════════════════════════════════════════════════════════ */
const PRODUCT_METADATA = {
  P001: {
    googleCategory:
      "Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts",
    productType: "Streetwear > Crop Hoodie Oversize",
    mpn: "WIN-P001",
    gtin: "7700000000012",
    gender: "female",
    ageGroup: "adult",
    color: "Negro grafito",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón peinado 320g",
    pattern: "Liso",
    shippingWeight: "0.65 kg",
    customLabel0: "Oferta",
    customLabel1: "Hoodies",
    additionalImages: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80",
    ],
  },
  P002: {
    googleCategory: "Apparel & Accessories > Clothing > Dresses",
    productType: "Streetwear > Mini Dress Urbana",
    mpn: "WIN-P002",
    gtin: "7700000000013",
    gender: "female",
    ageGroup: "adult",
    color: "Blanco hueso",
    size: "XS,S,M,L,XL,XXL",
    material: "Satín stretch",
    pattern: "Texturizado",
    shippingWeight: "0.52 kg",
    customLabel0: "Novedad",
    customLabel1: "Vestidos",
    additionalImages: [
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=900&q=80",
    ],
  },
  P003: {
    googleCategory: "Apparel & Accessories > Clothing > Activewear",
    productType: "Streetwear > Set Legging + Top",
    mpn: "WIN-P003",
    gtin: "7700000000014",
    gender: "female",
    ageGroup: "adult",
    color: "Negro/lima",
    size: "XS,S,M,L,XL",
    material: "Licra compresiva 4-way",
    pattern: "Bicolor",
    shippingWeight: "0.70 kg",
    customLabel0: "Oferta",
    customLabel1: "Conjuntos",
    additionalImages: [],
  },
  P004: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Blazers",
    productType: "Streetwear > Blazer Crop",
    mpn: "WIN-P004",
    gtin: "7700000000015",
    gender: "female",
    ageGroup: "adult",
    color: "Beige arena",
    size: "XS,S,M,L,XL",
    material: "Lino stretch",
    pattern: "Liso",
    shippingWeight: "0.60 kg",
    customLabel0: "Premium",
    customLabel1: "Blazers",
    additionalImages: [],
  },
  P005: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Jogger Mom Fit",
    mpn: "WIN-P005",
    gtin: "7700000000016",
    gender: "female",
    ageGroup: "adult",
    color: "Gris jaspeado",
    size: "XS,S,M,L,XL,XXL",
    material: "French terry",
    pattern: "Liso",
    shippingWeight: "0.55 kg",
    customLabel0: "Básicos",
    customLabel1: "Joggers",
    additionalImages: [],
  },
  P006: {
    googleCategory:
      "Apparel & Accessories > Clothing > Shirts & Tops > T-shirts",
    productType: "Streetwear > Camiseta Ribbed",
    mpn: "WIN-P006",
    gtin: "7700000000017",
    gender: "female",
    ageGroup: "adult",
    color: "Crema",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón acanalado",
    pattern: "Acanalado",
    shippingWeight: "0.35 kg",
    customLabel0: "Oferta",
    customLabel1: "Tops",
    additionalImages: [],
  },
  P007: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Shorts Cargo Y2K",
    mpn: "WIN-P007",
    gtin: "7700000000018",
    gender: "female",
    ageGroup: "adult",
    color: "Caqui",
    size: "XS,S,M,L,XL",
    material: "Gabardina",
    pattern: "Cargo",
    shippingWeight: "0.42 kg",
    customLabel0: "Oferta",
    customLabel1: "Shorts",
    additionalImages: [],
  },
  P008: {
    googleCategory: "Apparel & Accessories > Clothing > Dresses",
    productType: "Streetwear > Vestido Asimétrico",
    mpn: "WIN-P008",
    gtin: "7700000000019",
    gender: "female",
    ageGroup: "adult",
    color: "Negro",
    size: "XS,S,M,L,XL",
    material: "Satín mate",
    pattern: "Liso",
    shippingWeight: "0.50 kg",
    customLabel0: "Premium",
    customLabel1: "Vestidos",
    additionalImages: [],
  },
  P009: {
    googleCategory:
      "Apparel & Accessories > Clothing > Shirts & Tops > T-shirts",
    productType: "Streetwear > Oversize Tee W Logo",
    mpn: "WIN-P009",
    gtin: "7700000000020",
    gender: "male",
    ageGroup: "adult",
    color: "Blanco puro",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón orgánico 200g",
    pattern: "Grafiti",
    shippingWeight: "0.35 kg",
    customLabel0: "Básicos",
    customLabel1: "Camisetas",
    additionalImages: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80",
    ],
  },
  P010: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Jogger Cargo Premium",
    mpn: "WIN-P010",
    gtin: "7700000000021",
    gender: "male",
    ageGroup: "adult",
    color: "Caqui militar",
    size: "S,M,L,XL,XXL",
    material: "Gabardina stretch",
    pattern: "Cargo",
    shippingWeight: "0.58 kg",
    customLabel0: "Oferta",
    customLabel1: "Joggers",
    additionalImages: [],
  },
  P011: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    productType: "Streetwear > Bomber Reflex Táctico",
    mpn: "WIN-P011",
    gtin: "7700000000022",
    gender: "male",
    ageGroup: "adult",
    color: "Negro metálico",
    size: "S,M,L,XL",
    material: "Nylon técnico reflectivo",
    pattern: "Reflectivo",
    shippingWeight: "0.72 kg",
    customLabel0: "Novedad",
    customLabel1: "Bomber",
    additionalImages: [],
  },
  P012: {
    googleCategory:
      "Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts",
    productType: "Streetwear > Hoodie Canguro",
    mpn: "WIN-P012",
    gtin: "7700000000023",
    gender: "male",
    ageGroup: "adult",
    color: "Gris carbón",
    size: "XS,S,M,L,XL,XXL",
    material: "Fleece pesado 380g",
    pattern: "Liso",
    shippingWeight: "0.68 kg",
    customLabel0: "Básicos",
    customLabel1: "Hoodies",
    additionalImages: [],
  },
  P013: {
    googleCategory: "Apparel & Accessories > Clothing > Activewear",
    productType: "Streetwear > Camiseta Dry-Fit",
    mpn: "WIN-P013",
    gtin: "7700000000024",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Poliéster técnico",
    pattern: "Liso",
    shippingWeight: "0.28 kg",
    customLabel0: "Sport",
    customLabel1: "Camisetas",
    additionalImages: [],
  },
  P014: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: 'Streetwear > Short Deportivo 5"',
    mpn: "WIN-P014",
    gtin: "7700000000025",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Poliéster stretch",
    pattern: "Liso",
    shippingWeight: "0.30 kg",
    customLabel0: "Oferta",
    customLabel1: "Shorts",
    additionalImages: [],
  },
  P015: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    productType: "Streetwear > Chaqueta Rompevientos Neon",
    mpn: "WIN-P015",
    gtin: "7700000000026",
    gender: "male",
    ageGroup: "adult",
    color: "Lima neon",
    size: "S,M,L,XL,XXL",
    material: "Nylon ligero",
    pattern: "Liso",
    shippingWeight: "0.55 kg",
    customLabel0: "Oferta",
    customLabel1: "Chaquetas",
    additionalImages: [],
  },
  P016: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Pantalón Cargo Multicorreas",
    mpn: "WIN-P016",
    gtin: "7700000000027",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Gabardina técnica",
    pattern: "Multicorreas",
    shippingWeight: "0.70 kg",
    customLabel0: "Premium",
    customLabel1: "Cargo",
    additionalImages: [],
  },
  P017: {
    googleCategory: "Apparel & Accessories > Clothing Accessories > Hats",
    productType: "Streetwear > Bucket Hat Logo W",
    mpn: "WIN-P017",
    gtin: "7700000000028",
    gender: "unisex",
    ageGroup: "adult",
    color: "Beige arena",
    size: "U",
    material: "Lona liviana",
    pattern: "Liso",
    shippingWeight: "0.20 kg",
    customLabel0: "Accesorios",
    customLabel1: "Sombreros",
    additionalImages: [],
  },
  P018: {
    googleCategory: "Apparel & Accessories > Clothing Accessories > Hats",
    productType: "Streetwear > Gorra Snapback Premium",
    mpn: "WIN-P018",
    gtin: "7700000000029",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro",
    size: "U",
    material: "Lona rígida",
    pattern: "Liso",
    shippingWeight: "0.22 kg",
    customLabel0: "Básicos",
    customLabel1: "Gorras",
    additionalImages: [],
  },
  P019: {
    googleCategory: "Apparel & Accessories > Bags > Backpacks",
    productType: "Streetwear > Mochila Táctica Urbana",
    mpn: "WIN-P019",
    gtin: "7700000000030",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro carbón",
    size: "U",
    material: "Poliéster 600D",
    pattern: "Geométrico",
    shippingWeight: "0.95 kg",
    customLabel0: "Oferta",
    customLabel1: "Mochilas",
    additionalImages: [],
  },
  P020: {
    googleCategory: "Apparel & Accessories > Handbags > Crossbody Bags",
    productType: "Streetwear > Bolso Crossbody Cuero PU",
    mpn: "WIN-P020",
    gtin: "7700000000031",
    gender: "female",
    ageGroup: "adult",
    color: "Marrón",
    size: "U",
    material: "Cuero sintético PU",
    pattern: "Liso",
    shippingWeight: "0.65 kg",
    customLabel0: "Oferta",
    customLabel1: "Bolsos",
    additionalImages: [],
  },
  P021: {
    googleCategory: "Apparel & Accessories > Jewelry > Necklaces",
    productType: "Streetwear > Cadena Cubana Acero",
    mpn: "WIN-P021",
    gtin: "7700000000032",
    gender: "unisex",
    ageGroup: "adult",
    color: "Plateado",
    size: "U",
    material: "Acero inoxidable 316L",
    pattern: "Cubano",
    shippingWeight: "0.15 kg",
    customLabel0: "Oferta",
    customLabel1: "Joyería",
    additionalImages: [],
  },
  P022: {
    googleCategory:
      "Apparel & Accessories > Clothing Accessories > Sunglasses & Eyewear",
    productType: "Streetwear > Gafas Espejadas Y2K",
    mpn: "WIN-P022",
    gtin: "7700000000033",
    gender: "unisex",
    ageGroup: "adult",
    color: "Espejado multicolor",
    size: "U",
    material: "TR90 + policarbonato",
    pattern: "Espejado",
    shippingWeight: "0.08 kg",
    customLabel0: "Oferta",
    customLabel1: "Gafas",
    additionalImages: [],
  },
  P023: {
    googleCategory: "Apparel & Accessories > Bags > Waist Packs",
    productType: "Streetwear > Riñonera Neon Reflectiva",
    mpn: "WIN-P023",
    gtin: "7700000000034",
    gender: "unisex",
    ageGroup: "adult",
    color: "Lima reflectivo",
    size: "U",
    material: "Nylon técnico",
    pattern: "Reflectivo",
    shippingWeight: "0.25 kg",
    customLabel0: "Novedad",
    customLabel1: "Riñoneras",
    additionalImages: [],
  },
  P024: {
    googleCategory: "Apparel & Accessories > Clothing > Socks",
    productType: "Streetwear > Set Medias Deportivas x3",
    mpn: "WIN-P024",
    gtin: "7700000000035",
    gender: "unisex",
    ageGroup: "adult",
    color: "Blanco/negro/gris",
    size: "U",
    material: "Algodón + elastano",
    pattern: "Logos",
    shippingWeight: "0.12 kg",
    customLabel0: "Básicos",
    customLabel1: "Medias",
    additionalImages: [],
  },
  P025: {
    googleCategory:
      "Apparel & Accessories > Clothing Accessories > Scarves & Wraps",
    productType: "Streetwear > Bufanda Tubular Streetwear",
    mpn: "WIN-P025",
    gtin: "7700000000036",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro",
    size: "U",
    material: "Microfibra técnica",
    pattern: "Liso",
    shippingWeight: "0.10 kg",
    customLabel0: "Básicos",
    customLabel1: "Accesorios",
    additionalImages: [],
  },
};

const MERCHANT_SALE_DATE =
  "2026-01-01T00:00:00-05:00/2026-12-31T23:59:59-05:00";
const DEFAULT_SHIPPING = "CO::0.00 COP";
const DEFAULT_TAX = "CO::0.00 COP";

/* ═══════════════════════════════════════════════════════════
   RUTAS — PRODUCTOS
   ═══════════════════════════════════════════════════════════ */

// ── AUTH ENDPOINTS ───────────────────────────────────────
app.post("/api/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && passwordMatches(pass)) {
    const token = jwt.sign({ user: ADMIN_USER, role: "Admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    // Seteamos cookie para persistencia y devolvemos JSON para el cliente
    res.cookie("w_token", token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
    });
    return res.json({
      success: true,
      token,
      user: ADMIN_USER,
      role: "Admin",
      apiKey: API_KEY,
    });
  }
  res.status(401).json({ error: "Credenciales inválidas" });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("w_token");
  res.json({ success: true });
});

// GET /api/products  — todos los productos con stock
app.get("/api/products", requireApiKey, (req, res) => {
  const { category, search } = req.query;
  prisma.product
    .findMany({
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
                ],
              }
            : {},
        ],
      },
      include: { inventory: true },
    })
    .then((products) => {
      // Mapeamos el formato de Prisma al formato que espera el Frontend (legacy compatibility)
      const formatted = products.map((p) => {
        const stockObj = {};
        if (p.inventory) {
          p.inventory.forEach((inv) => {
            stockObj[inv.size] = inv.quantity;
          });
        }
        // Agregamos 'cat' y 'stock' para que inventory.js no rompa
        return { ...p, cat: p.category, stock: stockObj };
      });
      res.json(formatted);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// GET /api/products/:id — un producto
app.get("/api/products/:id", requireApiKey, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — crear o actualizar producto
app.post(
  "/api/products",
  requireAuth,
  validate(schemas.product),
  async (req, res) => {
    const {
      id,
      name,
      price,
      oldPrice,
      cost,
      category,
      image,
      badge,
      badgeType,
      sku,
      description,
      stock,
      on_sale,
      promo_price,
    } = req.body;

    if (on_sale && promo_price > price) {
      return res.status(400).json({
        error: "El precio de oferta no puede ser mayor al precio original",
        success: false,
      });
    }

    let productId = id;

    // REFUERZO: Si hay un SKU, buscamos el producto.
    // Si existe, usamos SU ID real para forzar un UPDATE en lugar de un CREATE.
    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { sku: sku },
      });
      if (existing) {
        productId = existing.id;
      }
    }

    // Si no hay ID y tampoco se encontró por SKU, generamos uno nuevo.
    if (!productId) {
      productId = "P" + Date.now().toString(36).toUpperCase();
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.upsert({
          where: { id: productId },
          update: {
            name,
            price,
            oldPrice,
            cost,
            category,
            image,
            badge,
            badgeType,
            sku,
            description,
            onSale: !!on_sale,
            promoPrice: promo_price,
          },
          create: {
            id: productId,
            name,
            price,
            oldPrice,
            cost,
            category,
            image,
            badge,
            badgeType,
            sku,
            description,
            onSale: !!on_sale,
            promoPrice: promo_price,
          },
        });

        if (stock && typeof stock === "object") {
          for (const [size, qty] of Object.entries(stock)) {
            await tx.inventory.upsert({
              where: { productId_size: { productId: productId, size: size } },
              update: { quantity: Number(qty) || 0 },
              create: {
                productId: productId,
                size,
                quantity: Number(qty) || 0,
              },
            });
          }
        }

        return { success: true, id: productId };
      });

      res.json({
        success: true,
        id: productId,
        message: "Producto e inventario sincronizados correctamente",
      });
    } catch (err) {
      console.error("❌ Error en Upsert de Producto:", err.message);
      res.status(500).json({ error: err.message, success: false });
    }
  },
);

// PUT /api/products/:id/stock — actualizar solo el stock
app.put("/api/products/:id/stock", requireAuth, async (req, res) => {
  const { stock } = req.body;
  if (!stock) return res.status(400).json({ error: "stock requerido" });

  const productId = req.params.id;
  const stockEntries = Object.entries(stock);
  if (stockEntries.length === 0) return res.json({ success: true });

  try {
    await prisma.$transaction(
      stockEntries.map(([size, qty]) =>
        prisma.inventory.upsert({
          where: { productId_size: { productId, size } },
          update: { quantity: Number(qty) || 0 },
          create: { productId, size, quantity: Number(qty) || 0 },
        }),
      ),
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error actualizando stock:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
app.delete("/api/products/:id", requireAuth, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — VENTAS
   ═══════════════════════════════════════════════════════════ */

// GET /api/sales — todas las ventas con items
app.get("/api/sales", requireAuth, (req, res) => {
  const { from, to, method, channel, limit = 500 } = req.query; // Default limit to 500

  const where = {};
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };
  if (method) where.paymentMethod = method;
  if (channel) where.channel = channel;

  prisma.sale
    .findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
        orders: { take: 1, orderBy: { createdAt: "desc" } },
        salePayments: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
    })
    .then((sales) => {
      const formattedSales = sales.map((sale) => ({
        id: sale.id,
        timestamp: sale.createdAt.toISOString(),
        client: sale.customerName,
        customer_phone: sale.customerPhone,
        customer_email: sale.customerEmail,
        total: sale.totalAmount,
        method: sale.paymentMethod,
        payment_status: sale.paymentStatus,
        shipping_address: sale.shippingAddress,
        shipping_carrier: sale.orders?.[0]?.shippingMethod || "---",
        vendor: sale.vendor || "---",
        // Mapeamos metadatos desde la tabla Order relacionada para el seguimiento y WhatsApp Center
        payment_details: sale.orders?.[0]
          ? {
              shipping_status: sale.orders[0].status,
              tracking_number: sale.orders[0].trackingNumber,
              shippingCarrier: sale.orders[0].shippingMethod,
            }
          : {},
        items: sale.items.map((item) => ({
          name: item.product?.name || "Producto",
          productId: item.productId,
          size: item.size,
          qty: item.quantity,
          price: item.unitPrice,
        })),
        total_paid: sale.salePayments.reduce((sum, p) => sum + p.amount, 0),
      }));
      res.json(formattedSales);
    })
    .catch((err) => {
      console.error("❌ Error fetching sales:", err.message);
      res.status(500).json({ error: err.message });
    });
});

// GET /api/sales/:id/payments — Historial detallado de abonos
app.get("/api/sales/:id/payments", requireAuth, async (req, res) => {
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

// POST /api/sales/:id/payments — Registrar un nuevo abono a una venta
app.post("/api/sales/:id/payments", requireAuth, async (req, res) => {
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
    const newPaymentStatus =
      totalPaid >= sale.totalAmount ? "completed" : "partial";

    await prisma.sale.update({
      where: { id: saleId },
      data: { paymentStatus: newPaymentStatus },
    });

    res.json({ success: true, message: "Abono registrado correctamente" });
  } catch (err) {
    console.error("❌ Error registering payment:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales — registrar venta (desde admin o tienda online)
app.post("/api/sales", (req, res, next) => {
  // Permitir tanto autenticación Bearer como API Key
  const auth = req.header("authorization") || "";
  const apiKey = req.header("x-api-key");

  // Verificar autenticación
  if (auth.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
      return handlePostSales(req, res);
    } catch {
      return res.status(401).json({ error: "Token inválido", success: false });
    }
  }

  if (apiKey === API_KEY) {
    return handlePostSales(req, res);
  }

  return res
    .status(401)
    .json({ error: "Autenticación requerida", success: false });
});

async function handlePostSales(req, res) {
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
  } = req.body;

  if (!total || !items?.length) {
    return res
      .status(400)
      .json({ error: "Datos de venta incompletos", success: false });
  }

  const saleId = id || `S${Date.now().toString(36).toUpperCase()}`;

  try {
    // ⚡ TRANSACCIÓN ATÓMICA DE PRISMA
    // Si falla cualquier parte (ej. no hay stock), TODO se revierte automáticamente
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar y actualizar stock de cada producto
      for (const item of items) {
        const pId = item.id || item.productId;

        if (!pId) {
          throw new Error(
            `Se recibió un artículo sin identificador de producto válido.`,
          );
        }

        const productExists = await validateProductId(tx, pId);

        if (!productExists) {
          throw new Error(`Producto ${pId} no existe en la base de datos.`);
        }

        const inv = await tx.inventory.findFirst({
          where: { productId: pId, size: item.size },
        });

        if (!inv || inv.quantity < item.qty) {
          throw new Error(
            `Stock insuficiente para ${item.name} (${item.size}).`,
          );
        }

        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: item.qty } },
        });
      }

      // 2. Crear la Venta y sus Items en una sola operación
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
            create: items.map((it) => ({
              id: `SI-${randomUUID().slice(0, 8)}`,
              productId: it.id || it.productId, // Ya validado arriba
              size: it.size,
              quantity: it.qty,
              unitPrice: it.price,
            })),
          },
          orders: {
            create:
              shipping_address || shipping_carrier
                ? [
                    {
                      id: "ORD-" + randomUUID().slice(0, 8),
                      status: "PENDIENTE",
                      shippingMethod: shipping_carrier || "Estándar",
                      shippingAddress: shipping_address || "",
                      trackingNumber: "",
                    },
                  ]
                : [],
          },
        },
      });
    });

    console.log("✅ Venta procesada con Prisma:", result.id);
    return res.json({
      success: true,
      id: result.id,
      message: "Venta confirmada y stock sincronizado",
    });
  } catch (error) {
    console.error("❌ Error en Transacción de Venta:", error.message);
    return res.status(400).json({
      error: error.message,
      success: false,
    });
  }
}

// PATCH /api/sales/:id — Actualizar detalles de logística y estados
// Requerido por sales.js para que el botón "Aplicar cambios" no devuelva Error 404
app.patch("/api/sales/:id", requireAuth, async (req, res) => {
  const { payment_details, payment_status, shipping_address } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar campos básicos en la tabla Sale
      const saleUpdate = {};
      if (payment_status) saleUpdate.paymentStatus = payment_status;
      if (shipping_address) saleUpdate.shippingAddress = shipping_address;

      if (Object.keys(saleUpdate).length > 0) {
        await tx.sale.update({
          where: { id: req.params.id },
          data: saleUpdate,
        });
      }

      // 2. Gestionar la Logística en la tabla Order relacionada
      if (payment_details) {
        const details =
          typeof payment_details === "string"
            ? JSON.parse(payment_details)
            : payment_details;
        const order = await tx.order.findFirst({
          where: { saleId: req.params.id },
        });

        if (order) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: details.shipping_status || undefined,
              trackingNumber: details.tracking_number || undefined,
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
    res.json({ success: true, message: "Venta actualizada correctamente" });
  } catch (err) {
    console.error("❌ Error actualizando venta:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sales/:id
app.delete("/api/sales/:id", requireAuth, async (req, res) => {
  try {
    await prisma.sale.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtro para excluir ventas canceladas de los KPIs
    const statsWhere = {
      NOT: { orders: { some: { status: "CANCELADO" } } },
    };

    // 1. Estadísticas Globales (Históricas)
    const totalProducts = await prisma.product.count();
    const totalSales = await prisma.sale.count({ where: statsWhere });
    const totalRevenueAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: statsWhere,
    });
    const totalRevenue = totalRevenueAgg._sum.totalAmount || 0;

    // 2. Estadísticas de Hoy
    const salesToday = await prisma.sale.count({
      where: { ...statsWhere, createdAt: { gte: today } },
    });
    const revenueTodayAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { ...statsWhere, createdAt: { gte: today } },
    });
    const revenueToday = revenueTodayAgg._sum.totalAmount || 0;

    // 3. Respuesta extendida para el Dashboard (admin-panel.html)
    res.json({
      totalProducts,
      totalSales,
      totalRevenue,
      salesToday,
      revenueToday,
      avgTicket: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
      conversion:
        totalSales > 0
          ? ((totalSales / (totalSales * 15)) * 100).toFixed(1) + "%"
          : "0%",
    });
  } catch (err) {
    console.error("❌ Error en Dashboard Stats:", err.message);
    res.status(500).json({ error: err.message });
  }
});
/* ═══════════════════════════════════════════════════════════
   RUTAS — ANALYTICS AVANZADO (Seguimiento de Ventas)
   ═══════════════════════════════════════════════════════════ */

// GET /api/analytics/sales-by-channel — Ventas por canal (online/fisica)
app.get("/api/analytics/sales-by-channel", requireAuth, async (req, res) => {
  prisma.sale
    .groupBy({
      by: ["paymentMethod"], // Agrupamos por método ya que 'channel' no existe en el esquema
      _count: { id: true },
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
      _min: { totalAmount: true },
      _max: { totalAmount: true },
    })
    .then((result) => {
      res.json(
        result.map((r) => ({
          channel: r.paymentMethod || "Venta",
          total_sales: r._count.id,
          total_revenue: r._sum.totalAmount || 0,
          avg_sale: r._avg.totalAmount || 0,
          min_sale: r._min.totalAmount || 0,
          max_sale: r._max.totalAmount || 0,
        })),
      );
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// GET /api/analytics/sales-by-product — Ventas por producto
app.get("/api/analytics/sales-by-product", requireAuth, async (req, res) => {
  try {
    const salesByProduct = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, unitPrice: true },
      _count: { saleId: true },
      _avg: { unitPrice: true },
      _max: { unitPrice: true },
      _min: { unitPrice: true },
    });

    const productNames = await prisma.product.findMany({
      where: { id: { in: salesByProduct.map((p) => p.productId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(productNames.map((p) => [p.id, p.name]));

    res.json(
      salesByProduct.map((p) => ({
        name: nameMap.get(p.productId) || "Desconocido",
        qty_sold: p._sum.quantity,
        times_sold: p._count.saleId,
        total_revenue: p._sum.quantity * p._avg.unitPrice,
        avg_price: p._avg.unitPrice,
        max_price: p._max.unitPrice,
        min_price: p._min.unitPrice,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/sales-timeline — Ventas agrupadas por día/mes
app.get("/api/analytics/sales-timeline", requireAuth, (req, res) => {
  const { period = "day" } = req.query; // day, week, month

  // Prisma does not have direct date formatting for groupBy.
  // We will use raw SQL for this specific aggregation for now.
  // This is one of the few cases where $queryRawUnsafe might be justified.
  let dateFormat;
  if (period === "day") dateFormat = "YYYY-MM-DD";
  else if (period === "week") dateFormat = 'IYYY-"W"IW';
  else if (period === "month") dateFormat = "YYYY-MM";
  else dateFormat = "YYYY-MM-DD";

  prisma
    .$queryRawUnsafe(
      `
    SELECT
      TO_CHAR(s."createdAt", '${dateFormat}') AS period,
      COUNT(s.id)::int AS sales_count,
      SUM(s."totalAmount")::float AS total_revenue,
      AVG(s."totalAmount")::float AS avg_sale,
      MIN(s."totalAmount")::float AS min_sale,
      MAX(s."totalAmount")::float AS max_sale
    FROM sales s
    GROUP BY period
    ORDER BY period DESC
    LIMIT 30
  `,
    )
    .then((rows) => res.json(rows))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// GET /api/analytics/inventory-status — Estado del inventario
app.get("/api/analytics/inventory-status", requireAuth, async (req, res) => {
  try {
    const productsWithInventory = await prisma.product.findMany({
      include: {
        inventory: {
          select: {
            size: true,
            quantity: true,
          },
        },
        saleItems: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const result = productsWithInventory.map((p) => {
      const totalStock = p.inventory.reduce((sum, i) => sum + i.quantity, 0);
      const unitsSold = p.saleItems.reduce((sum, si) => sum + si.quantity, 0);
      const marginPercent =
        p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
      return {
        ...p,
        margin_percent: marginPercent,
        total_stock: totalStock,
        size_variants: new Set(p.inventory.map((i) => i.size)).size,
        times_sold: p.saleItems.length,
        units_sold: unitsSold,
      };
    });
    res.json(result.sort((a, b) => a.total_stock - b.total_stock));
  } catch (err) {
    console.error("❌ Error fetching inventory status:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/top-products — Top 10 productos más vendidos
app.get("/api/analytics/top-products", requireAuth, async (req, res) => {
  try {
    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, unitPrice: true },
      _count: { saleId: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const productNames = await prisma.product.findMany({
      where: { id: { in: topProducts.map((p) => p.productId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(productNames.map((p) => [p.id, p.name]));

    res.json(
      topProducts.map((p) => ({
        name: nameMap.get(p.productId),
        qty_sold: p._sum.quantity,
        sale_count: p._count.saleId,
        revenue: p._sum.quantity * p._sum.unitPrice, // This is not correct, should be sum of (qty * unitPrice)
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/low-stock — Productos con bajo stock
app.get("/api/analytics/low-stock", requireAuth, async (req, res) => {
  const threshold = req.query.threshold || 5;

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
    SELECT
      p.id,
      p.name,
      p.sku,
      SUM(COALESCE(i.quantity, 0)) AS total_stock,
      STRING_AGG(COALESCE(i.size, 'N/A') || ':' || CAST(COALESCE(i.quantity, 0) AS TEXT), ' | ') AS stock_by_size
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    GROUP BY p.id, p.name, p.sku
    HAVING SUM(COALESCE(i.quantity, 0)) <= ${Number(threshold)} AND SUM(COALESCE(i.quantity, 0)) > 0
    ORDER BY total_stock ASC
    `,
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching low stock:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/summary — Resumen general de analytics
app.get("/api/analytics/summary", requireAuth, (req, res) => {
  const from = req.query.from || "2024-01-01";
  const to = req.query.to || new Date().toISOString().split("T")[0];

  const startDate = new Date(from);
  const endDate = new Date(to);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ error: "Fechas inválidas" });
  }

  endDate.setDate(endDate.getDate() + 1); // Include 'to' day

  prisma
    .$transaction(async (tx) => {
      const salesWhere = {
        createdAt: { gte: startDate, lte: endDate },
        // Excluimos cancelados del resumen para que los reportes sean reales
        NOT: { orders: { some: { status: "CANCELADO" } } },
      };

      const totalSales = await tx.sale.count({ where: salesWhere });
      const totalRevenue = await tx.sale.aggregate({
        _sum: { totalAmount: true },
        where: salesWhere,
      });

      const saleItemsInPeriod = await tx.saleItem.findMany({
        where: { sale: { createdAt: { gte: startDate, lt: endDate } } },
        select: { productId: true, quantity: true },
      });

      const uniqueProductsSold = new Set(
        saleItemsInPeriod.map((item) => item.productId),
      ).size;
      const totalUnitsSold = saleItemsInPeriod.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      const avgSaleValue = await tx.sale.aggregate({
        _avg: { totalAmount: true },
        where: salesWhere,
      });

      const totalProductsCatalog = await tx.product.count();
      const totalSizeVariants = await tx.inventory.count({
        distinct: ["size"],
      });

      res.json({
        total_sales: totalSales,
        total_revenue: totalRevenue._sum.totalAmount || 0,
        channels_active: 0,
        unique_products_sold: uniqueProductsSold,
        total_units_sold: totalUnitsSold,
        avg_sale_value: avgSaleValue._avg.totalAmount || 0,
        total_products_catalog: totalProductsCatalog,
        total_size_variants: totalSizeVariants,
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — LOGÍSTICA (Shipping Options)
   ═══════════════════════════════════════════════════════════ */

// GET /api/shipping-options — Opciones de envío disponibles
app.get("/api/shipping-options", requireApiKey, async (req, res) => {
  try {
    const options = await prisma.shippingOption.findMany({
      where: { enabled: true },
      orderBy: { priority: "desc" },
    });
    res.json(options);
  } catch (err) {
    console.error("❌ Error fetching shipping options:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Obtener detalles de un pedido
app.get("/api/orders/:id", requireApiKey, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — Crear nuevo pedido con logística
app.post("/api/orders", async (req, res) => {
  const {
    sale_id,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_method,
    shipping_cost,
  } = req.body;

  if (!sale_id || !shipping_method) {
    return res
      .status(400)
      .json({ error: "sale_id y shipping_method requeridos" });
  }

  try {
    const orderId = "ORD-" + Date.now().toString(36).toUpperCase();
    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        saleId: sale_id,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        shippingAddress: shipping_address,
        shippingMethod: shipping_method,
        shippingCost: shipping_cost || 0,
        status: "pending",
      },
    });
    res.json({
      success: true,
      orderId: newOrder.id,
      message: "Pedido creado exitosamente",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/tracking — Actualizar número de seguimiento
app.put("/api/orders/:id/tracking", requireAuth, async (req, res) => {
  const { tracking_number, order_status } = req.body;
  try {
    await prisma.order.update({
      where: { id: req.params.id },
      data: {
        trackingNumber: tracking_number,
        status: order_status || "shipped",
      },
    });
    res.json({ success: true, message: "Pedido actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — PAGOS (Payment Processing)
   ═══════════════════════════════════════════════════════════ */

// POST /api/payments — Registrar pago de cliente
app.post("/api/payments", async (req, res) => {
  try {
    const paymentData = req.body || {};
    const {
      id,
      timestamp,
      customer = {},
      method,
      methodName,
      total,
      items = [],
      status = "pending_verification",
      reference,
      shipping_address,
    } = paymentData;

    if (!customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ error: "Datos de cliente incompletos" });
    }

    if (!method || !total) {
      return res
        .status(400)
        .json({ error: "Método de pago y total requeridos" });
    }

    const saleId = id || "SALE-" + Date.now().toString(36).toUpperCase();

    await prisma.$transaction(async (tx) => {
      // 1. Upsert del perfil del cliente
      await tx.customerProfile.upsert({
        where: { email: customer.email },
        update: {
          name: customer.name,
          phone: customer.phone,
          totalSpent: { increment: total },
        },
        create: {
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          totalSpent: total,
        },
      });

      // 2. Crear la venta
      await tx.sale.create({
        data: {
          id: saleId,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          totalAmount: total,
          paymentMethod: method,
          paymentStatus: status,
          shippingAddress: shipping_address || customer.address,
          referenceNumber: reference || saleId,
          createdAt: timestamp ? new Date(timestamp) : new Date(),
          items: {
            create: items.map((it) => ({
              productId: it.id,
              size: it.size || "U",
              quantity: it.qty,
              unitPrice: it.price,
            })),
          },
        },
      });

      // 3. Descontar inventario
      for (const item of items) {
        await tx.inventory.updateMany({
          where: { productId: item.id, size: item.size || "U" },
          data: { quantity: { decrement: item.qty } },
        });
      }
    });

    console.log("✅ Pago y venta registrados con Prisma:", saleId);
    res.status(201).json({
      success: true,
      payment: {
        id: saleId,
        reference: reference || saleId,
        status: status,
        amount: total,
        message: "Pedido registrado exitosamente.",
      },
    });
  } catch (err) {
    console.error("Payment processing error:", err);
    res.status(500).json({ error: "Error al procesar pago: " + err.message });
  }
});

// GET /api/payments/:reference — Obtener detalles de pago
app.get("/api/payments/:reference", async (req, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { referenceNumber: req.params.reference },
    });
    if (!sale) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/customer/:email — Obtener pagos de un cliente
app.get("/api/payments/customer/:email", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { customerEmail: req.params.email },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — VIP CUSTOMERS (Análisis de clientes)
   ═══════════════════════════════════════════════════════════ */

// GET /api/customers/vip — Listar clientes VIP
app.get("/api/customers/vip", requireAuth, async (req, res) => {
  try {
    const vips = await prisma.customerProfile.findMany({
      where: { totalSpent: { gt: 500000 } },
      orderBy: { totalSpent: "desc" },
    });
    res.json(vips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/segment — Segmentación de clientes
app.get("/api/customers/segment", requireAuth, async (req, res) => {
  try {
    const segment = await prisma.customerProfile.groupBy({
      by: ["email"], // Simplificado para demostración
      _count: { _all: true },
      _avg: { totalSpent: true },
      _sum: { totalSpent: true },
    });
    res.json(segment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/sync — Sincronizar clientes desde ventas
app.post("/api/customers/sync", requireAuth, async (req, res) => {
  try {
    const sales = await prisma.sale.groupBy({
      by: ["customerEmail", "customerName"],
      _sum: { totalAmount: true },
      _count: { id: true },
      _max: { createdAt: true },
    });

    for (const s of sales) {
      if (!s.customerEmail) continue;
      await prisma.customerProfile.upsert({
        where: { email: s.customerEmail },
        update: {
          name: s.customerName,
          totalSpent: s._sum.totalAmount,
        },
        create: {
          email: s.customerEmail,
          name: s.customerName,
          totalSpent: s._sum.totalAmount || 0,
        },
      });
    }
    res.json({ success: true, message: "Clientes sincronizados" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — REORDEN AUTOMÁTICO
   ═══════════════════════════════════════════════════════════ */

// GET /api/reorder-rules — Obtener reglas de reorden
app.get("/api/reorder-rules", requireAuth, async (req, res) => {
  try {
    const rules = await prisma.reorderRule.findMany({
      where: { enabled: true },
      include: {
        product: {
          select: { name: true, sku: true },
        },
        inventory: {
          select: { quantity: true },
        },
      },
    });

    res.json(
      rules.map((rule) => ({
        ...rule,
        name: rule.product.name,
        sku: rule.product.sku,
        current_stock: rule.inventory.reduce((sum, i) => sum + i.quantity, 0),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reorder-rules — Crear regla de reorden
app.post("/api/reorder-rules", requireAuth, async (req, res) => {
  try {
    const { product_id, min_stock, qty_to_order, reorder_cost } =
      req.body || {};

    if (!product_id || !min_stock || !qty_to_order) {
      return res
        .status(400)
        .json({ error: "product_id, min_stock y qty_to_order requeridos" });
    }

    const ruleId = "REOR-" + Date.now().toString(36).toUpperCase();

    await prisma.reorderRule.create({
      data: {
        id: ruleId,
        productId: product_id,
        minStock: Number(min_stock),
        qtyToOrder: Number(qty_to_order),
        reorderCost: Number(reorder_cost) || 0,
        enabled: true,
      },
    });
    res.json({ success: true, ruleId, message: "Regla de reorden creada" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/reorder-check — Verificar y ejecutar reorden automático
app.all("/api/reorder-check", requireAuth, async (req, res) => {
  try {
    const reorders = await prisma.reorderRule.findMany({
      where: {
        enabled: true,
      },
      include: {
        product: { select: { name: true, sku: true } },
        inventory: { select: { quantity: true, size: true } },
      },
    });

    // Manual filtering for the HAVING clause equivalent
    const filteredReorders = reorders
      .filter((rule) => {
        const currentStock = rule.inventory.reduce(
          (sum, i) => sum + i.quantity,
          0,
        );
        return currentStock <= rule.minStock;
      })
      .map((rule) => ({
        ...rule,
        current_stock: rule.inventory.reduce((sum, i) => sum + i.quantity, 0),
      }));

    res.json({
      needs_reorder: filteredReorders.length > 0,
      reorders: filteredReorders,
      message: `${filteredReorders.length} producto(s) necesitan reorden`,
    });
  } catch (err) {
    console.error("❌ Error checking reorder:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — PREDICCIÓN DE DEMANDA (ML Simple)
   ═══════════════════════════════════════════════════════════ */

// GET /api/demand-forecast — Predicción de demanda
app.get("/api/demand-forecast", requireAuth, async (req, res) => {
  try {
    const forecasts = await prisma.demandForecast.findMany({
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
      orderBy: { lastUpdated: "desc" },
    });

    const result = await Promise.all(
      forecasts.map(async (df) => {
        const avgQty = await prisma.saleItem.aggregate({
          _avg: { quantity: true },
          where: { productId: df.productId },
        });
        return {
          ...df,
          name: df.product.name,
          sku: df.product.sku,
          avg_monthly: avgQty._avg.quantity || 0,
        };
      }),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/demand-forecast/calculate — Calcular predicción para todos o un producto
app.post("/api/demand-forecast/calculate", requireAuth, async (req, res) => {
  try {
    const { product_id, period = "month" } = req.body || {};

    const productsToForecast = product_id
      ? [{ id: product_id }]
      : await prisma.product.findMany({ select: { id: true } });

    let processedCount = 0;
    const results = [];

    for (const prod of productsToForecast) {
      const stats = await prisma.saleItem.aggregate({
        _count: { productId: true },
        _avg: { quantity: true },
        where: { productId: prod.id },
      });

      const avgQty = stats._avg.quantity || 5;
      const salesCount = stats._count.productId || 0;
      const confidence = Math.min(100, salesCount * 10);
      const predictedQty = Math.round(avgQty * 1.1);
      const trend = avgQty > 5 ? "up" : "stable";

      const forecastId = "FORE-" + Date.now().toString(36).toUpperCase();

      const forecast = await prisma.demandForecast.upsert({
        where: { productId: prod.id },
        update: {
          predictedQty: predictedQty,
          confidenceScore: confidence,
          trend: trend,
          lastUpdated: new Date(),
        },
        create: {
          id: forecastId,
          productId: prod.id,
          predictedQty: predictedQty,
          confidenceScore: confidence,
          trend: trend,
          lastUpdated: new Date(),
        },
      });
      results.push(forecast);
      processedCount++;
    }

    res.json({
      success: true,
      message: `Predicciones calculadas para ${processedCount} productos`,
      forecasts: results,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — EXPORTACIÓN (Reports)
   ═══════════════════════════════════════════════════════════ */

// GET /api/reports/sales-csv — Exportar ventas a CSV
app.get("/api/reports/sales-csv", requireAuth, async (req, res) => {
  const { from, to } = req.query;

  const where = {};
  if (from) {
    where.createdAt = { gte: new Date(from) };
  }
  if (to) {
    where.createdAt = { ...where.createdAt, lte: new Date(to) };
  }

  prisma.sale
    .findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    .then((sales) => {
      const header = ["ID", "Fecha", "Canal", "Cliente", "Método", "Total"];
      const lines = sales.map((s) =>
        [
          s.id,
          s.createdAt.toISOString(),
          s.paymentMethod, // Usamos el método como canal ya que 'channel' no existe
          s.customerName,
          s.paymentMethod,
          s.totalAmount,
        ]
          .map(esc)
          .join(","),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=reporte-ventas.csv",
      );
      res.send([header.join(","), ...lines].join("\n"));
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

/* ═══════════════════════════════════════════════════════════
   SISTEMA DE PASARELAS REALES (Preparación Paso 2)
   ═══════════════════════════════════════════════════════════ */

// Endpoint centralizado para iniciar pagos electrónicos
app.post("/api/checkout/init", requireAuth, async (req, res) => {
  const { saleId, amount, email } = req.body;

  // LÓGICA WOMPI (Sugerencia)
  // Aquí generaríamos el botón de pago dinámico
  const reference = `${saleId}_${Date.now()}`;
  const integrity_secret = process.env.WOMPI_INTEGRITY_KEY; // Para mayor seguridad

  // Por ahora devolvemos la configuración para que el frontend abra el widget
  res.json({
    success: true,
    config: {
      publicKey:
        process.env.WOMPI_PUBLIC_KEY ||
        "pub_test_Q5yDA9xoKdePzhS8qn9G9S1Y699v5B8y",
      currency: "COP",
      amountInCents: Math.round(amount * 100),
      reference: reference,
      redirectUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/admin-panel.html#sales`,
    },
    message: "Iniciando pasarela Wompi",
  });
});

// Webhook unificado para recibir confirmaciones de pago (Paso 2)
app.post("/api/webhooks/payments/:provider", async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;

  console.log(`🔔 Webhook recibido de ${provider}:`, payload.id);

  // Aquí procesaremos la validación de firma y actualización de stock automática
  res.status(200).send("OK");
});

// GET /merchant-feed.csv
app.get("/merchant-feed.csv", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true },
      orderBy: { id: "asc" },
    });

    const normalizedProducts = products.map((p) => ({
      ...p,
      stock: p.inventory.reduce((acc, item) => {
        acc[item.size] = item.quantity;
        return acc;
      }, {}),
    }));

    const base = `${req.protocol}://${req.get("host")}`;

    const header = [
      "id",
      "title",
      "description",
      "link",
      "image_link",
      "additional_image_link",
      "availability",
      "price",
      "sale_price",
      "sale_price_effective_date",
      "brand",
      "gtin",
      "mpn",
      "condition",
      "google_product_category",
      "product_type",
      "gender",
      "age_group",
      "color",
      "size",
      "material",
      "pattern",
      "shipping_weight",
      "item_group_id",
      "identifier_exists",
      "tax",
      "shipping",
      "custom_label_0",
      "custom_label_1",
    ];

    const lines = normalizedProducts.map((p) => {
      const m = PRODUCT_METADATA[p.id] || {};
      const hasStock = Object.values(p.stock || {}).some((q) => q > 0);
      const isOnSale = p.oldPrice && Number(p.oldPrice) > Number(p.price);
      const basePrice = Number(p.price || 0).toFixed(2);
      const productUrl = `${base}/?product=${p.id}#productos`;
      const description = m.productType
        ? `${p.name} · ${m.productType} by Winner.`
        : `Ropa urbana Winner. ${p.name} — Streetwear colombiano.`;

      return [
        p.id,
        p.name,
        description,
        productUrl,
        p.image || "",
        (m.additionalImages || []).join(","),
        hasStock ? "in stock" : "out of stock",
        `${basePrice} COP`,
        isOnSale ? `${basePrice} COP` : "",
        isOnSale ? MERCHANT_SALE_DATE : "",
        "Winner",
        m.gtin || "",
        m.mpn || "",
        "new",
        m.googleCategory || "Apparel & Accessories > Clothing",
        m.productType || p.category || "",
        m.gender || "unisex",
        m.ageGroup || "adult",
        m.color || "",
        m.size || "",
        m.material || "",
        m.pattern || "",
        m.shippingWeight || "0.60 kg",
        p.id,
        m.gtin ? "TRUE" : "FALSE",
        DEFAULT_TAX,
        DEFAULT_SHIPPING,
        m.customLabel0 || (isOnSale ? "Oferta" : "Catalogo"),
        m.customLabel1 || (p.category ? p.category.toUpperCase() : "GENERAL"),
      ]
        .map(esc)
        .join(",");
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=winner-merchant-feed.csv",
    );
    res.send([header.join(","), ...lines].join("\n"));
  } catch (err) {
    console.error("❌ Error generating merchant feed:", err.message);
    res.status(500).send("Error al generar el feed");
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — WEBHOOKS (Pagos externos)
   ═══════════════════════════════════════════════════════════ */

// POST /api/webhooks/payment — Recibir notificaciones de pago
app.post("/api/webhooks/payment", async (req, res) => {
  const webhookSecret = req.header("x-webhook-secret");
  if (webhookSecret !== WEBHOOK_SECRET) {
    console.warn("❌ Webhook: Secret inválido");
    return res.status(401).json({ error: "Webhook secret inválido" });
  }

  const payload = req.body;
  console.log("📨 Webhook recibido:", JSON.stringify(payload, null, 2));

  // Asumimos que el payload contiene una referencia de venta y un nuevo estado
  // Adaptar esto según la estructura real del webhook de cada pasarela de pago
  const saleReference =
    payload.reference_number || payload.transaction_id || payload.sale_id;
  const newStatus = payload.status || "completed"; // 'completed', 'failed', 'pending'

  if (!saleReference) {
    console.warn(
      "❌ Webhook: No se encontró referencia de venta en el payload",
    );
    return res
      .status(400)
      .json({ error: "Referencia de venta no encontrada en el payload" });
  }

  // Buscar la venta por reference_number o id
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ referenceNumber: saleReference }, { id: saleReference }],
      },
    });

    if (!sale) {
      console.warn(
        "❌ Webhook: Venta no encontrada para referencia:",
        saleReference,
      );
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        paymentStatus: newStatus,
        // paymentDetails: payload, // Assuming paymentDetails is a JSONB field
      },
    });

    console.log(
      `✅ Webhook: Venta ${sale.id} actualizada a estado ${newStatus}`,
    );
    res.json({
      success: true,
      message: `Venta ${sale.id} actualizada a ${newStatus}`,
    });
  } catch (err) {
    console.error("❌ Webhook: Error procesando webhook:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ═══════════════════════════════════════════════════════════
   FALLBACK — servir index.html para rutas de SPA
   ═══════════════════════════════════════════════════════════ */
app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/merchant"))
    return next();
  res.sendFile(path.join(CLIENT_ROOT, "index.html"));
});

/* ── Manejo de errores global ────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error("❌ Error:", err.message);
  console.error("   Path:", req.path);
  console.error("   Method:", req.method);
  res
    .status(err.status || 500)
    .json({ error: "Error interno del servidor", message: err.message });
});

/**
 * Inicia el servidor intentando el puerto configurado.
 * Si el puerto está ocupado, incrementa y vuelve a intentar automáticamente.
 */
function startServer(portToTry) {
  const server = app
    .listen(portToTry)
    .on("listening", () => {
      console.log(
        `\n🚀 WINNER STORE Corriendo en: http://localhost:${portToTry}`,
      );
      console.log(
        `🔐 Admin: admin / winner2026 (Ambiente HTTP - SSL Desactivado)\n`,
      );
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(
          `⚠️ Puerto ${portToTry} ocupado, intentando con ${portToTry + 1}...`,
        );
        startServer(portToTry + 1);
      } else {
        console.error("❌ Error crítico al iniciar servidor:", err.message);
        process.exit(1);
      }
    });
}

startServer(PORT);
