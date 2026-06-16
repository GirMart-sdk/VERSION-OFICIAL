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

// Validación estricta de variables críticas
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "API_KEY"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ ERROR CRÍTICO: Faltan variables de entorno esenciales: ${missing.join(", ")}`);
  process.exit(1);
}

// Blindaje: Verificar fortaleza de la llave en producción
if (isProdMode && process.env.JWT_SECRET.length < 32) {
  console.error("******************************************************************");
  console.error("❌ ERROR: JWT_SECRET es demasiado corto (mínimo 32 caracteres).");
  console.error("******************************************************************");
  process.exit(1);
}

console.log(`[Startup] ARCHIVO: ${path.basename(envPath)}`);

const express = require("express");
const cors = require("cors");
const sharp = require("sharp");
const rateLimit = require("express-rate-limit");
const https = require("https");
const csrf = require("csurf");
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

// Limitador estricto para Login y Recuperación de contraseña
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos por ventana
  handler: (req, res, next, options) => {
    console.error(`🚨 [SECURITY BLOCK] Límite de intentos excedido para IP: ${req.ip} en ${req.path}`);
    // Esto quedará registrado en los logs de PM2 para tu revisión
    res.status(options.statusCode).json(options.message);
  },
  message: {
    error: "Demasiados intentos. Por seguridad, bloqueado por 15 min.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitador general para el resto de la API
const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 peticiones por minuto por IP
  message: { error: "Límite de peticiones excedido." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protección CSRF (Cross-Site Request Forgery)
const csrfProtection = csrf({
  cookie: true, // Configuraremos las opciones dinámicamente en el middleware
});

// Middleware para ajustar seguridad de cookies según el origen
app.use((req, res, next) => {
  const isLocal = req.hostname === "localhost" || req.hostname === "127.0.0.1";
  const isProxySecure =
    req.get("x-forwarded-proto") === "https" || req.hostname.includes("ngrok");

  // Edge/Chrome bloquean cookies Secure en http://localhost.
  // Solo activamos Secure si realmente hay un túnel HTTPS activo.
  const shouldBeSecure = isProdMode && isProxySecure;

  // Si es local (HTTP), no forzamos Secure para evitar que el navegador bloquee la cookie
  req.cookieOptions = {
    httpOnly: true,
    secure: shouldBeSecure,
    sameSite: shouldBeSecure ? "None" : "Lax",
  };
  next();
});

const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";

async function hashPassword(password) {
  const derivedKey = await scryptAsync(password, HASH_SALT, 64);
  return derivedKey.toString("hex");
}

/**
 * Verifica si una contraseña coincide con un hash guardado en la BD
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  try {
    const derivedKey = await scryptAsync(password, HASH_SALT, 64);
    return require("crypto").timingSafeEqual(
      derivedKey,
      Buffer.from(hash, "hex"),
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
const { prisma } = require("./database"); // Ahora desestructuramos la instancia completa

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
      const isAllowedTunnel =
        origin &&
        (origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          origin.includes("ngrok-free.dev"));

      if (isAllowedTunnel) return cb(null, true);

      return cb(null, true);
    },
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-csrf-token"],
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Ignorar peticiones de favicon.ico para evitar errores 404 en los logs
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Endpoint para obtener el token CSRF inicial
app.get("/api/get-csrf", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Endpoint de Salud (Health Check)
app.get("/api/health", async (req, res) => {
  try {
    // Intenta una operación mínima en la DB
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date() });
  } catch (e) {
    res.status(503).json({ status: "error", database: "disconnected", error: e.message });
  }
});

// Aplicar CSRF a todas las rutas de la API, excepto Webhooks
app.use("/api", (req, res, next) => {
  if (req.path.includes("/webhooks")) return next();
  return csrfProtection(req, res, next);
});

// Aplicar limitadores
app.use("/api/auth/", authLimiter);
app.use("/api/", generalApiLimiter);

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

/* ── Audit Middleware para Seguimiento Estricto ── */
const auditLogger = (req, res, next) => {
  const sensitiveMethods = ["POST", "PUT", "DELETE", "PATCH"];
  if (sensitiveMethods.includes(req.method)) {
    const user = req.user?.user || req.authenticated || req.body?.user || "Unknown";
    const time = new Date().toISOString();
    const userAgent = req.get("User-Agent") || "No UA";
    console.log(`🛡️ [Audit] ${time} | IP: ${req.ip} | User: ${user} | Op: ${req.method} ${req.path} | UA: ${userAgent}`);
    
    // Alerta específica para intentos en rutas de autenticación
    const isAuthPath = req.path.includes("/auth/") || req.path.includes("/login");
    if (isAuthPath) {
      console.log(`⚠️ [Audit-Critical] Intento de acceso a ruta de credenciales detectado.`);
    }
  }
  next();
};

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

/* Aplicar auditoría a todos los endpoints de la API */
app.use("/api", auditLogger);

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

/* ── Endpoint de subida de archivos (Imágenes) ──────────── */
app.post("/api/storage/upload", requireAuth, async (req, res) => {
  const { fileName, base64Data } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "Datos de imagen no proporcionados" });
  }

  try {
    // Procesar el base64 (quitar cabecera si existe)
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let buffer;

    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(base64Data, "base64");
    }

    const uploadDir = getStructuredUploadPath();
    // Generar nombre único para evitar duplicados
    const ext = path.extname(fileName) || ".webp";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    fs.writeFileSync(filePath, buffer);

    // Generar URL pública relativa
    const publicPath = path.relative(CLIENT_ROOT, filePath).replace(/\\/g, "/");
    const publicUrl = `/${publicPath}`;

    res.json({ success: true, publicUrl });
  } catch (err) {
    console.error("❌ Error guardando archivo:", err);
    res.status(500).json({ error: "Fallo al procesar la carga del archivo" });
  }
});

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
app.use("/api/auth", require("./routes/auth"));
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
    branding: {
      heroImages: [
        "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600",
      ],
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
      const localUrl = `http://localhost:${portToTry}`;
      const publicUrl = process.env.FRONTEND_URL;

      console.log(`\n🚀 WINNER STORE Corriendo en: ${localUrl}`);
      if (publicUrl && !publicUrl.includes("localhost")) {
        console.log(`🌐 Acceso Externo (Túnel): ${publicUrl}`);
      }
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
