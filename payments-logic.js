/* ═══════════════════════════════════════════════════════
   WINNER — payments-logic.js (Módulo de Pagos)
   ═══════════════════════════════════════════════════════ */
"use strict";

const PAYMENT_METHODS_CONFIG = [
  {
    id: "wompi",
    name: "Wompi (Bancolombia)",
    desc: "Pasarela de pagos online",
    features: ["PSE / Tarjetas", "Nequi / Bancolombia"],
    type: "national",
  },
  {
    id: "cod",
    name: "Contra entrega (COD)",
    desc: "Pago al recibir pedido",
    features: ["Efectivo en destino", "Mensajería local"],
    type: "delivery",
  },
  {
    id: "wallets",
    name: "Billeteras Digitales",
    desc: "Transferencias directas",
    features: ["Nequi / Daviplata", "Botón de pago"],
    type: "digital",
  },
  {
    id: "intl",
    name: "Internacional",
    desc: "Stripe / PayPal",
    features: ["Tarjetas Globales", "USD / EUR"],
    type: "intl",
  },
];

async function initPaymentsTab() {
  // Si no hay datos de ventas cargados, los traemos para poder mostrar el historial
  if (!window.allSalesData || window.allSalesData.length === 0) {
    if (typeof fetchSalesLog === "function") await fetchSalesLog();
  }

  renderPaymentMethodsCards();
  syncAndRenderPayments();

  // Setup Listeners
  $("applyPayFilters")?.addEventListener("click", syncAndRenderPayments);
  $("resetPayFilters")?.addEventListener("click", () => {
    [
      "payFilterChannel",
      "payFilterMethod",
      "payFilterClient",
      "paySearch",
    ].forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });
    syncAndRenderPayments();
  });
}

function renderPaymentMethodsCards() {
  const container = $("paymentMethodsGrid");
  if (!container) return;

  container.innerHTML = PAYMENT_METHODS_CONFIG.map((m) => {
    // Buscamos el estado real en el objeto global de core.js
    const section =
      window.payMethods[
        m.type === "national"
          ? "national"
          : m.type === "delivery"
            ? "delivery"
            : m.type === "digital"
              ? "wallets"
              : "intl"
      ];
    const methodData = section?.find((x) => x.id === m.id) || {
      enabled: false,
    };
    const isEnabled = methodData.enabled;

    return `
      <div class="payment-method-card ${isEnabled ? "enabled" : ""}">
        <div class="method-header">
          <span class="method-name">${m.name}</span>
          <span class="method-badge">${isEnabled ? "ACTIVO" : "INACTIVO"}</span>
        </div>
        <div class="method-details">
          <p>${m.desc}</p>
          <ul>${m.features.map((f) => `<li><span style="color:var(--accent)">✓</span> ${f}</li>`).join("")}</ul>
        </div>
        <div class="method-toggle" style="text-align:right">
          <button class="toggle-switch small ${isEnabled ? "on" : ""}" 
            onclick="togglePaymentMethodAdmin('${m.type}', '${m.id}')"></button>
        </div>
      </div>
    `;
  }).join("");
}

window.togglePaymentMethodAdmin = (type, id) => {
  const sectionKey =
    type === "national"
      ? "national"
      : type === "delivery"
        ? "delivery"
        : type === "digital"
          ? "wallets"
          : "intl";
  const method = window.payMethods[sectionKey]?.find((m) => m.id === id);

  if (method) {
    method.enabled = !method.enabled;
    // Persistir en LocalStorage (core.js lo leerá al recargar)
    LS.set("payMethods", window.payMethods);

    toast(`${method.name} ${method.enabled ? "activado" : "desactivado"}`);
    renderPaymentMethodsCards();
    // Refrescar el POS si está abierto
    if (typeof renderPOSProducts === "function") renderPOSProducts();
  }
};

function syncAndRenderPayments() {
  const sales = window.allSalesData || [];

  const channel = $("payFilterChannel")?.value;
  const method = $("payFilterMethod")?.value;
  const client = $("payFilterClient")?.value.toLowerCase();
  const search = $("paySearch")?.value.toLowerCase();

  const filtered = sales.filter((s) => {
    if (channel && s.channel !== channel) return false;
    if (method && s.method !== method) return false;
    if (client && !s.client.toLowerCase().includes(client)) return false;
    if (search && !s.id.toLowerCase().includes(search)) return false;
    return true;
  });

  renderPaymentsKPIs(filtered);
  renderGroupedTransactions(filtered);
  updateMethodFilterOptions(sales);
}

function renderPaymentsKPIs(data) {
  const total = data.reduce((s, x) => s + x.total, 0);
  const online = data
    .filter((x) => x.channel === "online")
    .reduce((s, x) => s + x.total, 0);
  const physical = total - online;
  const avg = data.length ? total / data.length : 0;
  const onlinePct = total ? (online / total) * 100 : 0;

  if ($("kpiPayTotalAmount")) $("kpiPayTotalAmount").innerText = fmt(total);
  if ($("kpiPayTotalCount"))
    $("kpiPayTotalCount").innerText = `${data.length} ventas`;
  if ($("kpiPayOnlineAmount")) $("kpiPayOnlineAmount").innerText = fmt(online);
  if ($("kpiPayOnlinePercent"))
    $("kpiPayOnlinePercent").innerText = `${onlinePct.toFixed(0)}%`;
  if ($("kpiPayPhysicalAmount"))
    $("kpiPayPhysicalAmount").innerText = fmt(physical);
  if ($("kpiPayPhysicalPercent"))
    $("kpiPayPhysicalPercent").innerText = `${(100 - onlinePct).toFixed(0)}%`;
  if ($("kpiPayAvgTicket"))
    $("kpiPayAvgTicket").innerText = fmt(Math.round(avg));
}

function renderGroupedTransactions(data) {
  const container = $("transactionsGroupedContainer");
  if (!container) return;

  if (!data.length) {
    container.innerHTML =
      '<div class="ls-empty">No hay transacciones registradas</div>';
    return;
  }

  // Agrupar (tolerar timestamp faltante)
  const groups = {};
  data.forEach((s) => {
    const ts =
      (typeof s?.timestamp === "string" && s.timestamp && s.timestamp) ||
      (typeof s?.createdAt === "string" && s.createdAt && s.createdAt) ||
      "";
    if (!ts) return;

    const date = ts.split("T")[0];
    if (!groups[date]) groups[date] = { total: 0, items: [] };
    groups[date].items.push(s);
    groups[date].total += s.total;
  });

  container.innerHTML = Object.keys(groups)
    .sort()
    .reverse()
    .map((date) => {
      const g = groups[date];
      const dObj = new Date(date + "T12:00:00");
      const label = dObj.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      return `
      <div class="transactions-group">
        <div class="day-divider" style="cursor:pointer; background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--border)" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span style="font-family:'Bebas Neue'; letter-spacing:2px;">📅 ${label.toUpperCase()}</span>
          <span style="color:var(--accent); font-weight:700;">${fmt(g.total)} — ${g.items.length} ventas ▾</span>
        </div>
        <div class="table-wrap hidden" style="border:none">
          <table class="data-table">
            <tbody>
              ${g.items
                .map(
                  (s) => `
                <tr class="activity-item">
                  <td style="width:60px; font-family:monospace; color:var(--gray-text)">#${s.id.slice(-4)}</td>
                  <td style="font-weight:700">${esc(s.client)}</td>
                  <td><span class="tx-method" style="background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px; font-size:10px;">${s.method}</span></td>
                  <td style="color:var(--accent); font-weight:800">${fmt(s.total)}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px;">
                      <span class="status-dot ${s.payment_status === "completed" ? "delivered" : "pending"}" style="width:8px; height:8px; border-radius:50%; background:${s.payment_status === "completed" ? "#2ecc71" : "#f1c40f"}"></span>
                      ${s.payment_status === "completed" ? "Entregado" : "Pendiente"}
                    </div>
                  </td>
                  <td style="text-align:right"><button class="action-btn" onclick="viewSaleDetails('${s.id}')">🔗</button></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    })
    .join("");
}

function updateMethodFilterOptions(sales) {
  const select = $("payFilterMethod");
  if (!select || select.options.length > 1) return;
  const methods = [...new Set(sales.map((s) => s.method))];
  methods.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = m;
    select.appendChild(opt);
  });
}

window.initPaymentsTab = initPaymentsTab;
