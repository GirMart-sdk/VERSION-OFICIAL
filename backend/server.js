"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const sharp = require("sharp");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const { prisma } = require("./database");
const errorMiddleware = require("./middlewares/errorMiddleware");

// 1. Cargar configuración de entorno
const isProdMode = process.env.NODE_ENV === "production";
const envPath = path.resolve(__dirname, "..", isProdMode ? ".env.production" : ".env");

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
  console.log(`📡 [Server] Entorno cargado desde: ${path.basename(envPath)}`);
} else {
  require("dotenv").config();
}

// 2. Configuración de seguridad (Rate Limit)
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiados intentos. Por seguridad, bloqueado por 15 min." }
};
const limiter = rateLimit(rateLimitConfig);

const app = express();

// 3. Middlewares Globales
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para facilitar carga de recursos externos en local
}));
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Aplicar limitador a todas las rutas de la API
app.use("/api/", limiter);

// 4. Seguridad de archivos sensibles
const BLOCKED_FILES = [".env", "server.js", "database.js", "seed.js", ".db", ".log"];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (BLOCKED_FILES.some(f => p.includes(f))) {
    logger.warn(`🛡️ Intento de acceso bloqueado a archivo sensible: ${req.path} desde ${req.ip}`);
    return res.status(403).json({ error: "Acceso prohibido" });
  }
  next();
});

// 5. Archivos estáticos
const rootPath = path.join(__dirname, "..");
app.use(express.static(rootPath));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// 6. Rutas de salud y diagnóstico
app.get("/api/health", async (req, res) => {
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
    logger.info(`🚀 WINNER STORE Corriendo en: ${localUrl}`);
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
