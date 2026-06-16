"use strict";

/**
 * Envoltorio para controladores asíncronos que elimina la necesidad de bloques try/catch.
 * Captura errores de Promesas rechazadas y los pasa al middleware de errores de Express.
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;