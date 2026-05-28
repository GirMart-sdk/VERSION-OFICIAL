/* ═══════════════════════════════════════════════════════
   WINNER — core.js (Motor Global Consolidado)
   ═══════════════════════════════════════════════════════ */
"use strict";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "U"];
const API_URL = (() => {
  const origin = window.location.origin;

  // Si se abre como archivo local, usamos el puerto 3000 por defecto.
  // En cualquier otro caso (localhost con cualquier puerto o producción), usamos el origin actual.
  const base = origin.startsWith("file:") ? "http://localhost:3000" : origin;

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

const $ = (id) => document.getElementById(id);
const fmt = (n) => "$" + Number(n).toLocaleString("es-CO");
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
      if (typeof doLogout === "function") doLogout(true);
      return Promise.reject("Sesión expirada");
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
  if (t === 0) return { label: "Sin stock", cls: "badge-out", tbcls: "s-out" };
  if (t <= 50)
    return { label: "Stock crítico", cls: "badge-low", tbcls: "s-low" };
  return { label: "Disponible", cls: "badge-ok", tbcls: "s-ok" };
}
window.stockStatus = stockStatus;

function getSizesForCategory(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("calzado"))
    return ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43"];
  if (c.includes("accesorio") || c === "otros") return [];
  return SIZES;
}
window.getSizesForCategory = getSizesForCategory;

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
      id: "payu",
      name: "PayU Latam (PSE/Tarjetas)",
      icon: "🟢",
      type: "Nacional",
      enabled: true,
    },
    {
      id: "addi",
      name: "Addi (3 Cuotas 0%)",
      icon: "💸",
      type: "Financiamiento",
      enabled: true,
    },
    {
      id: "sistecredito",
      name: "Sistecredito",
      icon: "🔵",
      type: "Financiamiento",
      enabled: true,
    },
  ],
  wallets: [
    {
      id: "epayco",
      name: "ePayco (Nequi/Daviplata)",
      icon: "📱",
      type: "Billetera",
      enabled: true,
    },
    {
      id: "qr_tienda",
      name: "QR Winner (Directo)",
      icon: "🔳",
      type: "Tienda Física",
      enabled: true,
    },
  ],
  delivery: [
    {
      id: "cod",
      name: "Contra Entrega",
      icon: "🚚",
      type: "Logística",
      enabled: true,
    },
  ],
  intl: [
    {
      id: "paypal",
      name: "PayPal",
      icon: "🌎",
      type: "Internacional",
      enabled: false,
    },
    {
      id: "stripe",
      name: "Stripe",
      icon: "💳",
      type: "Internacional",
      enabled: false,
    },
  ],
});

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
  if (page === "payments") {
    if (typeof renderPayMethods === "function") renderPayMethods();
    if (typeof renderPaymentsTable === "function") renderPaymentsTable();
  }
  if (page === "vip" && typeof loadVIPCustomersData === "function")
    loadVIPCustomersData();
  if (page === "layaway" && typeof renderLayawaySales === "function")
    renderLayawaySales();
  if (page === "messaging" && typeof renderMessagingCenter === "function")
    renderMessagingCenter();
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
  const s = LS.get("session");
  if (s && s.token) {
    window.AUTH_TOKEN = s.token;
    window.session = s;
    // Pequeño delay para asegurar que auth.js y otros módulos cargaron
    setTimeout(() => {
      if (typeof window.showApp === "function") window.showApp();
    }, 50);
  }
});
