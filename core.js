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
  // Si se abre el archivo localmente (doble click al .html)
  if (origin.startsWith("file:")) {
    const savedIp = localStorage.getItem("w_server_ip") || "192.168.1.3";
    return `http://${savedIp}:3000/api`;
  }

  // Si el hostname incluye "ngrok.io" o "ngrok-free.app", forzamos HTTPS
  // Esto es crucial para que la cámara funcione en el móvil a través de Ngrok
  if (window.location.hostname.includes("ngrok.io") || window.location.hostname.includes("ngrok-free.app")) {
    return `https://${window.location.hostname}/api`;
  } else {
    // De lo contrario, usamos el origen actual (HTTP o HTTPS)
    const base = origin.replace(/\/$/, "");
    return `${base}/api`;
  }
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

const apiFetch = async (url, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": getApiKey(),
    ...options.headers,
  };

  // Inyectar token CSRF para métodos de escritura
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method) && window.csrfToken) {
    headers["X-CSRF-Token"] = window.csrfToken;
  }

  if (window.AUTH_TOKEN)
    headers["Authorization"] = `Bearer ${window.AUTH_TOKEN}`;

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Manejo global de cookies (Sesión y CSRF)
  }).then(async (res) => {
    if (res.status === 401) {
      // Si falla la API Key, la borramos para que en el próximo intento use la de desarrollo
      console.error("🔒 Sesión no autorizada o expirada");
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
    if (!res.ok) {
      // Intentar extraer el mensaje de error del JSON del servidor
      const errorData = await res.json().catch(() => ({}));
      const errorMsg =
        errorData.error ||
        errorData.message ||
        `Error ${res.status}: ${res.statusText}`;

      return Promise.reject(new Error(errorMsg));
    }
    return res;
  });
};
window.apiFetch = apiFetch;

/**
 * Obtiene el token CSRF inicial del servidor
 */
async function refreshCsrfToken() {
  try {
    const res = await fetch(`${window.API_URL}/get-csrf`, {
      credentials: "include",
    });
    const data = await res.json();
    window.csrfToken = data.csrfToken;
  } catch (e) {
    console.error("❌ No se pudo obtener el token CSRF");
  }
}

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

  // 1. CALZADO (Tenis, Zapatos)
  if (c.includes("calzado") || c.includes("tenis") || c.includes("zapato")) {
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
  }

  // 2. ROPA ELÁSTICA O SUPERIOR (Letras: S, M, L, XL...)
  // Los Leggings y Conjuntos suelen ser elásticos y se manejan por letras
  const isLetterSize =
    c.includes("camiseta") ||
    c.includes("hoodie") ||
    c.includes("legging") ||
    c.includes("conjunto") ||
    c.includes("set") ||
    c.includes("top") ||
    c.includes("blusa") ||
    c.includes("chaqueta") ||
    c.includes("saco") ||
    c.includes("buso") ||
    c.includes("oversize") ||
    c.includes("camisa") ||
    c.includes("polo") ||
    c.includes("sudadera") || // Sudadera ahora es Letra por defecto
    c.includes("boxer") ||
    c.includes("ropa interior") ||
    c.includes("lycra") ||
    c.includes("deportivo");

  if (isLetterSize) return ["XS", "S", "M", "L", "XL", "XXL"];

  // 3. PRENDAS INFERIORES RÍGIDAS (Números: 6, 8, 10... o 28, 30, 32...)
  // Joggers, Jeans, Cargo, Bermudas.
  // Importante: No debe ser un legging o conjunto (ya capturados arriba)
  const isNumericBottom =
    (c.includes("pantal") ||
      c.includes("jean") ||
      c.includes("jogger") ||
      c.includes("cargo") ||
      c.includes("bermuda")) &&
    !c.includes("legging") &&
    !c.includes("conjunto");

  if (isNumericBottom) {
    // Tallas Dama (6, 8, 10, 12, 14, 16)
    if (c.includes("dama") || c.includes("mujer") || c.includes("niña")) {
      return ["6", "8", "10", "12", "14", "16"];
    }
    // Tallas Caballero (28, 30, 32, 34, 36, 38)
    return ["28", "30", "32", "34", "36", "38"];
  }

  // 4. TALLA ÚNICA
  if (
    c.includes("accesorio") ||
    c.includes("reloj") ||
    c.includes("joya") ||
    c.includes("loción") ||
    c.includes("gorra") ||
    c.includes("gafa")
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
      id: "cash",
      name: "Efectivo",
      icon: "💵",
      type: "Tienda Física",
      enabled: true,
    },
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

  // Sincronizar estado de página activa
  if (window.WinnerApp) window.WinnerApp.state.activePage = page;

  // Control de visibilidad del botón de consulta flotante
  const floatBtn = $("payDistFloating");
  if (floatBtn) {
    floatBtn.style.display = (page === "dashboard") ? "flex" : "none";
  }

  // Control de visibilidad de la burbuja de escaneo rápido
  const scannerBubble = $("quickScanner");
  if (scannerBubble) {
    const isScannerActive = (page === "inventory" || page === "pos");
    scannerBubble.style.display = isScannerActive ? "flex" : "none";
    
    // Apagar cámara si navegamos fuera de las secciones permitidas
    if (!isScannerActive && typeof stopBubbleScanner === "function") {
      stopBubbleScanner();
      if ($("scanInfoCard")) $("scanInfoCard").classList.remove('active');
    }
  }

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
  if (page === "sessions" && typeof renderSessions === "function")
    renderSessions();
};

window.toggleSidebar = () => $("sidebar").classList.toggle("mobile-open");

document.addEventListener("DOMContentLoaded", async () => {
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

  // Obtener CSRF antes de cualquier otra cosa
  await refreshCsrfToken();

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

/* ══ LOGIC PARA BURBUJA DE ESCANEO RÁPIDO ══ */
let bubbleScanner = null;

window.toggleQuickScanner = async function() {
  const card = $("scanInfoCard");
  if (!card) return;
  
  const isActive = card.classList.toggle('active');
  
  if (isActive) {
    startBubbleScanner();
  } else {
    stopBubbleScanner();
  }
};

async function startBubbleScanner() {
  const content = $("scanBubbleContent");

  // Verificación de Seguridad: La cámara requiere HTTPS o Localhost
  if (!window.isSecureContext && window.location.hostname !== "localhost" && !window.location.hostname.includes("192.168.")) {
    content.innerHTML = `
      <div style="color:var(--red); font-size:10px; text-align:center; padding:10px; background:rgba(255,60,60,0.1); border-radius:8px;">
        <strong>⚠️ ERROR DE SSL</strong><br>
        El navegador bloquea la cámara en redes locales no seguras.<br>
        <button class="btn-ghost-sm" onclick="alert('Para solucionar:\\n1. En Chrome/Edge ve a: chrome://flags/#unsafely-treat-insecure-origin-as-secure\\n2. Agrega tu URL: http://${window.location.host}\\n3. Cambia a Enabled y reinicia.')" style="margin-top:5px; font-size:9px; color:var(--accent); border-color:var(--accent);">¿CÓMO SOLUCIONAR?</button>
      </div>
    `;
    return;
  }

  if (!bubbleScanner) {
    bubbleScanner = new Html5Qrcode("bubbleReader");
  }
  
  try {
    const config = { fps: 15, qrbox: { width: 150, height: 150 } };
    await bubbleScanner.start(
      { facingMode: "environment" }, 
      config, 
      (decodedText) => {
        handleQuickScanResult(decodedText);
      }
    );
  } catch (err) {
    content.innerHTML = `<p style="color:var(--red); font-size:10px; text-align:center;">Cámara no disponible o bloqueada</p>`;
  }
}

function stopBubbleScanner() {
  if (bubbleScanner && bubbleScanner.isScanning) {
    bubbleScanner.stop().catch(() => {});
  }
}

function handleQuickScanResult(code) {
  const product = (window.inventory || []).find(p => p.sku === code || p.id === code);
  const content = $("scanBubbleContent");
  
  if (product) {
    content.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; animation: fadeIn 0.3s;">
        <img src="${product.img}" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid var(--accent);">
        <div style="flex:1">
          <div style="font-weight:700; font-size:13px; color:white; margin-bottom:2px;">${product.name}</div>
          <div style="color:var(--accent); font-weight:800; font-size:16px;">${fmt(product.price)}</div>
          <div style="font-size:10px; color:var(--gray-text); text-transform:uppercase; letter-spacing:1px;">STOCK: ${totalStock(product)} und.</div>
        </div>
      </div>
    `;
    toast("Producto: " + product.name);
  } else {
    content.innerHTML = `<div style="text-align:center; color:var(--orange); font-size:11px; padding:10px; border:1px dashed var(--orange);">CÓDIGO: ${code}<br><strong>NO ENCONTRADO</strong></div>`;
  }
}

/* SOPORTE PARA ESCÁNER FÍSICO (HID SCANNER) */
let scanBuffer = "";
let lastKeyTime = Date.now();

document.addEventListener('keydown', (e) => {
  if (!e.key) return; // Evitar error si la tecla es indefinida

  const currentTime = Date.now();
  if (currentTime - lastKeyTime > 50) scanBuffer = ""; 
  lastKeyTime = currentTime;

  if (e.key === 'Enter') {
    if (scanBuffer.length > 2) {
      // Solo procesar escaneo físico si estamos en Inventario o POS
      const currentPage = window.WinnerApp?.state?.activePage;
      if (currentPage === "inventory" || currentPage === "pos") {
        if (!$("scanInfoCard").classList.contains('active')) window.toggleQuickScanner();
        handleQuickScanResult(scanBuffer);
        e.preventDefault();
      }
      scanBuffer = "";
    }
  } else if (e.key.length === 1) {
    scanBuffer += e.key;
  }
});

/* ══ AUDITORÍA DE SESIONES ══ */
async function renderSessions() {
  const sessionsTableBody = $("activeSessionsTableBody");
  if (!sessionsTableBody) return;

  sessionsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Cargando sesiones activas...</td></tr>';

  try {
    const res = await apiFetch(`${window.API_URL}/admin/sessions`);
    const sessions = await res.json();

    if (!Array.isArray(sessions)) {
      console.error("API /admin/sessions did not return an array:", sessions);
      throw new Error("Respuesta inválida del servidor para sesiones.");
    }

    if (sessions.length === 0) {
      sessionsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay sesiones activas.</td></tr>';
      return;
    }

    sessionsTableBody.innerHTML = sessions.map(session => `
      <tr>
        <td>${esc(session.username)} (${esc(session.role)})</td>
        <td>${esc(session.ipAddress)}</td>
        <td>${esc(session.userAgent || 'Desconocido')}</td>
        <td>${fmtDate(session.loginTime)}</td>
        <td>${fmtDate(session.lastActivity)}</td>
        <td>
          <button class="action-btn del" onclick="revokeSession('${session.id}')" title="Revocar sesión">
            ✕
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error("Error al cargar sesiones activas:", error);
    sessionsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6" style="color:var(--red);">Error al cargar sesiones: ${esc(error.message)}</td></tr>`;
  }
}
window.renderSessions = renderSessions;

async function revokeSession(sessionId) {
  if (!confirm("¿Estás seguro de que quieres revocar esta sesión? El usuario será desconectado.")) {
    return;
  }

  try {
    const res = await apiFetch(`${window.API_URL}/admin/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      toast("Sesión revocada con éxito.");
      renderSessions(); // Refrescar la lista de sesiones
    } else {
      toast(`Error: ${data.error || "No se pudo revocar la sesión."}`);
    }
  } catch (error) {
    console.error("Error al revocar sesión:", error);
    toast(`Error de conexión: ${error.message}`);
  }
}
window.revokeSession = revokeSession;
