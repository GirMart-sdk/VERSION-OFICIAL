"use strict";

const Joi = require("joi");

const saleItemSchema = Joi.object({
  // POS envía `id` (SKU interno). Online también puede mandar `productId`.
  // Aceptamos ambos para evitar que el POS falle por variaciones.
  id: Joi.string().optional(),
  productId: Joi.string().optional(),

  name: Joi.string().required(),
  qty: Joi.number().integer().min(1).required(),
  price: Joi.number().precision(2).min(0).required(),
  size: Joi.string().max(10).required(),
});

const createSaleSchema = Joi.object({
  id: Joi.string().min(3).required(),
  timestamp: Joi.alternatives().try(Joi.string().isoDate(), Joi.string().min(3)).required(),

  // POS a veces no manda estos campos (o los manda vacíos). Backend aplica defaults.
  vendor: Joi.string().optional(),
  client: Joi.string().optional(),

  // POS puede enviar email/phone vacíos
  customer_email: Joi.string().email().allow("").optional(),
  customer_phone: Joi.string().allow("", null).optional(),

  // Acceptar el string "null" que algunos POS mandan
  // (Joi lo trata como string y al no coincidir fallaría)


  // POS puede no enviar dirección
  shipping_address: Joi.string().allow("").optional(),
  shipping_carrier: Joi.string().allow("").optional(),

  method: Joi.string().required(),
  payment_method: Joi.string().required(),

  // Si no viene, el backend setea completed
  payment_status: Joi.string().valid("pending", "completed", "partial").optional().default("completed"),

  // POS puede omitir o mandar vacío
  reference_number: Joi.alternatives().try(Joi.string().allow("", null), Joi.valid(null, "")).optional(),


  channel: Joi.string().valid("online", "fisica").required(),

  // En POS a veces mandan strings o valores vacíos; permitir conversión y defaults en backend.
  subtotal: Joi.number().min(0).optional().default(0),
  // POS puede venir con discount vacío/omitido
  discount: Joi.number().min(0).optional().default(0),
  // Si no viene total, se calcula (backend puede manejarlo; aquí lo hacemos opcional)
  total: Joi.number().min(0).optional().default(0),




  items: Joi.array().items(saleItemSchema).min(1).required().messages({
    "array.min": "La venta debe contener al menos un artículo.",
  }),

  payment_details: Joi.object({
    abonoAmount: Joi.number().min(0).optional(),
    shipping_status: Joi.string().optional(),
    isLayaway: Joi.boolean().optional(),
    received: Joi.number().optional(),
    tracking_number: Joi.string().optional(),
  }).optional(),
});

module.exports = {
  createSaleSchema,
};

