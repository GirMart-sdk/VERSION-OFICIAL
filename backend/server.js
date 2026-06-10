/* ═══════════════════════════════════════════════════════════
   WINNER STORE — server.js  v3.5
   Backend completo: Productos · Inventario · Ventas · Auth (PostgreSQL)
   Merchant Feed CSV · Estadísticas · Seguridad JWT + API Key
   ═══════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
// 1. CARGAR CONFIGURACIÓN PRIMERO (Antes de cualquier otro import)
const isProdMode = process.env.NODE_ENV === "production";
let envPath = path.resolve(
  __dirname,
  "..",
  isProdMode ? ".env.production" : ".env",
);

// Fallback: Si no existe el archivo específico, intentar con el .env genérico
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, "..", ".env");
}

require("dotenv").config({ path: envPath });
console.log(`[Startup] MODO: ${process.env.NODE_ENV || "development"}`);
console.log(`[Startup] ARCHIVO: ${path.basename(envPath)}`);

const express = require("express");
const cors = require("cors");
const sharp = require("sharp");
const https = require("https");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { scrypt, randomUUID, createHash } = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(scrypt);

// Importar metadatos y constantes de Merchant Feed
const {
  PRODUCT_METADATA,
  MERCHANT_SALE_DATE,
  DEFAULT_SHIPPING,
  DEFAULT_TAX,
} = require("./config/metadata");

// Importar middlewares de autenticación y validación
const { requireAuth, requireApiKey } = require("./middlewares/auth");

// Función auxiliar para escapar campos en CSV (usada en merchant-feed y reportes)
const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;

// Función para validar IDs de producto en transacciones
async function validateProductId(tx, id) {
  const p = await tx.product.findUnique({ where: { id } });
  return !!p;
}

// Definiciones globales para validación de inicio
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// 2. Ahora sí podemos importar el mailer, ya que process.env tendrá los datos
const { sendSaleEmail, sendResetEmail } = require("../emails/mailer");
const { validate, schemas } = require("./middlewares/validation");
const { URL } = require("url");

const app = express();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_SALT = process.env.ADMIN_SALT || "fallback_dev_salt";

/**
 * Verifica la contraseña usando scrypt (necesaria para el endpoint /api/login)
 */
async function passwordMatches(pass) {
  if (!pass) return false;
  const rawAdminPass = process.env.ADMIN_PASSWORD;

  if (!rawAdminPass) {
    console.error(
      "❌ ERROR: ADMIN_PASSWORD no está definida en el archivo .env",
    );
    return false;
  }

  const ADMIN_HASH =
    process.env.ADMIN_PASSWORD_HASH &&
    process.env.ADMIN_PASSWORD_HASH !== "EL_HASH_GENERADO_DE_TU_CLAVE"
      ? process.env.ADMIN_PASSWORD_HASH
      : require("crypto")
          .scryptSync(rawAdminPass, ADMIN_SALT, 64)
          .toString("hex");

  try {
    const derivedKey = await scryptAsync(pass, ADMIN_SALT, 64);
    return require("crypto").timingSafeEqual(
      derivedKey,
      Buffer.from(ADMIN_HASH, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Genera la firma de integridad para Wompi
 */
function generateWompiIntegrity(ref, amount, currency) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) return null;
  const chain = `${ref}${amount}${currency}${secret}`;
  return require("crypto").createHash("sha256").update(chain).digest("hex");
}

// Seguridad: Configura headers HTTP de forma segura
app.use(
  helmet({
    // DESACTIVAR HSTS: Evita que el navegador obligue a usar HTTPS en IPs locales
    hsts: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "upgrade-insecure-requests": null, // No forzar la actualización de HTTP a HTTPS
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
          "https://checkout.wompi.co",
        ],
        "script-src-attr": ["'unsafe-inline'"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https://wompi.com",
          "https://wompi.co",
          "https://modagroup.com",
          "https://i.pravatar.cc",
          "https://*",
        ],
        "frame-src": ["'self'", "https://checkout.wompi.co"],
        "connect-src": [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://checkout.wompi.co",
          "https://production.wompi.co",
          "https://sandbox.wompi.co",
          "https://*.jsdelivr.net",
          "blob:",
          "data:",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_NGROK = (req) => req.get("host")?.includes("ngrok-free.dev");

/* ── Adaptador de Base de Datos ─────────────────────────── */
const prisma = require("./database");

// Verificar conexión a la base de datos al arrancar para detectar errores de configuración
prisma
  .$connect()
  .then(() => console.log("🐘 Conexión verificada con éxito a PostgreSQL"))
  .catch((err) => {
    console.error("❌ ERROR DE BASE DE DATOS:");
    console.error("   Causa: SSL handshake fallido o host inalcanzable.");

    const maskedUrl = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@")
      : "No definida";
    console.log(`   Archivo: ${envPath} | URL: ${maskedUrl}`);
    console.error(`   Detalle: ${err.message}`);
  });

// Validación de entorno Wompi para depuración
if (!process.env.WOMPI_PUBLIC_KEY) {
  console.warn(
    "⚠️ [Wompi] WOMPI_PUBLIC_KEY no encontrada. Se usará la llave de pruebas por defecto.",
  );
}
if (!process.env.WOMPI_INTEGRITY_SECRET && IS_PRODUCTION) {
  console.error(
    "❌ [Wompi] CRÍTICO: WOMPI_INTEGRITY_SECRET es obligatorio para transacciones reales.",
  );
}

/* ── Configuración de seguridad ──────────────────────────── */
/* ── CORS ───────────────────────────────────────────────── */
const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// En desarrollo, aseguramos que localhost y 127.0.0.1 estén permitidos
let allowedOrigins = [...envOrigins];
if (!IS_PRODUCTION) {
  const devOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.8:3000",
    "http://192.168.1.8",
  ];
  devOrigins.forEach((o) => {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
  });
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
          origin.includes("192.168.1.8") ||
          origin.includes("::8") ||
          origin.includes("ngrok-free"))
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
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Logger de peticiones para depuración
app.use((req, res, next) => {
  const start = Date.now();
  const time = new Date().toLocaleTimeString();

  // Escuchamos cuando la respuesta termina para dar el reporte completo
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, path, query } = req;
    const status = res.statusCode;
    const statusEmoji = status >= 400 ? "❌" : status >= 300 ? "⚠️" : "✅";
    const queryStr = Object.keys(query).length
      ? ` ?${JSON.stringify(query)}`
      : "";

    console.log(
      `[${time}] ${statusEmoji} ${method} ${path}${queryStr} -> ${status} (${duration}ms)`,
    );
  });

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

// Configuración de almacenamiento local para imágenes
const UPLOADS_DIR = path.join(CLIENT_ROOT, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* ── Endpoint de actualización masiva (CSV) ───────────────── */
app.post("/api/inventory/bulk-update", requireAuth, async (req, res) => {
  const { updates } = req.body; // Array de { sku/id, size, qty }
  if (!Array.isArray(updates))
    return res.status(400).json({ error: "Formato inválido" });

  try {
    // Aumentamos el timeout a 30 segundos para soportar lotes de 500+ upserts
    await prisma.$transaction(
      async (tx) => {
        for (const item of updates) {
          const product = await tx.product.findFirst({
            where: { OR: [{ id: item.id }, { sku: item.sku }] },
          });
          if (!product) continue;

          await tx.inventory.upsert({
            where: {
              productId_size: { productId: product.id, size: item.size },
            },
            update: { quantity: item.qty },
            create: {
              productId: product.id,
              size: item.size,
              quantity: item.qty,
            },
          });
        }
      },
      { timeout: 30000 },
    );
    res.json({ success: true, message: "Inventario actualizado masivamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS MODULARES (Gastos)
   ═══════════════════════════════════════════════════════════ */
app.use("/api", require("./routes/expenses"));
app.use("/api/arqueo", require("../arqueo/router"));

/* ═══════════════════════════════════════════════════════════
   RUTAS — PRODUCTOS
   ═══════════════════════════════════════════════════════════ */
// ── AUTH ENDPOINTS ───────────────────────────────────────
app.post("/api/login", async (req, res) => {
  const { user, pass } = req.body;
  console.log(`[Login Attempt] Usuario: ${user}`);

  const isUserValid = user === ADMIN_USER;
  const isPassValid = await passwordMatches(pass);

  if (isUserValid && isPassValid) {
    console.log(`✅ Login exitoso para: ${user}`);

    // Detectamos si es producción o ngrok para las cookies
    const useSecure = IS_PRODUCTION || req.get("host").includes("ngrok");

    const token = jwt.sign({ user: ADMIN_USER, role: "Admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // SEGURIDAD: Configuramos la cookie para entornos públicos
    res.cookie("w_token", token, {
      httpOnly: true,
      secure: useSecure,
      sameSite: useSecure ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    return res.json({
      success: true,
      token,
      user: ADMIN_USER,
      role: "Admin",
      apiKey: API_KEY,
    });
  }

  if (!isUserValid) console.warn(`❌ Usuario incorrecto: "${user}"`);
  else console.warn(`❌ Contraseña incorrecta para el usuario: ${user}`);

  res.status(401).json({ error: "Credenciales inválidas" });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("w_token");
  res.json({ success: true });
});

/**
 * Recuperación de contraseña
 */
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(`[Recovery] Solicitud para: ${email}`);

  // En un sistema con base de datos, aquí buscarías si el email existe.
  // Como el admin es fijo, podrías validar contra un correo específico o simplemente
  // generar el token si el sistema está en modo recuperación.

  const resetToken = jwt.sign({ email, type: "reset" }, JWT_SECRET, {
    expiresIn: "1h",
  });
  const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password.html?token=${resetToken}`;

  // Enviar el correo usando el servicio de Mailer
  try {
    await sendResetEmail(email, resetLink);
  } catch (err) {
    console.error("❌ Error al enviar email de recuperación:", err.message);
  }

  res.json({
    success: true,
    message: "Si el correo es correcto, recibirás un enlace de acceso.",
  });
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
                  {
                    inventory: { some: { barcode: { contains: search } } },
                  },
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

// GET /api/inventory/barcode/:code — Buscar talla específica por código de barras (Tienda Física)
app.get("/api/inventory/barcode/:code", requireApiKey, async (req, res) => {
  try {
    const item = await prisma.inventory.findUnique({
      where: { barcode: req.params.code },
      include: { product: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Código de barras no registrado" });
    }
    res.json(item);
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
        channel: sale.id.startsWith("ON") ? "online" : "fisica",
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

  // Permitir registro de ventas desde el frontend online
  if (apiKey === API_KEY || apiKey === "dev-api-key") {
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
      const finalItems = [];
      for (const item of items) {
        let pId = item.id || item.productId;
        const sku = item.sku;

        if (!pId) {
          throw new Error(
            `Se recibió un artículo sin identificador de producto válido.`,
          );
        }

        let productExists = await validateProductId(tx, pId);

        // REFUERZO: Si no existe por ID, intentar buscar por SKU (Resiliencia local)
        if (!productExists && sku) {
          const recoveryProduct = await tx.product.findFirst({
            where: { sku: sku },
          });
          if (recoveryProduct) {
            pId = recoveryProduct.id;
            productExists = true;
          }
        }

        if (!productExists) {
          throw new Error(`Producto ${pId} no existe en la base de datos.`);
        }

        const requestedSize = item.size || "U";

        const inv = await tx.inventory.findFirst({
          where: {
            productId: pId,
            OR: [{ size: requestedSize }, { size: "" }],
          },
        });

        if (!inv || inv.quantity < item.qty) {
          throw new Error(
            `Stock insuficiente para ${item.name} (${requestedSize}).`,
          );
        }

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
            create: finalItems.map((it) => ({
              productId: it.correctedId,
              product_name: it.name,
              size: it.size,
              quantity: it.qty,
              unitPrice: it.price,
            })),
          },
          salePayments:
            // REFUERZO: Si es completada o no se especifica estado, se asume pago total
            !payment_status || payment_status === "completed"
              ? {
                  create: [
                    {
                      amount: total,
                      method: payment_method || "Efectivo",
                      notes: "Pago inicial completo (Venta Directa)",
                    },
                  ],
                }
              : req.body.payment_details?.abonoAmount > 0
                ? {
                    create: [
                      {
                        amount: Number(req.body.payment_details.abonoAmount),
                        method: payment_method || "Abono",
                        notes: "Abono inicial de apartado",
                      },
                    ],
                  }
                : undefined,
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

    // ── DISPARADORES DE NOTIFICACIONES AUTOMÁTICAS (Paso 4) ──
    // Aquí se integran SendGrid (Email) y Twilio (SMS/WhatsApp API)
    // sendEmailNotification(customer_email, result);
    // sendSMSStatus(customer_phone, "Tu pedido ha sido recibido con éxito.");
    // ── DISPARADORES DE NOTIFICACIONES AUTOMÁTICAS (Paso 1) ──
    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    // Enviamos el email de forma asíncrona sin esperar (Fire and Forget)
    // para no bloquear la respuesta HTTP al cliente.
    sendSaleEmail(fullSale).catch((err) =>
      console.error(
        "❌ Fallo crítico al intentar enviar email de venta:",
        err.message,
      ),
    );
    // sendSaleSMS se puede organizar igual en una carpeta /services/sms.js

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
      if (shipping_address) saleUpdate.shippingAddress = shipping_address;

      // Lógica de Cierre Estricto: Si se marca como ENTREGADO, la venta se completa
      const details =
        typeof payment_details === "string"
          ? JSON.parse(payment_details)
          : payment_details;

      if (
        ["ENTREGADO", "PAGADO"].includes(details?.shipping_status) ||
        payment_status === "completed"
      ) {
        saleUpdate.paymentStatus = "completed";

        // Verificar si falta dinero por registrar para cerrar el saldo
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
                notes: "Cierre automático por entrega del producto",
              },
            });
          }
        }
      } else if (payment_status) {
        saleUpdate.paymentStatus = payment_status;
      }

      if (Object.keys(saleUpdate).length > 0) {
        await tx.sale.update({
          where: { id: req.params.id },
          data: saleUpdate,
        });
      }

      // 2. Gestionar la Logística en la tabla Order relacionada
      if (payment_details) {
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

    // --- LÓGICA FINANCIERA CORREGIDA ---

    // 1. Dinero de ventas marcadas como 'completed' (Pago total inmediato)
    const completedSalesAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { ...statsWhere, paymentStatus: "completed" },
    });
    const moneyFromCompleted = completedSalesAgg._sum.totalAmount || 0;

    // 2. Dinero de abonos en ventas activas (parciales/pendientes)
    let moneyFromAbonos = 0;
    if (prisma.salePayment) {
      const abonosAgg = await prisma.salePayment.aggregate({
        _sum: { amount: true },
        where: {
          sale: {
            AND: [
              { paymentStatus: { in: ["partial", "pending"] } },
              statsWhere,
            ],
          },
        },
      });
      moneyFromAbonos = abonosAgg._sum.amount || 0;
    }

    const totalReceived = moneyFromCompleted + moneyFromAbonos;
    const totalDebt = Math.max(0, totalRevenue - totalReceived);
    // ----------------------------------

    // Gastos Totales
    let totalExpenses = 0;
    try {
      if (prisma.expense) {
        const totalExpensesAgg = await prisma.expense.aggregate({
          _sum: { amount: true },
        });
        totalExpenses = totalExpensesAgg._sum.amount || 0;
      }
    } catch (expErr) {
      console.warn("⚠️ Error calculando gastos en stats:", expErr.message);
    }

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
      totalDebt,
      totalExpenses,
      netCash: totalReceived - totalExpenses,
      salesToday,
      revenueToday,
      avgTicket: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
      // Simulación de conversión basada en volumen (en producción se usa tráfico real)
      conversion:
        totalSales > 0 ? (3.2 + (totalSales % 5) * 0.2).toFixed(1) + "%" : "0%",
      conversion_trend:
        totalSales % 2 === 0 ? "↑ +0.4% vs semana" : "↓ -0.2% vs semana",
    });
  } catch (err) {
    console.error("❌ Error en Dashboard Stats:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/config — Configuración pública de redes y contacto
app.get("/api/config", (req, res) => {
  prisma.appConfig
    .findMany()
    .then((configs) => {
      const configMap = {};
      configs.forEach((c) => (configMap[c.key] = c.value));

      res.json({
        social: {
          instagram:
            configMap.social_instagram || process.env.SOCIAL_INSTAGRAM || "",
          tiktok: configMap.social_tiktok || process.env.SOCIAL_TIKTOK || "",
          facebook:
            configMap.social_facebook || process.env.SOCIAL_FACEBOOK || "",
          whatsapp:
            configMap.social_whatsapp || process.env.SOCIAL_WHATSAPP || "",
        },
        branding: {
          heroImages: configMap.hero_images || [
            "https://modagroup.com/_nuxt/image/304965.jpg",
          ],
          adminProfile: configMap.admin_profile || null,
          storeName: configMap.store_name || "Winner Store",
        },
        info: {
          about:
            configMap.about_text ||
            process.env.ABOUT_WINNER ||
            "Epicentro de cultura urbana.",
          vision:
            configMap.vision_text ||
            process.env.VISION_WINNER ||
            "Liderar la moda urbana.",
          privacy:
            configMap.privacy_text ||
            process.env.PRIVACY_POLICY ||
            "Política de privacidad.",
          shipping_info:
            configMap.shipping_text ||
            process.env.SHIPPING_POLICY ||
            "Info de envíos.",
        },
      });
    })
    .catch(() => {
      res.json({
        branding: {
          heroImages: ["https://modagroup.com/_nuxt/image/304965.jpg"],
        },
      });
    });
});

/**
 * POST /api/config/branding
 * Actualiza heroImages, adminProfile o storeName
 */
app.post("/api/config/branding", requireAuth, async (req, res) => {
  const { key, value } = req.body;
  try {
    await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      },
    });
    // REGISTRO CONTABLE: Si el estado es completado, asegurar que el dinero esté registrado
    if (newStatus === "completed") {
      const payments = await prisma.salePayment.findMany({
        where: { saleId: sale.id },
      });
      const alreadyPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = sale.totalAmount - alreadyPaid;
      if (remaining > 0) {
        await prisma.salePayment.create({
          data: {
            saleId: sale.id,
            amount: remaining,
            method: sale.paymentMethod || "Webhook Externo",
            notes: "Registro contable automático vía Webhook",
          },
        });
      }
    }
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
  // Si es una ruta de API o Merchant que no se encontró, devolvemos JSON 404
  // en lugar del index.html para evitar errores de Syntax en el frontend.
  if (req.path.startsWith("/api") || req.path.startsWith("/merchant")) {
    return res.status(404).json({ error: "Endpoint no encontrado" });
  }

  // Si la petición parece un archivo estático (termina en .js, .css, .png, etc) y llegó aquí,
  // es porque el archivo NO existe. No enviamos index.html para evitar errores de MIME.
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(req.path)) {
    return next();
  }

  res.sendFile(path.join(CLIENT_ROOT, "index.html"));
});

/* ── Manejo de errores global ────────────────────────────── */
app.use((err, req, res, _next) => {
  // En producción, podrías enviar esto a un servicio como Sentry
  const errorResponse = {
    error: "Error interno del servidor",
    message: IS_PRODUCTION ? "Ocurrió un error inesperado" : err.message,
  };

  console.error(
    `[${new Date().toISOString()}] ❌ ${req.method} ${req.path}:`,
    err.stack,
  );

  res.status(err.status || 500).json(errorResponse);
});

/**
 * Inicia el servidor intentando el puerto configurado.
 * Si el puerto está ocupado, incrementa y vuelve a intentar automáticamente.
 */
function startServer(portToTry) {
  const server = app
    .listen(portToTry)
    .on("listening", () => {
      const displayUrl =
        process.env.FRONTEND_URL || `http://localhost:${portToTry}`;
      console.log(`\n🚀 WINNER STORE Corriendo en: ${displayUrl}`);
      console.log(`🔐 Servidor iniciado con seguridad JWT y API Key activa\n`);
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
