"use strict";

const Joi = require("joi");

const saleItemSchema = Joi.object({
  id: Joi.string().required(),
  productId: Joi.string().required(),
  name: Joi.string().required(),
  qty: Joi.number().integer().min(1).required(),
  price: Joi.number().precision(2).min(0).required(),
  size: Joi.string().max(10).required(),
});

const createSaleSchema = Joi.object({
  id: Joi.string().pattern(/^ON[A-Z0-9]+$/).required().messages({
    'string.pattern.base': 'El ID de la venta debe tener el formato "ON..."'
  }),
  timestamp: Joi.string().isoDate().required(),
  vendor: Joi.string().required(),
  client: Joi.string().required(),
  customer_email: Joi.string().email().required(),
  customer_phone: Joi.string().required(),
  shipping_address: Joi.string().required(),
  shipping_carrier: Joi.string().required(),
  method: Joi.string().required(),
  payment_method: Joi.string().required(),
  payment_status: Joi.string().valid("pending", "completed", "partial").required(),
  reference_number: Joi.string().required(),
  channel: Joi.string().valid("online", "fisica").required(),
  subtotal: Joi.number().min(0).required(),
  discount: Joi.number().min(0).required(),
  total: Joi.number().min(0).required(),
  items: Joi.array().items(saleItemSchema).min(1).required().messages({
    'array.min': 'La venta debe contener al menos un artículo.'
  }),
  // payment_details es opcional
  payment_details: Joi.object({
    abonoAmount: Joi.number().min(0)
  }).optional()
});

module.exports = {
  createSaleSchema,
};