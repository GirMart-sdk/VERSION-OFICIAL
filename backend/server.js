"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// eslint-disable-next-line no-unused-vars
const sharp = require("sharp");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const { prisma } = require("./database");
const errorMiddleware = require("./middlewares/errorMiddleware");

const { requireAdminIp } = require("./middlewares/securityMiddleware");
const { requireAuth } = require("./middlewares/auth");
// 1. Cargar configuración de entorno
const isProdMode = process.env.NODE_ENV === "production";
const envPath = path.resolve(__dirname, "..", isProdMode ? ".env.production" : ".env");

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
  console.log(`📡 [Server] Entorno cargado desde: ${path.basename(envPath)}`);
} else {
  require("dotenv").config();
}

// Validación de variables de entorno críticas
const requiredEnvVars = ["JWT_SECRET", "ADMIN_API_KEY", "API_KEY", "DATABASE_URL"];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ [Error Crítico] Faltan variables de entorno esenciales: ${missingVars.join(", ")}`);
  console.error("   El servidor no puede iniciar. Revisa tu archivo .env");
  process.exit(1); // Detiene el servidor si faltan claves
}

// Validación de Mailer (Evita error: Missing credentials for "PLAIN")
const requiredMailVars = ["SMTP_USER", "SMTP_PASS"];
const missingMailVars = requiredMailVars.filter(v => !process.env[v]);
if (missingMailVars.length > 0) {
  console.warn(`⚠️  [Mailer] Advertencia: Faltan credenciales (${missingMailVars.join(", ")}). El envío de correos no funcionará.`);
}

// 2. Configuración de seguridad (Rate Limit)
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  max: 500, // Aumentado para evitar bloqueos durante pruebas
  message: { error: "Límite de seguridad alcanzado. Intenta de nuevo en 15 min." }
};
const limiter = rateLimit(rateLimitConfig);

// 2.5. Limitador específico para autenticación (Fuerza Bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Solo 15 intentos de login por IP cada 15 min
  message: { error: "Demasiados intentos de acceso. Bloqueo temporal de 15 min." }
});

const app = express();

// 1.5. Confianza en Proxy (Crucial para Ngrok y detección de IP real)
app.set("trust proxy", 1);

// Importar Rutas
const authRoutes = require("./routes/auth");
const salesRoutes = require("./routes/sales");
const expensesRoutes = require("./routes/expenses");
const productsRoutes = require("./routes/products");
const arqueoRoutes = require("./routes/arqueo");
const webhookRoutes = require("./routes/webhooks");
const statsRoutes = require("./routes/stats");

// 3. Middlewares Globales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://wa.me", "blob:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://wa.me", "blob:"], // Explicitamente para scripts en elementos (como <script> tags)
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://wompi.com", "*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", `http://localhost:${process.env.PORT || 3000}`, `http://${process.env.NETWORK_IP || "192.168.1.3"}:${process.env.PORT || 3000}`, "https://api.wompi.co", "https://cdn.jsdelivr.net", "*.jsdelivr.net", process.env.NGROK_URL].filter(Boolean).flat(),
      frameSrc: ["'self'", "https://checkout.wompi.co"],
      // objectSrc: ["'none'"], // Bloquear plugins como Flash
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Evitar error 404 de favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Ruta de configuración dinámica (Evita el 404)
app.get("/api/config", (req, res) => {
  res.json({
    social: { whatsapp: process.env.WHATSAPP_PHONE || "573135642283" }
  });
});

app.use(cors({
  origin: isProdMode
    ? [
        process.env.FRONTEND_URL,
        `http://${process.env.NETWORK_IP || "192.168.1.3"}:${process.env.PORT || 3000}`,
        `http://localhost:${process.env.PORT || 3000}`,
        `http://127.0.0.1:${process.env.PORT || 3000}`,
        `http://[::1]:${process.env.PORT || 3000}`, // IPv6 localhost
        process.env.NGROK_URL
      ].filter(Boolean)
    : true,
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Aplicar limitadores
app.use("/api/", limiter);
app.use("/api/login", loginLimiter);
app.use("/api/auth/forgot-password", loginLimiter);

// 3.5. Middleware de Verificación CSRF (Enforcement)
// IMPORTANTE: usar un secreto estable para que el token CSRF no se desincronice entre requests.
const CSRF_ENFORCEMENT = process.env.CSRF_ENFORCEMENT !== "false";
const RUNTIME_CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

if (CSRF_ENFORCEMENT) {
  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    const origin = req.get('origin');
    
    // Solo verificamos métodos que alteran datos
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      // Validar que el origen coincida con nuestras IPs o Ngrok si es producción
      if (isProdMode && origin && !origin.includes("ngrok") && !origin.includes(process.env.NETWORK_IP || "192.168.1.3") && !origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes("::1")) {
        return res.status(403).json({ error: "Origen de petición no confiable" });
      }
      const clientToken = req.headers["x-csrf-token"];
      if (clientToken !== RUNTIME_CSRF_SECRET) {
        logger.warn(`🛡️ Bloqueo CSRF: Intento sin token válido desde ${req.ip}`);
        return res.status(403).json({ error: "Sesión inválida o petición no autorizada (CSRF)" });
      }
    }
    next();
  });
}

// Endpoint para obtener el token dinámico de esta sesión
app.get("/api/get-csrf", (req, res) => {
  const origin = req.get('origin') || req.get('referer');
  logger.info(`🔑 CSRF Token solicitado desde: ${origin}`);
  res.json({ csrfToken: RUNTIME_CSRF_SECRET }); // Devolver el secreto dinámico
});


// Authentication routes (login, logout, forgot-password)
// These should not be IP whitelisted, as an admin might need to log in from a new IP
app.use("/api", authRoutes);

// Apply security middleware to all subsequent /api routes
app.use("/api", requireAuth, requireAdminIp);

// Admin-specific routes
app.use("/api", productsRoutes); // Montar productsRoutes directamente bajo /api
app.use("/api", salesRoutes);
app.use("/api", expensesRoutes);
app.use("/api", arqueoRoutes);
app.use("/api", webhookRoutes);
app.use("/api", statsRoutes);
app.use("/api", require("./routes/sessions")); // New sessions routes

// 4. Seguridad de archivos sensibles
const BLOCKED_PATTERNS = [
  /\.env/i, 
  /server\.js/i, 
  /database\.js/i, 
  /\.db/i, 
  /\.log/i, 
  /\.bat/i, 
  /\.vbs/i,
  /node_modules/i,
  /scripts/i,
  /backups/i,
  /logs/i,
  /package/i,
  /\.gitignore/i,
  /prisma/i,
  /\.git/i,
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(p))) {
    logger.error(`🚨 [ALERTA SEGURIDAD] Intento de acceso a archivo restringido: ${req.path} | IP: ${req.ip}`);
    return res.status(403).json({ error: "Acceso prohibido" });
  }
  next();
});

// 5. Archivos estáticos
const rootPath = path.join(__dirname, "..");
app.use(express.static(rootPath));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// 6. Rutas de salud y diagnóstico
app.get("/api/health", requireAuth, requireAdminIp, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: "online", 
      version: "3.5",
      database: "connected",
      timestamp: new Date() 
    });
  } catch (err) {
    logger.error("❌ Fallo en Health Check:", err.message);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// 7. Manejo de errores global (captura todo lo que falle en las rutas)
app.use(errorMiddleware);

// 8. Lanzamiento inteligente de puerto
const startServer = (portToTry) => {
  const server = app.listen(portToTry, () => {
    const localUrl = `http://localhost:${portToTry}`;
    const networkIp = process.env.NETWORK_IP; // Now guaranteed to be set by INICIAR_WINNER.bat
    const networkUrl = `http://${networkIp}:${portToTry}`;
    const ngrokUrl = process.env.NGROK_URL;
    logger.info(`🚀 WINNER STORE Corriendo en: ${localUrl}`);
    if (ngrokUrl) logger.info(`🌐 Acceso Público (Ngrok): ${ngrokUrl}`);
    logger.info(`📱 Acceso Red Local (Escáner Móvil): ${networkUrl}`); // Mantener para acceso directo
    logger.info(`🔐 Seguridad JWT y API Key activa`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn(`⚠️ Puerto ${portToTry} ocupado, intentando con ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      logger.error(`❌ Error crítico al iniciar servidor: ${err.message}`);
    }
  });
};

// Iniciar en el puerto configurado o 3000 por defecto
const PORT = parseInt(process.env.PORT || "3000");
startServer(PORT);

// Manejadores para evitar que el servidor muera por errores no capturados
process.on("unhandledRejection", (reason) => {
  logger.error("❌ Reclamo no manejado (Unhandled Rejection):", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("❌ Excepción no capturada (Uncaught Exception):", err.message);
  process.exit(1);
});
