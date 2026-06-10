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
const getStructuredUploadPath = () => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const targetDir = path.join(CLIENT_ROOT, "uploads", year, month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

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

/* ── MONTADO DE RUTAS MODULARES ── */
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/products"));
app.use("/api", require("./routes/sales"));
app.use("/api", require("./routes/expenses"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/arqueo", require("../arqueo/router"));

app.get("/api/config", (req, res) => {
  res.json({
    social: {
      instagram: process.env.SOCIAL_INSTAGRAM || "",
      tiktok: process.env.SOCIAL_TIKTOK || "",
      facebook: process.env.SOCIAL_FACEBOOK || "",
      whatsapp: process.env.SOCIAL_WHATSAPP || "",
    },
  });
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
