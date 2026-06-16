const { z } = require("zod");

const schemas = {
  login: z.object({
    user: z.string().min(1, "El usuario es obligatorio"),
    pass: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  }),
  forgotPassword: z.object({
    email: z.string().email("Email inválido"),
  }),
  sale: z.object({
    id: z.string().optional(),
    total: z.coerce.number().positive("El total debe ser positivo"),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          productId: z.string().optional(),
          name: z.string(),
          qty: z.coerce.number().int().positive(),
          price: z.coerce.number().nonnegative(),
          size: z.string().optional(),
          sku: z.string().optional(),
        }),
      )
      .min(1, "Debe haber al menos un item"),
    client: z.string().optional().nullable(),
    customer_email: z
      .union([z.string().email("Email inválido"), z.literal(""), z.null()])
      .optional(),
    customer_phone: z.string().optional().nullable(),
    method: z.string().optional().nullable(),
    payment_method: z.string().optional().nullable(),
    payment_status: z.string().optional().nullable(),
    shipping_address: z.string().optional().nullable(),
    shipping_carrier: z.string().optional().nullable(),
    payment_details: z
      .object({
        abonoAmount: z.coerce.number().optional().nullable(),
        shipping_status: z.string().optional().nullable(),
        isLayaway: z.boolean().optional().nullable(),
        received: z.coerce.number().optional().nullable(),
        tracking_number: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    // Campos de metadatos enviados por el frontend
    channel: z.string().optional(),
    vendor: z.string().optional(),
    timestamp: z.string().optional(),
    subtotal: z.coerce.number().optional(),
    discount: z.coerce.number().optional(),
    reference_number: z.string().optional(),
  }),
  product: z.object({
    id: z.string().optional(),
    name: z.string().min(1, "El nombre es obligatorio"),
    price: z.coerce.number().nonnegative(),
    cost: z.coerce.number().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    stock: z.record(z.coerce.number().int().nonnegative()).optional(),
  }),
  expense: z.object({
    id: z.string().optional(),
    amount: z.coerce.number().nonnegative(),
    category: z.string().optional(),
    concept: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
  }),
  checkoutInit: z.object({
    saleId: z.string().min(1),
    amount: z.coerce.number().positive(),
    email: z.string().email().optional().nullable().or(z.literal("")),
    paymentType: z.string().optional(),
  }),
};

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    console.warn("⚠️ Fallo de validación en:", req.path, result.error.format());

    // Extraer las issues de forma segura para evitar el TypeError
    const issues = result.error.issues || [];

    return res.status(400).json({
      error: "Datos inválidos o incompletos",
      details: issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
  // Reemplazar el body con los datos parseados (limpia campos extra no deseados)
  req.body = result.data;
  next();
};

module.exports = { validate, schemas };
