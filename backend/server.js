"use strict";

const express = require("express");
const cors = require("cors");
// eslint-disable-next-line no-unused-vars
const crypto = require("crypto");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");

// --- INICIO DE CORRECCIÓN ---
// Carga robusta de variables de entorno.
// Esto asegura que el .env se encuentre desde la raíz del proyecto,
// sin importar si el script se ejecuta directamente o con PM2.
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });
// --- FIN DE CORRECCIÓN ---

// eslint-disable-next-line no-unused-vars
const sharp = require("sharp");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const { prisma } = require("./database");
const config = require("./config"); // Importar configuración centralizada
const errorMiddleware = require("./middlewares/errorMiddleware");

const { requireAdminIp, checkBannedIp } = require("./middlewares/securityMiddleware.js");
const { requireAuth } = require("./middlewares/auth");

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

// --- INICIO DE CORRECCIÓN: Importar enrutador principal ---
const apiRoutes = require("./routes"); // Importa backend/routes/index.js
// --- FIN DE CORRECCIÓN ---

// 3. Middlewares Globales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://wa.me", "blob:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://wa.me", "blob:"], // Explicitamente para scripts en elementos (como <script> tags)
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://wompi.com", "*", "http://localhost:3001"],
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
  origin: config.isProduction
    ? [
        process.env.FRONTEND_URL,
        `http://${config.networkIp || "192.168.1.3"}:${config.port}`,
        `http://localhost:${config.port}`,
        `http://127.0.0.1:${config.port}`,
        `http://[::1]:${config.port}`, // IPv6 localhost
        process.env.NGROK_URL
      ].filter(Boolean)
    : true,
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Aplicar filtros anti-bots y limitadores
app.use("/api/", checkBannedIp);
app.use("/api/", limiter);
app.use("/api/login", loginLimiter);
app.use("/api/auth/forgot-password", loginLimiter);

// 3.5. Middleware de Verificación CSRF (Enforcement)
// IMPORTANTE: usar un secreto estable para que el token CSRF no se desincronice entre requests.
if (config.csrfEnforcement) {
  app.use((req, res, next) => {
    // Solo verificamos métodos que alteran datos
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const clientToken = req.headers["x-csrf-token"];
      if (clientToken !== config.csrfSecret) {
        logger.warn(`🛡️ Bloqueo CSRF: Intento sin token válido desde ${req.ip}`);
        return res.status(403).json({ error: "Sesión inválida o petición no autorizada (CSRF)" });
      }
    }
    next();
  });
}

// Endpoint para obtener el token CSRF (compatible con el frontend actual)
app.get("/api/get-csrf", (req, res) => {
  const origin = req.get('origin') || req.get('referer') || 'desconocido';
  logger.info(`🔑 CSRF Token solicitado desde: ${origin}`);
  res.json({ csrfToken: config.csrfSecret }); // Devolver el secreto desde la config
});

// 5. Archivos estáticos (MOVIDO ANTES DE LAS RUTAS DE API)
// Esto es crucial para que Express sirva archivos como index.html y admin-panel.html
const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- INICIO DE CORRECCIÓN: Usar el enrutador principal ---
// Montar todas las rutas de la API bajo el prefijo /api
app.use("/api", apiRoutes);
// --- FIN DE CORRECCIÓN ---

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
  const server = app.listen(portToTry, "0.0.0.0", () => {
    const localUrl = `http://localhost:${portToTry}`;
    const networkIp = config.networkIp;
    const networkUrl = `http://${networkIp}:${portToTry}`;
    const ngrokUrl = config.ngrokUrl;
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

// Solo iniciar el servidor si este archivo es el punto de entrada principal
if (require.main === module) {
  // Iniciar en el puerto configurado o 3000 por defecto
  startServer(config.port);
}

// Manejadores para evitar que el servidor muera por errores no capturados
process.on("unhandledRejection", (reason) => {
  logger.error("❌ Reclamo no manejado (Unhandled Rejection):", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("❌ Excepción no capturada (Uncaught Exception):", err.message);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  // Inicializar servicios en segundo plano solo si no estamos en modo de prueba
  const AIService = require("./services/aiService");
  // Ejecutar predicción de demanda cada 24 horas (o al iniciar si es necesario)
  setTimeout(() => AIService.runDemandForecast(), 5000); // 5 segundos después del inicio
  setInterval(() => AIService.runDemandForecast(), 24 * 60 * 60 * 1000);
}

// Exportar la app para las pruebas
module.exports = app;
