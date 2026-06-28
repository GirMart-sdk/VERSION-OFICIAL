/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/index.js (Enrutador Principal)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// --- Rutas Públicas o con Autenticación Propia ---
// Rutas de autenticación (login, logout, etc.)
router.use("/auth", require("./auth"));

// Rutas de Webhooks (Wompi, etc.). Tienen su propia validación de seguridad.
router.use("/webhooks", require("./webhooks"));

// --- Rutas Protegidas por Autenticación General ---
// A partir de aquí, todas las rutas requieren un token JWT o una API Key válida.
router.use(requireAuth);

// Rutas de la aplicación principal
router.use("/products", require("./products"));
router.use("/sales", require("./sales"));
router.use("/expenses", require("./expenses"));
router.use("/stats", require("./stats"));
router.use("/shipping", require("./shipping"));
router.use("/checkout", require("./checkout"));

// Rutas de Arqueo de Caja
router.use("/arqueo", require("../../arqueo/router"));

// Rutas de Administración (Estas ya usan 'requireAdminIp' internamente donde es necesario)
router.use("/admin", require("./sessions"));

module.exports = router;