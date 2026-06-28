/* ═══════════════════════════════════════════════════════════
   WINNER — backend/routes/shipping.js (Rutas de Logística)
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const router = express.Router();

// En el futuro, esta configuración podría vivir en la base de datos
// para ser gestionada desde un panel de administrador.
const SHIPPING_CONFIG = {
  zones: {
    URBANO: { name: "URBANO", desc: "Misma ciudad de despacho (Medellín/Envigado)", price: 10500 },
    REGIONAL: { name: "REGIONAL", desc: "Departamentos cercanos o misma región", price: 13900 },
    NACIONAL: { name: "NACIONAL", desc: "Ciudades principales en el resto del país", price: 18900 },
    ESPECIAL: { name: "TRAYECTO ESPECIAL", desc: "Poblaciones alejadas o reexpedición", price: 26500 },
  },
  carriers: [
    { name: "Servientrega", icon: "🚀", url: "https://www.servientrega.com/wps/portal/Colombia/transacciones-en-linea/cotizador" },
    { name: "Coordinadora", icon: "📦", url: "https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/cotizar-envio/" },
    { name: "Envía Col", icon: "🚚", url: "https://envia.co/" },
    { name: "Interrapidísimo", icon: "⚡", url: "https://www.interrapidisimo.com/cotizar-envio/" },
  ],
  cityZoneMap: {
    urbano: ["medellin", "envigado", "itagui", "sabaneta", "bello", "la estrella"],
    nacional: ["bogota", "barranquilla", "cali", "bucaramanga", "pereira", "cartagena", "cucuta"],
    regional: ["popayan", "manizales", "armenia", "rionegro", "quibdo", "monteria"],
    especial: ["pasto", "pitalito", "leticia", "mitu", "puerto carreno", "inirida"],
  },
};

/**
 * GET /api/shipping/config
 * Devuelve la configuración completa de logística (zonas, transportadoras, etc.)
 */
router.get("/config", (req, res) => {
  res.json(SHIPPING_CONFIG);
});

module.exports = router;