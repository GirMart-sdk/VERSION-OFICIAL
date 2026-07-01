/* ═══════════════════════════════════════════════════════
   WINNER STORE — shipping-logic.js (Matriz Logística)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.SHIPPING_ZONES = {
  URBANO: {
    name: "URBANO",
    desc: "Misma ciudad de despacho (Medellín/Envigado)",
    price: 10500,
  },
  REGIONAL: {
    name: "REGIONAL",
    desc: "Departamentos cercanos o misma región",
    price: 13900,
  },
  NACIONAL: {
    name: "NACIONAL",
    desc: "Ciudades principales en el resto del país",
    price: 18900,
  },
  ESPECIAL: {
    name: "TRAYECTO ESPECIAL",
    desc: "Poblaciones alejadas o reexpedición (Ej: Pitalito, Pasto)",
    price: 26500,
  },
};

window.CARRIER_QUOTERS = [
  {
    name: "Servientrega",
    icon: "🚀",
    url: "https://www.servientrega.com/wps/portal/Colombia/transacciones-en-linea/cotizador",
  },
  {
    name: "Coordinadora",
    icon: "📦",
    url: "https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/cotizar-envio/",
  },
  { name: "Envía Col", icon: "🚚", url: "https://envia.co/" },
  {
    name: "Interrapidísimo",
    icon: "⚡",
    url: "https://www.interrapidisimo.com/cotizar-envio/",
  },
];

/**
 * Retorna la zona estimada basado en la ciudad
 * (Lógica de ejemplo escalable a base de datos de municipios)
 */
window.estimateZone = function (city) {
  const c = (city || "").toLowerCase().trim();
  if (!c) return null;

  const urbano = [
    "medellin",
    "envigado",
    "itagui",
    "sabaneta",
    "bello",
    "la estrella",
  ];
  const nacional = [
    "bogota",
    "barranquilla",
    "cali",
    "bucaramanga",
    "pereira",
    "cartagena",
    "cucuta",
  ];
  const regional = [
    "popayan",
    "manizales",
    "armenia",
    "rionegro",
    "quibdo",
    "monteria",
  ];
  const especial = [
    "pasto",
    "pitalito",
    "leticia",
    "mitu",
    "puerto carreno",
    "inirida",
  ];

  if (urbano.some((u) => c.includes(u))) return "URBANO";
  if (nacional.some((n) => c.includes(n))) return "NACIONAL";
  if (regional.some((r) => c.includes(r))) return "REGIONAL";
  if (especial.some((e) => c.includes(e))) return "ESPECIAL";

  return "NACIONAL"; // Valor por defecto
};
