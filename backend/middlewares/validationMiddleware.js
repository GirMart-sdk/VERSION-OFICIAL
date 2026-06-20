"use strict";

/**
 * Middleware para validar el cuerpo (body) de una petición contra un esquema de Joi.
 * Si la validación falla, responde con un error 400 y los detalles.
 * @param {Joi.Schema} schema - El esquema de Joi a utilizar para la validación.
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Reportar todos los errores, no solo el primero
      stripUnknown: true, // Eliminar campos no definidos en el esquema
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message).join(", ");
      // Log para depurar exactamente qué campo rechaza Joi y el payload real que llega
      console.error("❌ [Joi] Datos inválidos en", {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        errors: error.details.map((d) => d.message),
      });
      return res.status(400).json({ error: `Datos inválidos: ${errors}` });
    }


    next();
  };
};

module.exports = validateRequest;