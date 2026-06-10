/* ═══════════════════════════════════════════════════════════
   WINNER — backend/middlewares/validation.js (Middlewares de Validación)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const Joi = require("joi");

const schemas = {
  product: Joi.object({
    id: Joi.string().allow(null, ""),
    name: Joi.string().required(),
    price: Joi.number().min(0).required(),
    cost: Joi.number().min(0).default(0),
    category: Joi.string().allow(null, ""),
    image: Joi.string().allow(null, ""),
    badge: Joi.string().allow(null, ""),
    badgeType: Joi.string().allow(null, ""),
    sku: Joi.string().allow(null, ""),
    description: Joi.string().allow(null, ""),
    stock: Joi.object()
      .pattern(Joi.string(), Joi.number().integer().min(0))
      .allow(null),
  }),
  sale: Joi.object({
    id: Joi.string().allow(null, ""),
    total: Joi.number().min(0).required(),
    items: Joi.array().items(Joi.object()).required(),
    customer_email: Joi.string().email().allow(null, ""),
    customer_phone: Joi.string().allow(null, ""),
    shipping_address: Joi.string().allow(null, ""),
    shipping_carrier: Joi.string().allow(null, ""),
    payment_method: Joi.string().allow(null, ""),
    payment_status: Joi.string()
      .valid("completed", "partial", "pending")
      .default("completed"),
  }).unknown(),
  review: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().min(5).max(500).required(),
    suggestion: Joi.string().allow("", null).max(500),
    productId: Joi.string().allow(null, ""),
  }),
  expense: Joi.object({
    id: Joi.string().optional(),
    date: Joi.date().iso().required(),
    category: Joi.string().required(),
    concept: Joi.string().required(),
    detail: Joi.string().allow("", null).optional(),
    amount: Joi.number().min(0.01).required(),
  }),
};

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ error: error.details[0].message, success: false });
  next();
};

module.exports = { schemas, validate };
