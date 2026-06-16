"use strict";

const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger"); // Importar el logger

/**
 * Middleware global para procesar errores de la aplicación.
 * Centraliza la lógica de respuesta y logs.
 */
const errorMiddleware = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production"; // Mantener para mensajes al cliente
  
  // Log detallado en consola para desarrollo
  logger.error(`[Error Log] ${req.method} ${req.path}:`, { message: err.message, stack: err.stack, ip: req.ip });

  // 1. Manejo específico de errores de Prisma ORM
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Violación de restricción única (ej. SKU o Email duplicado)
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Conflicto de duplicidad",
        message: `El valor para el campo [${err.meta?.target}] ya existe en el sistema.`
      });
    }
    // P2025: No se encontró el registro para actualizar/eliminar
    if (err.code === "P2025") {
      return res.status(404).json({
        error: "Recurso no encontrado",
        message: "El registro solicitado no existe o fue eliminado previamente."
      });
    }
  }

  // 2. Manejo de fallos en procesamiento de imágenes (Sharp)
  if (err.message && (err.message.includes("Input buffer") || err.message.includes("unsupported format"))) {
    return res.status(400).json({
      error: "Error de Imagen",
      message: "El archivo proporcionado no es una imagen válida o está corrupto."
    });
  }

  // 3. Manejo de intentos de manipulación de precios
  if (err.message && err.message.includes("VIOLACIÓN DE INTEGRIDAD")) {
    logger.security("PRICE_MANIPULATION_ATTEMPT", { ip: req.ip, user: req.user?.user, details: err.message });
    return res.status(403).json({ error: "Seguridad", message: "Error de validación de montos." });
  }

  // 2. Respuesta genérica de error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.name || "Error del Servidor",
    message: isProd ? "Ocurrió un error inesperado en el procesamiento." : err.message
  });
};

module.exports = errorMiddleware;