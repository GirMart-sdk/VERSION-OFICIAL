/* ═══════════════════════════════════════════════════════
   WINNER — sales-logic.js (Módulo de Analítica)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.allSalesData = [];
window.salesCharts = {};

async function fetchSalesLog() {
  try {
    const res = await apiFetch(`${API_URL}/sales`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    window.allSalesData = data.map((s) => ({
      ...s,
      total: Number(s.total) || 0, // Evitar NaN
      total_paid: Number(s.total_paid) || 0, // Evitar NaN
      channel: s.channel || (s.id.startsWith("ON") ? "online" : "fisica"),
    }));

    // Sincronizar con la variable global que usan otros módulos (WhatsApp Center)
    window.salesLog = [...window.allSalesData];

    renderSalesKPIs();
    renderSalesCharts();
    renderSalesTable();
    
    // Notificar al módulo de caja que los datos de ventas han cambiado
    if (typeof updateCashUI === 'function') updateCashUI();

    if (typeof renderLayawaySales === "function") renderLayawaySales();
  } catch (e) {
    console.error("Error fetching sales:", e);
  }
}

function renderSalesKPIs() {
  const from = $("filterDateFrom")?.value;
  const to = $("filterDateTo")?.value;
  let filtered = applyDateFilter(window.allSalesData, from, to);

  const totalAmount = filtered.reduce((sum, s) => sum + s.total, 0);
  const onlineSales = filtered.filter((s) => s.channel === "online");
  const onlineAmount = onlineSales.reduce((sum, s) => sum + s.total, 0);
  const physicalAmount = totalAmount - onlineAmount;
  const avgTicket = filtered.length ? totalAmount / filtered.length : 0;

  if ($("kpiTotalAmount")) $("kpiTotalAmount").innerText = fmt(totalAmount);
  if ($("kpiTotalCount"))
    $("kpiTotalCount").innerText = `${filtered.length} ventas`;
  if ($("kpiOnlineAmount")) $("kpiOnlineAmount").innerText = fmt(onlineAmount);
  if ($("kpiPhysicalAmount"))
    $("kpiPhysicalAmount").innerText = fmt(physicalAmount);
  if ($("kpiAvgTicket"))
    $("kpiAvgTicket").innerText = fmt(Math.round(avgTicket));

  const onlinePercent = totalAmount ? (onlineAmount / totalAmount) * 100 : 0;
  if ($("kpiOnlinePercent"))
    $("kpiOnlinePercent").innerText = `${onlinePercent.toFixed(0)}%`;
  if ($("kpiPhysicalPercent"))
    $("kpiPhysicalPercent").innerText = `${(100 - onlinePercent).toFixed(0)}%`;
}

function renderSalesCharts() {
  const from = $("filterDateFrom")?.value;
  const to = $("filterDateTo")?.value;
  let filtered = applyDateFilter(window.allSalesData, from, to);

  // 1. Gráfico de Línea de Tiempo (tolerar timestamp faltante)
  const timelineData = {};
  filtered.forEach((s) => {
    const ts =
      (typeof s.timestamp === "string" && s.timestamp) ||
      (typeof s.createdAt === "string" && s.createdAt) ||
      "";
    if (!ts) return;

    const d = ts.split("T")[0];
    timelineData[d] = (timelineData[d] || 0) + s.total;
  });

  const sortedLabels = Object.keys(timelineData).sort();
  updateChart("salesTimelineChart", "bar", {
    labels: sortedLabels.map((l) => l.split("-").slice(1).join("/")),
    datasets: [
      {
        label: "Ventas",
        data: sortedLabels.map((l) => timelineData[l]),
        backgroundColor: "#e8ff47",
      },
    ],
  });

  // 2. Gráfico de Canales
  const channelData = { online: 0, fisica: 0 };
  filtered.forEach((s) => channelData[s.channel]++);
  updateChart("salesChannelChart", "doughnut", {
    labels: ["Física", "Online"],
    datasets: [
      {
        data: [channelData.fisica, channelData.online],
        backgroundColor: ["#3498db", "#e8ff47"],
      },
    ],
  });

  // 3. Gráfico de Métodos de Pago
  const methodTotals = {};
  filtered.forEach((s) => {
    methodTotals[s.method] = (methodTotals[s.method] || 0) + s.total;
  });
  const sortedMethods = Object.entries(methodTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  updateChart("salesMethodChart", "bar", {
    labels: sortedMethods.map((m) => m[0]),
    datasets: [
      {
        label: "Total ($)",
        data: sortedMethods.map((m) => m[1]),
        backgroundColor: "#3498db",
      },
    ],
  });

  // Actualizar métodos en el filtro
  const methodSelect = $("filterMethod");
  if (methodSelect && methodSelect.options.length <= 1) {
    const methods = [...new Set(window.allSalesData.map((s) => s.method))];
    methods.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      methodSelect.appendChild(opt);
    });
  }
}

function updateChart(id, type, data) {
  const ctx = $(id)?.getContext("2d");
  if (!ctx) return;
  if (window.salesCharts[id]) window.salesCharts[id].destroy();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#fff" } } },
  };

  // Usar eje Y para métodos de pago (barras horizontales)
  if (id === "salesMethodChart") options.indexAxis = "y";

  window.salesCharts[id] = new Chart(ctx, {
    type,
    data,
    options,
  });
}

function applyDateFilter(data, from, to) {
  if (!from && !to) return data;
  return data.filter((s) => {
    const ts =
      (typeof s.timestamp === "string" && s.timestamp) ||
      (typeof s.createdAt === "string" && s.createdAt) ||
      "";
    if (!ts) return false;

    const day = ts.split("T")[0];
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

function getSaleTimestamp(s) {
  const ts =
    (typeof s?.timestamp === "string" && s.timestamp && s.timestamp) ||
    (typeof s?.createdAt === "string" && s.createdAt && s.createdAt) ||
    (s?.timestamp instanceof Date ? s.timestamp.toISOString() : "") ||
    "";
  return ts || "";
}

function renderSalesTable() {
  const channel = $("filterChannel")?.value;
  const method = $("filterMethod")?.value;
  const search = $("filterClient")?.value.toLowerCase();
  const logistics = $("filterLogistics")?.value;
  const from = $("filterDateFrom")?.value;
  const to = $("filterDateTo")?.value;

  let filtered = applyDateFilter(window.allSalesData, from, to);
  if (channel) filtered = filtered.filter((s) => s.channel === channel);
  if (method) filtered = filtered.filter((s) => s.method === method);

  if (logistics) {
    filtered = filtered.filter((s) => {
      let d = s.payment_details || {};
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch (e) {
          d = {};
        }
      }
      return (d.shipping_status || "PENDIENTE") === logistics;
    });
  }

  if (search)
    filtered = filtered.filter((s) => s.client.toLowerCase().includes(search));

  const container = $("salesGroupedContainer");
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">No se encontraron ventas con los filtros seleccionados</div>';
    return;
  }

  // Excluir ventas sin timestamp (evita crash)
  filtered = filtered.filter((s) => !!getSaleTimestamp(s));

  // Ordenar por fecha descendente
  filtered.sort((a, b) => new Date(getSaleTimestamp(b)) - new Date(getSaleTimestamp(a)));

  // Agrupar por fecha
  const groups = {};
  filtered.forEach((s) => {
    const date = getSaleTimestamp(s).split("T")[0];
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
            <thead>
              <tr>
                <th>HORA</th>
                <th>CANAL</th>
                <th>CLIENTE</th>
                <th>MÉTODO</th>
                <th>ESTADO</th>
                <th>TOTAL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${g.items
                .map((s) => {
                  let details = s.payment_details || {};
                  if (typeof details === "string")
                    try {
                      details = JSON.parse(details);
                    } catch (e) {
                      details = {};
                    }
                  const shipStatus = details.shipping_status || "PENDIENTE";
                  const ts = getSaleTimestamp(s);
                  const time = ts
                    ? new Date(ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--";

                  return `
                  <tr class="activity-item">
                    <td style="font-size:11px; white-space:nowrap; color:var(--gray-text)">${time}</td>
                    <td>
                      <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="status-badge s-${s.channel}" style="width:fit-content; font-size:9px;">${s.channel === "online" ? "📦 Envío" : "🏪 Física"}</span>
                        ${s.channel === "online" ? `<span style="font-size:8px; color:var(--gray-text); opacity:0.7;">${shipStatus}</span>` : ""}
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:white; font-size:13px;">${esc(s.client)}</div>
                      <div style="font-size:10px; color:var(--gray-text);">${s.customer_phone || ""}</div>
                    </td>
                    <td style="font-size:11px; color:var(--gray-text);">${s.method}</td>
                    <td>
                      <span class="status-badge ${s.payment_status === "completed" ? "s-ok" : "s-low"}" style="font-size:9px;">${(s.payment_status || "pending").toUpperCase()}</span>

                    </td>
                    <td style="color:var(--accent); font-weight:700;">${fmt(s.total)}</td>
                    <td style="text-align:right;">
                      <button class="action-btn" onclick="viewSaleDetails('${s.id}')">🔗</button>
                    </td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");
}

window.viewSaleDetails = (id) => {
  const sale = window.allSalesData.find((x) => x.id === id);
  if (!sale) return;

  let details = sale.payment_details || {};
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch (e) {
      details = {};
    }
  }

  const shipStatus = details.shipping_status || "PENDIENTE";
  const trackingNum = details.tracking_number || "";
  const paid = Number(sale.total_paid || 0);
  const balance = Math.max(0, sale.total - paid);
  const isDone = balance <= 0;

  let overlay = $("saleDetailsOverlay");
  let modal = $("saleDetailsModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "saleDetailsOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = window.closeSaleDetails;
    document.body.appendChild(overlay);
  }
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "saleDetailsModal";
    modal.className = "modal";
    modal.style.maxWidth = "600px";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>GESTIÓN DE SEPARADOS — Venta #${sale.id.slice(-6)}</h3>
      <button class="modal-close" onclick="window.closeSaleDetails()">✕</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:20px; font-size:13px; color:var(--gray-text)">
        <strong>Cliente:</strong> <span style="color:white">${esc(sale.client)}</span><br>
        <strong>Canal:</strong> <span style="color:white">${sale.channel.toUpperCase()}</span><br>
        <strong>Dirección:</strong> <span style="color:white">${esc(sale.shipping_address || "Mostrador / Sin envío")}</span>
      </div>

      <!-- RESUMEN FINANCIERO DEL SEPARADO -->
      <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid var(--border)">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
          <span>Total de la Venta:</span> <span style="font-weight:700; color:white;">${fmt(sale.total)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px; color:var(--green)">
          <span>Total Abonado:</span> <span style="font-weight:700">${fmt(paid)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top: 8px; margin-top:8px; color:var(--orange)">
          <span style="font-size:12px; align-self:center;">Saldo Pendiente:</span> 
          <div style="text-align:right">
            <span style="font-weight:800; font-size:18px;">${fmt(balance)}</span>
            ${!isDone ? `<br><button class="btn-accent" style="font-size:9px; padding:2px 8px; margin-top:5px;" onclick="window.openLayawayPayment('${sale.id}'); window.closeSaleDetails();">➕ REGISTRAR ABONO</button>` : ""}
          </div>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:15px">
        <label>Estado del Separado</label>
        <select id="editShipStatus" class="tb-select" style="width:100%; background:var(--dark);">
          <option value="ABONO" ${shipStatus === "ABONO" ? "selected" : ""}>ABONO (Pendiente)</option>
          <option value="PAGADO" ${shipStatus === "PAGADO" ? "selected" : ""}>PAGADO</option>
          <option value="ENTREGADO" ${shipStatus === "ENTREGADO" ? "selected" : ""}>ENTREGADO (Finalizado)</option>
          <option value="CANCELADO" ${shipStatus === "CANCELADO" ? "selected" : ""}>CANCELADO</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom:15px">
        <label>Número de Guía / Tracking</label>
        <input type="text" id="editTrackingNum" value="${trackingNum}" placeholder="Ej: 12345678" style="width:100%">
      </div>

      <p style="font-size:11px; color:var(--gray-text); margin-top:10px; border-top:1px solid var(--border); padding-top:10px;">
        💡 <strong>Info:</strong> Si marcas como 'ENTREGADO', el sistema cerrará automáticamente el saldo de la venta si estaba pendiente.
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="window.closeSaleDetails()">Cerrar</button>
      <button class="btn-accent" onclick="window.applyLogisticsChanges('${sale.id}', this)">GUARDAR LOGÍSTICA</button>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.closeSaleDetails = () => {
  $("saleDetailsOverlay")?.classList.remove("open");
  $("saleDetailsModal")?.classList.remove("open");
};

window.applyLogisticsChanges = async (saleId, btn) => {
  const newStatus = $("editShipStatus").value;
  const newTracking = $("editTrackingNum").value.trim();

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⌛ Guardando...";

  try {
    const res = await apiFetch(`${API_URL}/sales/${saleId}`, {
      method: "PATCH",
      body: JSON.stringify({
        payment_details: {
          shipping_status: newStatus,
          tracking_number: newTracking,
        },
      }),
    });

    if (res.ok) {
      toast("✅ Estado de logística actualizado");
      window.closeSaleDetails();
      fetchSalesLog(); // Recargar datos y refrescar UI
    } else {
      const err = await res.json();
      toast("❌ Error: " + err.error);
    }
  } catch (e) {
    toast("❌ Error al procesar solicitud");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

// ── PRODUCTOS SEPARADOS (LAYAWAY) ──
window.layawayFilter = "pending";

window.setLayawayFilter = (f) => {
  window.layawayFilter = f;
  document
    .querySelectorAll("#page-layaway .ph-tab")
    .forEach((btn) => btn.classList.remove("active"));
  if (f === "pending") $("layawayTabPending")?.classList.add("active");
  if (f === "completed") $("layawayTabCompleted")?.classList.add("active");
  if (f === "all") $("layawayTabAll")?.classList.add("active");
  renderLayawaySales();
};

window.renderLayawaySales = () => {
  const container = $("layawayTableBody");
  if (!container) return;

  const sort = $("layawaySortSelect")?.value || "newest";

  let filtered = window.allSalesData.filter((s) => {
    // Un "separado" es cualquier venta con la marca 'isLayaway' en sus detalles.
    const details = typeof s.payment_details === 'string' ? JSON.parse(s.payment_details || '{}') : (s.payment_details || {});
    if (!details.isLayaway) return false;

    // Filtrar por estado pendiente o completado
    const isPending = s.payment_status === "partial" || s.payment_status === "pending";
    const isCompleted = s.payment_status === "completed";

    if (window.layawayFilter === "pending") return isPending;
    if (window.layawayFilter === "completed") return isCompleted;
    return isPending || isCompleted;
  });

  // Ordenamiento
  if (sort === "newest")
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (sort === "oldest")
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (sort === "balance")
    filtered.sort(
      (a, b) => b.total - (b.total_paid || 0) - (a.total - (a.total_paid || 0)),
    );

  if (filtered.length === 0) {
    container.innerHTML = `<tr class="empty-row"><td colspan="7">No hay productos separados ${window.layawayFilter === "pending" ? "pendientes" : ""}</td></tr>`;
    updateLayawayKPIs([]);
    return;
  }

  container.innerHTML = filtered
    .map((s) => {
      const paid = s.total_paid || 0;
      const balance = Math.max(0, s.total - paid);
      const date = new Date(s.timestamp);
      const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
      const isDone = balance <= 0;

      return `
      <tr style="${isDone ? "background: rgba(46, 204, 113, 0.05);" : ""}">
        <td style="font-size:11px;">${date.toLocaleDateString()}</td>
        <td>
          <div style="font-weight:700">${esc(s.client)} ${isDone ? '<span title="Pago Completo">✅</span>' : ""}</div>
          <div style="font-size:10px; color:var(--gray-text)">${s.id}</div>
        </td>
        <td>
          <span class="status-badge ${isDone ? "s-ok" : days > 30 ? "s-out" : "s-ok"}" style="font-size:10px;">
            ${isDone ? "PAGADO" : days + " días"}
          </span>
        </td>
        <td style="font-weight:600;">${fmt(s.total)}</td>
        <td style="color:var(--green); font-weight:600;">${fmt(paid)}</td>
        <td style="color:${isDone ? "var(--gray-text)" : "var(--orange)"}; font-weight:700;">${fmt(balance)}</td>
        <td style="display:flex; gap:5px;">
          ${
            !isDone
              ? `
            <button class="action-btn" onclick="openLayawayPayment('${s.id}')" title="Registrar Abono">💰</button>
          `
              : ""
          }
          <button class="action-btn" onclick="viewSaleDetails('${s.id}')" title="Gestión de Separados">🔗</button>
        </td>
      </tr>`;
    })
    .join("");

  updateLayawayKPIs(filtered);
};

function updateLayawayKPIs(data) {
  const totalSales = data.length;
  const totalCollected = data.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const totalPending = data.reduce(
    (sum, s) => sum + (s.total - (s.total_paid || 0)),
    0,
  );

  if ($("sepTotalSales")) $("sepTotalSales").innerText = totalSales;
  if ($("sepTotalCollected"))
    $("sepTotalCollected").innerText = fmt(totalCollected);
  if ($("sepTotalPending")) $("sepTotalPending").innerText = fmt(totalPending);
}

window.openLayawayPayment = (saleId) => {
  const sale = window.allSalesData.find(x => x.id === saleId);
  if (!sale) return;

  const currentBalance = sale.total - (sale.total_paid || 0);

  // Crear un modal personalizado en lugar de usar prompt()
  let overlay = document.getElementById("paymentModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "paymentModalOverlay";
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }

  let modal = document.getElementById("paymentModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "paymentModal";
    modal.className = "modal";
    modal.style.maxWidth = "400px";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>💸 Registrar Abono</h3>
      <button class="modal-close" onclick="closeLayawayPaymentModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:12px; color:var(--gray-text)">Venta #${sale.id.slice(-6).toUpperCase()}</p>
      <p>Saldo pendiente: <strong style="color:var(--orange)">${fmt(currentBalance)}</strong></p>
      <div class="form-group">
        <label for="abonoAmountInput">Monto del Abono (COP)</label>
        <input type="number" id="abonoAmountInput" value="${currentBalance}" style="width:100%; font-size:18px; text-align:center;">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closeLayawayPaymentModal()">Cancelar</button>
      <button class="btn-accent" onclick="submitLayawayPayment('${sale.id}')">CONFIRMAR ABONO</button>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
  document.getElementById("abonoAmountInput").focus();
};

window.closeLayawayPaymentModal = () => {
  document.getElementById("paymentModalOverlay")?.classList.remove("open");
  document.getElementById("paymentModal")?.classList.remove("open");
};

window.submitLayawayPayment = async (saleId) => {
  const sale = window.allSalesData.find(x => x.id === saleId);
  if (!sale) return;

  const amount = document.getElementById("abonoAmountInput").value;
  
  if (amount === null || isNaN(amount) || Number(amount) <= 0) return;
  try {
    // The backend expects a more complete payload for PATCH requests.
    // We'll merge the new payment with existing payment_details.
    const existingDetails =
      typeof sale.payment_details === "string"
        ? JSON.parse(sale.payment_details || "{}")
        : sale.payment_details || {};

    const res = await apiFetch(`${API_URL}/sales/${saleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": window.csrfToken,
      },
      body: JSON.stringify({
        total_paid: (Number(sale.total_paid) || 0) + Number(amount),
        payment_details: {
          ...existingDetails,
          last_abono: Number(amount),
          last_abono_date: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      toast("✅ Abono registrado");
      window.closeLayawayPaymentModal();
      fetchSalesLog(); // Refresca toda la data
      if (typeof window.renderDashboard === "function") window.renderDashboard();
    } else {
      toast("❌ Error al registrar abono. Revisa la conexión.");
    }
  } catch (e) {
    toast("❌ Error de red");
  }
};

// Event Listeners
$("applySalesFilters")?.addEventListener("click", () => {
  renderSalesKPIs();
  renderSalesCharts();
  renderSalesTable();
});
