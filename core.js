/* ═══════════════════════════════════════════════════════
   WINNER — core.js (Motor Global Consolidado)
   ═══════════════════════════════════════════════════════ */
"use strict";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "U"];

// Definiciones de calidades para el mercado local de calzado
const FOOTWEAR_QUALITIES = [
  { id: "nacional", name: "Nacional (Local)", badge: "badge-ok" },
  { id: "aaa", name: "Triple A (Calidad Alta)", badge: "badge-low" },
  { id: "g5", name: "G5 (Calidad Top)", badge: "badge-sale" },
  { id: "original", name: "Original", badge: "badge-ok" },
  { id: "euro", name: "Importado Euro", badge: "badge-ok" },
];

const API_URL = (() => {
  const origin = window.location.origin;

  // Mejoramos la lógica para producción pública
  if (origin.startsWith("file:")) return "http://192.168.1.8:3000/api";

  // Aseguramos que si estamos en producción, el API_URL coincida con el protocolo actual (http/https)
  const base = origin.replace(/\/$/, "");

  return `${base.replace(/\/$/, "")}/api`;
})();
window.API_URL = API_URL;

// --- START: Definiciones de Helpers Globales (movidas al inicio) ---

const LS = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem("winner_" + k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem("winner_" + k, JSON.stringify(v));
    } catch {}
  },
};
window.LS = LS;

const SS = {
  get: (k, d) => {
    try {
      const v = sessionStorage.getItem("winner_" + k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      sessionStorage.setItem("winner_" + k, JSON.stringify(v));
    } catch {}
  },
};
window.SS = SS;

const $ = (id) => document.getElementById(id);
const fmt = (n) => {
  const num = typeof n === "number" ? n : Number(n) || 0;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(num);
};
const nowStr = () => {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return fmt.format(d).replace(" ", "T") + "-05:00";
};
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
window.$ = $;
window.fmt = fmt;
window.formatPrice = fmt;
window.esc = esc;
window.genId = genId;
window.nowStr = nowStr;

function toast(msg, duration = 2800) {
  if ($("adminToastMsg")) $("adminToastMsg").textContent = msg;
  $("adminToast").classList.add("show");
  setTimeout(() => $("adminToast").classList.remove("show"), duration);
}
window.toast = toast;

const getApiKey = () => localStorage.getItem("w_api_key") || "dev-api-key";

const apiFetch = (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": getApiKey(),
    ...options.headers,
  };
  if (window.AUTH_TOKEN)
    headers["Authorization"] = `Bearer ${window.AUTH_TOKEN}`;
  return fetch(url, { ...options, headers }).then((res) => {
    if (res.status === 401) {
      // Si falla la API Key, la borramos para que en el próximo intento use la de desarrollo
      if (!headers["Authorization"]) {
        localStorage.removeItem("w_api_key");
      }

      if (typeof doLogout === "function") doLogout(true);

      // Identificar si es token o API Key
      const errorMsg = headers["Authorization"]
        ? "Su sesión ha expirado. Por favor inicie sesión de nuevo."
        : "Llave de acceso (API Key) no reconocida por el servidor.";

      return Promise.reject(new Error(errorMsg));
    }
    return res;
  });
};
window.apiFetch = apiFetch;

const totalStock = (p) =>
  p?.stock
    ? Object.values(p.stock).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0;
window.totalStock = totalStock;

const hasSizes = (cat) => getSizesForCategory(cat).length > 0;
window.hasSizes = hasSizes;

function stockStatus(t) {
  if (t <= 0) return { label: "Sin stock", cls: "badge-out", tbcls: "s-out" };
  if (t <= 5)
    return { label: "Stock crítico", cls: "badge-low", tbcls: "s-low" };
  return { label: "Disponible", cls: "badge-ok", tbcls: "s-ok" };
}
window.stockStatus = stockStatus;

function getSizesForCategory(cat) {
  const c = (cat || "").toLowerCase();
  // Calzado
  if (c.includes("calzado") || c.includes("tenis"))
    return [
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
    ];
  // Pantalones Dama
  if (c.includes("pantalón dama") || c.includes("jeans dama"))
    return ["6", "8", "10", "12", "14", "16"];
  // Pantalones Caballero
  if (c.includes("pantalón caballero") || c.includes("jeans caballero"))
    return ["28", "30", "32", "34", "36", "38"];
  // Ropa interior y Boxers
  if (c.includes("boxer") || c.includes("ropa interior"))
    return ["S", "M", "L", "XL"];
  // Talla Única (Accesorios, Relojes, Joyas, Lociones, Gorras)
  if (
    c.includes("accesorio") ||
    c.includes("reloj") ||
    c.includes("joya") ||
    c.includes("loción")
  )
    return ["U"];

  return SIZES;
}
window.getSizesForCategory = getSizesForCategory;

/**
 * Retorna la correspondencia de tallas para calzado
 * En Colombia, usualmente la talla Euro es +2 o +1 respecto a la Nacional.
 * @param {string} size Talla base (Nacional/Marcada)
 */
function getFootwearCorrespondence(sizeValue) {
  const num = parseInt(sizeValue);
  if (isNaN(num)) return { nal: sizeValue, euro: sizeValue };

  // Si la talla es > 30, asumimos que es marcación Euro (Estándar Triple A / G5)
  // El cliente en Colombia pide la nacional (Nal = Euro - 2)
  const nal = num - 2;
  const euro = num;
  return { nal, euro };
}
window.getFootwearCorrespondence = getFootwearCorrespondence;

function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
window.fmtDate = fmtDate;

function getPastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
window.getPastDate = getPastDate;

function getTodayStr() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
window.getTodayStr = getTodayStr;

// --- END: Definiciones de Helpers Globales ---

// --- START: Inicialización de variables globales que dependen de los helpers ---
window.inventory = window.inventory || [];
window.salesLog = window.salesLog || [];
window.AUTH_TOKEN = window.AUTH_TOKEN || null;
window.session = window.session || null;
window._invActiveCat = "all";
window._posActiveCat = "all";
window.payLog = LS.get("payLog", []); // Ahora LS está definido

window.defaultPayMethods = () => ({
  national: [
    {
      id: "wompi",
      name: "Wompi (Bancolombia)",
      icon: "💎",
      type: "Pasarela Unificada",
      enabled: true,
    },
  ],
  wallets: [
    {
      id: "wallets",
      name: "Billeteras Digitales",
      icon: "📱",
      type: "Nequi / Daviplata",
      enabled: false,
    },
  ],
  delivery: [
    {
      id: "cod",
      name: "Contra Entrega",
      icon: "🚚",
      type: "Físico / Logística",
      enabled: true,
    },
  ],
  intl: [
    {
      id: "intl",
      name: "Stripe / PayPal",
      icon: "🌎",
      type: "Internacional",
      enabled: false,
    },
  ],
});

// Limpieza de persistencia para forzar la nueva configuración de Wompi en el Admin Panel
if (!LS.get("payMethods", {}).national?.some((m) => m.id === "wompi")) {
  localStorage.removeItem("winner_payMethods");
}
window.payMethods = LS.get("payMethods", window.defaultPayMethods());

const WinnerApp = {
  state: { activePage: "dashboard" },
  pos: { cart: [], activeCategory: "all", selectedMethod: "Efectivo" },
};
window.WinnerApp = WinnerApp;

window.refreshAll = function () {
  if (typeof fetchInventory === "function") fetchInventory();
  if (typeof fetchSalesLog === "function") fetchSalesLog();
};

window.navigateTo = function (page) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".snav-item")
    .forEach((b) => b.classList.remove("active"));

  const pg = $("page-" + page);
  const btn = document.querySelector(`[data-page="${page}"]`);
  if (pg) pg.classList.add("active");
  if (btn) btn.classList.add("active");

  if ($("pageTitle")) $("pageTitle").textContent = page.toUpperCase();
  if ($("sidebar")) $("sidebar").classList.remove("mobile-open");

  if (page === "dashboard") {
    window.refreshAll();
    if (typeof renderDashboard === "function") renderDashboard();
  }
  if (page === "inventory" && typeof renderInventory === "function")
    renderInventory();
  if (page === "pos" && typeof renderPOSProducts === "function")
    renderPOSProducts();
  if (page === "expenses" && typeof renderExpenses === "function")
    renderExpenses();
  if (page === "payments") {
    if (typeof initPaymentsTab === "function") initPaymentsTab();
    else console.warn("Módulo de pagos no cargado");
  }
  if (page === "expenses") {
    if (typeof initExpensesTab === "function") initExpensesTab();
    else console.warn("Módulo de gastos no cargado");
  }
  if (page === "vip" && typeof loadVIPCustomersData === "function")
    loadVIPCustomersData();
  if (page === "layaway") {
    if (typeof fetchSalesLog === "function") fetchSalesLog();
  }
  if (page === "messaging" && typeof renderMessagingCenter === "function")
    renderMessagingCenter();
  if (page === "sales") {
    if (typeof fetchSalesLog === "function") fetchSalesLog();
    else console.warn("Módulo de ventas no cargado");
  }
};

window.toggleSidebar = () => $("sidebar").classList.toggle("mobile-open");

document.addEventListener("DOMContentLoaded", () => {
  const clockEl = $("topbarClock");
  if (clockEl) {
    const clockFormatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setInterval(() => {
      clockEl.textContent = clockFormatter.format(new Date());
    }, 1000);
  }

  // Verificación de sesión centralizada y segura
  const s = SS.get("session");
  if (s && s.token) {
    window.AUTH_TOKEN = s.token;
    window.session = s;
    // Pequeño delay para asegurar que auth.js y otros módulos cargaron
    setTimeout(() => {
      if (typeof window.showApp === "function") window.showApp();
    }, 50);
  }
});
