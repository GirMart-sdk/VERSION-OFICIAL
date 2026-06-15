/* ═══════════════════════════════════════════════════════════
   WINNER STORE — server.js  v3.5
   Backend completo: Productos · Inventario · Ventas · Auth (PostgreSQL)
   Merchant Feed CSV · Estadísticas · Seguridad JWT + API Key
   
   PROTECTED SOFTWARE - PROPIEDAD INTELECTUAL DE GIRMART-SDK
   QUEDA PROHIBIDA LA COPIA O DISTRIBUCIÓN NO AUTORIZADA.
   TODOS LOS DERECHOS RESERVADOS 2026.
   ═══════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
// 1. CARGAR CONFIGURACIÓN PRIMERO (Antes de cualquier otro import)
const morgan = require("morgan");
const isProdMode = process.env.NODE_ENV === "production";

// Manejadores de errores globales para evitar que el servidor muera por fallos de SMTP o DB
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ [Advertencia] Promesa no manejada:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ [Error Crítico] Excepción no capturada:", err.message);
  // En producción, es mejor cerrar y dejar que PM2 reinicie el proceso para limpiar memoria
  if (isProdMode) {
    console.error("Terminando proceso para reinicio limpio...");
    process.exit(1);
  }
});

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
console.log(`[Startup] RUTA COMPLETA ENV: ${envPath}`);
console.log(`[Startup] ARCHIVO: ${path.basename(envPath)}`);

// Depuración de Mailer (Asegúrate de que coincidan con tu .env)
console.log(
  `[Mailer] Config: Host=${process.env.SMTP_HOST} | User=${process.env.SMTP_USER}`,
);
console.log(`[Mailer] Puerto: ${process.env.SMTP_PORT}`);
const passCheck = process.env.SMTP_PASS
  ? "Detectado (Longitud: " + process.env.SMTP_PASS.length + ")"
  : "NO DETECTADO";
console.log(`[Mailer] Password: ${passCheck}`);

// Importar Servicios (Arquitectura de Capas)
const InventoryService = require("./services/inventoryService");
const SalesService = require("./services/salesService");
const ReportService = require("./services/reportService");

// Importar Utilidades y Middleware de Errores
const cors = require("cors");
const logger = require("./utils/logger"); // Importar el nuevo logger
const asyncHandler = require("./utils/asyncHandler");
const errorMiddleware = require("./middlewares/errorMiddleware");
const securityMiddleware = require("./middlewares/securityMiddleware");

const express = require("express");
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
let sendSaleEmail, sendResetEmail;
try {
  const mailer = require("../emails/mailer");
  sendSaleEmail = mailer.sendSaleEmail;
  sendResetEmail = mailer.sendResetEmail;
  console.log("📧 [Mailer] Módulo cargado (Pendiente verificación SMTP)");
} catch (err) {
  logger.error("⚠️ [Mailer] Error crítico cargando módulo de correos:", {
    message: err.message,
    stack: err.stack,
  });
}
const { validate, schemas } = require("./middlewares/validation");
const { URL } = require("url");

const app = express();

// Habilitar la confianza en el proxy inverso (Nginx, Cloudflare, etc.)
// Configuración de seguridad: confiamos en 1 nivel de proxy (Nginx).
// Esto soluciona el error ValidationError de express-rate-limit.
app.set('trust proxy', 1);

// Limitador estricto para Login y Recuperación de contraseña
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos por ventana
  message: {
    error: "Demasiados intentos de acceso. IP registrada.",
  },
  handler: (req, res, next, options) => {
    logger.security("BRUTE_FORCE_ATTEMPT", { ip: req.ip, path: req.path });
    res.status(options.statusCode).send(options.message);
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

// Autonomía: Ejecutar migraciones de Prisma automáticamente en producción
if (isProdMode) {
  console.log("🔄 [Autonomía] Verificando esquema de base de datos...");
  try {
    const { execSync } = require("child_process");
    execSync("npx prisma migrate deploy", { stdio: "pipe" }); // Cambiado a pipe para que no imprima en consola principal
    console.log("✅ [Autonomía] Base de datos actualizada.");
  } catch (err) {
    console.error("⚠️ [Autonomía] Error en migraciones automáticas:", err.message);
  }
}

// Verificar conexión a la base de datos al arrancar para detectar errores de configuración
prisma
  .$connect()
  .then(() => logger.info("🐘 Conexión verificada con éxito a PostgreSQL"))
  .catch((err) => {
    logger.error("❌ ERROR DE BASE DE DATOS:", {
      message: "SSL handshake fallido o host inalcanzable.",
    });
    const maskedUrl = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@")
      : "No definida";
    console.log(`   Archivo: ${envPath} | URL: ${maskedUrl}`);
    console.error(`   Detalle: ${err.message}`);
  });

// Validación de entorno Wompi para depuración
if (!process.env.WOMPI_PUBLIC_KEY) {
  logger.warn(
    "⚠️ [Wompi] WOMPI_PUBLIC_KEY no encontrada. Se usará la llave de pruebas por defecto.",
  );
}
if (!process.env.WOMPI_INTEGRITY_SECRET && IS_PRODUCTION) {
  logger.error(
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

      return cb(new Error("No permitido por políticas CORS"));
    },
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
  }),
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Private-Network", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-csrf-token",
  );
  next();
});

app.use(cookieParser());
app.use(bodyParser.json({ limit: "2mb" })); // Reducido para evitar DoS por payloads gigantes
app.use(bodyParser.urlencoded({ limit: "2mb", extended: true }));

// 3. SEGURIDAD ACTIVA: Chequeo de IP Jail y Honeypot
app.use(asyncHandler(securityMiddleware.checkIP));
app.use(asyncHandler(securityMiddleware.honeypot));

// Middleware para logs de acceso HTTP (Morgan)
app.use(morgan("combined", { stream: logger.stream }));

// Ignorar peticiones de favicon.ico para evitar errores 404 en los logs
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Endpoint para obtener el token CSRF inicial
app.get("/api/get-csrf", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
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

// Aplicar CSRF a todas las rutas de la API, excepto Webhooks
app.use("/api", (req, res, next) => {
  if (req.path.includes("/webhooks")) return next();
  // Si el token falla, csurf lanzará un error que capturará el logger en errorMiddleware
  return csrfProtection(req, res, next);
});

// Aplicar limitadores
app.use("/api/auth/", authLimiter);
app.use("/api/", generalApiLimiter);

/* ── Seguridad de archivos sensibles ────────────────────── */
const CLIENT_ROOT = path.join(__dirname, "..");
app.use((req, res, next) => {
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

/* ── Endpoint de subida de archivos (Imágenes) ──────────── */
app.post("/api/storage/upload", requireAuth, asyncHandler(async (req, res) => {
  const { fileName, base64Data } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "Datos de imagen no proporcionados" });
  }

  // Procesar el base64 (quitar cabecera si existe)
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let buffer;

  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], "base64");
  } else {
    buffer = Buffer.from(base64Data, "base64");
  }

    // Resiliencia Avanzada: Validar el "Magic Number" (Firma binaria del archivo)
    // JPEG: ffd8ff, PNG: 89504e47, GIF: 47494638, WebP: 52494646 (RIFF)
    const hex = buffer.toString('hex', 0, 4);
    const isImage = /^(ffd8ff|89504e|474946|524946)/i.test(hex);
    if (!isImage) {
      return res.status(400).json({ error: "El archivo no es una imagen válida." });
    }

  const uploadDir = getStructuredUploadPath();
  
  // SEGURIDAD: Forzamos la extensión .webp y procesamos con Sharp.
  // Sharp sanitiza la imagen, elimina metadatos peligrosos y verifica la integridad real del archivo.
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
  const filePath = path.join(uploadDir, uniqueName);

  await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  // Generar URL pública relativa
  const publicPath = path.relative(CLIENT_ROOT, filePath).replace(/\\/g, "/");
  const publicUrl = `/${publicPath}`;

  res.json({ success: true, publicUrl });
}));

/* ── Endpoint de actualización masiva (CSV) ───────────────── */
app.post("/api/inventory/bulk-update", requireAuth, asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array de { sku/id, size, qty }
  if (!Array.isArray(updates))
    return res.status(400).json({ error: "Formato inválido" });

  // Punto Ciego: Denegación de servicio por carga masiva
  if (updates.length > 500) {
    return res.status(400).json({ error: "El lote es demasiado grande. Máximo 500 registros." });
  }

  const results = await InventoryService.bulkUpdate(updates);
  res.json({ 
    success: true, 
    message: `Inventario actualizado: ${results.length} registros procesados.` 
  });
}));

// ── Endpoint para descargar reporte de arqueo (PDF) ──────
app.get("/api/arqueo/report/:sessionId", requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // 1. Obtener datos de la sesión
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });

  // 2. Obtener ventas y gastos vinculados al rango de tiempo de la sesión
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: session.openedAt, lte: session.closedAt || new Date() },
      deletedAt: null
    }
  });

  const expenses = await prisma.expense.findMany({
    where: {
      createdAt: { gte: session.openedAt, lte: session.closedAt || new Date() }
    }
  });

  // 3. Generar el PDF usando el ReportService
  const pdfBuffer = await ReportService.generateCashClosingPDF(session, sales, expenses);

  // 4. Enviar respuesta como archivo PDF
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=Cierre_Caja_${sessionId}.pdf`,
    "Content-Length": pdfBuffer.length,
  });
  res.end(pdfBuffer);
}));

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

// Centralización del manejo de errores
// Importante: Debe ser el último middleware cargado
app.use(errorMiddleware);

/* ── TAREAS DE MANTENIMIENTO AUTOMÁTICO ── */
const maintenanceTask = setInterval(async () => {
  try {
    const now = new Date();
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 90); // Retener logs por 90 días

    // 1. Limpiar tokens expirados
    await prisma.blacklistedToken.deleteMany({ where: { expiresAt: { lt: now } } });
    // 2. Limpiar IPs cuya condena expiró
    await prisma.bannedIp.deleteMany({ where: { expiresAt: { lt: now } } });
    // 3. Purga de logs de auditoría antiguos (Resiliencia de DB)
    await prisma.auditLog.deleteMany({ where: { createdAt: { lt: retentionDate } } });

    logger.info("🧹 [Maintenance] Limpieza de seguridad completada con éxito.");
  } catch (err) {
    logger.error("❌ [Maintenance] Error en tarea de limpieza:", err.message);
  }
}, 24 * 60 * 60 * 1000); // Ejecutar una vez al día

/* ── CIERRE AGRACIADO (Graceful Shutdown) ── */
const gracefulShutdown = async () => {
  logger.info("🛑 Recibida señal de apagado. Cerrando recursos...");
  clearInterval(maintenanceTask);
  await prisma.$disconnect();
  // El servidor de express se cierra automáticamente al salir el proceso
  logger.info("🐘 Recursos liberados correctamente.");
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

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

      logger.info(`🚀 WINNER STORE Corriendo en: ${localUrl}`);
      if (publicUrl && !publicUrl.includes("localhost")) {
        logger.info(`🌐 Acceso Externo (Túnel): ${publicUrl}`);
      }
      logger.info(`🔐 Servidor iniciado con seguridad JWT y API Key activa`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        logger.warn(
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
