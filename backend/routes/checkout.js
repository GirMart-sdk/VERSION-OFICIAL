/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/checkout.js (Rutas de Pago)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const { createHash } = require("crypto");
const { requireAuth } = require("../middlewares/auth");
const { validate, schemas } = require("../middlewares/validation");

const router = express.Router();

/**
 * POST /api/checkout/wompi-integrity
 * Genera el sello de integridad requerido por Wompi para iniciar una transacción.
 * El frontend debe llamar a esta ruta antes de redirigir al checkout de Wompi.
 */
router.post("/checkout/wompi-integrity", requireAuth, validate(schemas.checkoutInit), (req, res) => {
  const { saleId, amount, email } = req.body;
  const currency = "COP"; // Moneda fija
  const reference = `${saleId}_${Date.now()}`;
  const amountInCents = Math.round(Number(amount) * 100);

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

  if (!integritySecret) {
    console.error("❌ [Wompi Error] El 'Secreto de Integridad' (WOMPI_INTEGRITY_SECRET) no está configurado.");
    return res.status(500).json({ error: "Error de configuración del servidor." });
  }

  const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
  const integrityHash = createHash("sha256").update(chain, "utf8").digest("hex");

  res.json({
    success: true,
    reference,
    amountInCents,
    currency,
    integrityHash,
    customerEmail: email,
    // URL a la que Wompi redirigirá al usuario después del pago
    redirectUrl: `${process.env.FRONTEND_URL}/checkout/result`,
  });
});

module.exports = router;