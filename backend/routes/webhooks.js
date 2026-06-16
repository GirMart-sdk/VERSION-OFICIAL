/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/webhooks.js (Rutas de Webhooks)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const { prisma } = require("../database");
const { createHash } = require("crypto");

const router = express.Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-webhook-key";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Genera el sello de integridad requerido por Wompi para transacciones seguras.
 */
function generateWompiIntegrity(reference, amountInCents, currency) {
  let secret = (process.env.WOMPI_INTEGRITY_SECRET || "")
    .trim()
    .replace(/['"]/g, "");
  if (!secret || typeof secret !== "string") return null;

  // Limpiar el secreto de espacios, saltos de línea y comillas accidentales
  secret = secret.trim().replace(/['"]/g, "");

  // SEGURIDAD: El secreto de integridad NO es el mismo que el de eventos (webhooks)
  if (secret.includes("_events_")) {
    console.error(
      "❌ [Wompi Error] Estás usando el 'Secreto de Eventos'. " +
        "Debes usar el 'Secreto de Integridad' (Dashboard > Desarrolladores > Llaves técnicas).",
    );
    return null;
  }

  // Aseguramos que sea un entero absoluto (centavos) para evitar errores de coma flotante
  // Convertimos a Number y redondeamos para eliminar cualquier residuo de punto flotante
  const amountStr = Math.round(Number(amountInCents)).toString();
  const chain = `${reference}${amountStr}${currency}${secret}`;

  return createHash("sha256").update(chain, "utf8").digest("hex");
}

/**
 * Webhook específico para Wompi
 */
router.post("/wompi", async (req, res) => {
  const payload = req.body;
  const { data, event } = payload;

  console.log(
    `🔔 [Wompi Webhook] Evento: ${event} | Ref: ${data?.transaction?.reference} | Status: ${data?.transaction?.status}`,
  );

  if (event === "transaction.updated") {
    const transaction = data.transaction;
    const saleReference = transaction.reference.split("_")[0];
    const status = transaction.status;

    const statusMap = {
      APPROVED: "completed",
      DECLINED: "failed",
      VOIDED: "cancelled",
      ERROR: "failed",
    };

    const newPaymentStatus = statusMap[status] || "pending";

    try {
      const sale = await prisma.sale.findFirst({
        where: {
          OR: [
            { id: saleReference },
            { referenceNumber: saleReference },
            { referenceNumber: transaction.reference },
          ],
        },
        include: { salePayments: true },
      });

      if (sale) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: {
            paymentStatus:
              sale.paymentStatus === "completed"
                ? "completed"
                : newPaymentStatus,
            referenceNumber: transaction.id,
          },
        });

        if (status === "APPROVED") {
          const paid = sale.salePayments.reduce((sum, p) => sum + p.amount, 0);
          const balance = sale.totalAmount - paid;

          if (balance > 0) {
            await prisma.salePayment.create({
              data: {
                saleId: sale.id,
                amount: balance,
                method: "Wompi / Online",
                notes: `Pago verificado (Wompi ID: ${transaction.id})`,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Error procesando webhook Wompi:", err.message);
      return res.status(500).send("Internal Error");
    }
  }

  res.status(200).send("Event Received");
});

/**
 * Webhook genérico para otros sistemas de pago
 */
router.post("/payment", async (req, res) => {
  const webhookSecret = req.header("x-webhook-secret");
  if (webhookSecret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Secret inválido" });
  }

  const { reference_number, status = "completed" } = req.body;

  try {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ referenceNumber: reference_number }, { id: reference_number }],
      },
    });

    if (!sale) return res.status(404).json({ error: "Venta no encontrada" });

    await prisma.sale.update({
      where: { id: sale.id },
      data: { paymentStatus: status },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
