"use strict";

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// Asegurarse de que la carpeta de logs exista
const logDir = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Formato de los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Incluir stack trace para errores
  winston.format.splat(),
  winston.format.json() // Salida en formato JSON para fácil parseo
);

// Transportes para guardar logs en archivos rotativos
const transports = [
  // Console log para desarrollo
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: "debug", // Mostrar todo en consola en desarrollo
  }),

  // Archivo dedicado exclusivamente a Eventos de Seguridad (SIEM Ready)
  new DailyRotateFile({
    filename: path.join(logDir, "security-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "30d",
    level: "warn", // Aquí caerán intentos de login fallidos, CSRF, etc.
  }),

  // Archivo para errores críticos
  new DailyRotateFile({
    filename: path.join(logDir, "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m", // Rotar si el archivo excede 20MB
    maxFiles: "14d", // Mantener logs por 14 días
    level: "error",
  }),

  // Archivo para logs combinados (info, warn, error)
  new DailyRotateFile({
    filename: path.join(logDir, "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level: "info",
  }),
];

const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1, // Usado para SECURITY EVENTS
    info: 2,
    http: 3,
    debug: 4,
  },
  format: logFormat,
  transports: transports,
  exitOnError: false, // No salir en caso de error en el logger
});

// Helper para logs de seguridad consistentes
logger.security = (action, details) => {
  logger.warn(`[SECURITY_EVENT] Action: ${action}`, details);
};

// Stream para Morgan (HTTP access logs)
logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  },
};

module.exports = logger;