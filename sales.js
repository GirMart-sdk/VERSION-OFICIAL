/* ═══════════════════════════════════════════════════════
   WINNER — sales.js (Registro de Ventas & VIP)
   ═══════════════════════════════════════════════════════ */

let _salesTimeRange = "today";

async function fetchSalesLog() {
  try {
    const res = await apiFetch(`${API_URL}/sales`);
    window.salesLog = await res.json();
    renderSalesTable();
    renderLayawaySales();
  } catch (e) {
    console.error("Error sales:", e);
  }
}

window.setSalesTimeFilter = (range) => {
  _salesTimeRange = range;
  const container = document.querySelector("#page-sales .phc-quick-filters");
  if (container) {
    container.querySelectorAll(".ph-tab").forEach((btn) => {
      const label = btn.textContent.toLowerCase();
      const isActive =
        (range === "today" && label.includes("hoy")) ||
        (range === "yesterday" && label.includes("ayer")) ||
        (range === "week" && label.includes("semana")) ||
        (range === "month" && label.includes("mes")) ||
        (range === "all" && label.includes("todo"));
      btn.classList.toggle("active", isActive);
    });
  }
  if (range !== "custom") {
    const sfDate = $("sfDate");
    if (sfDate) sfDate.value = "";
  }
  renderSalesTable();
};

window.resetSalesFilters = () => {
  if ($("sfDate")) $("sfDate").value = "";
  if ($("sfMethod")) $("sfMethod").value = "";
  if ($("sfChannel")) $("sfChannel").value = "";
  if ($("sfShippingStatus")) $("sfShippingStatus").value = "";
  window.setSalesTimeFilter("today");
};

window.viewSaleDetails = async function viewSaleDetails(id) {
  const sale = window.salesLog.find((s) => String(s.id) === String(id));
  if (!sale) return toast("⚠️ Venta no encontrada");

  const totalPaid = Number(sale.total_paid || 0);
  const balance = Number(sale.total || 0) - totalPaid;
  const isPending = balance > 0;

  const details =
    typeof sale.payment_details === "string"
      ? JSON.parse(sale.payment_details || "{}")
      : sale.payment_details || {};

  const shipStatus = details.shipping_status || "PENDIENTE";
  const hasShipping =
    sale.shipping_address && sale.shipping_address.trim() !== "";

  // Consultar historial real del servidor
  let history = [];
  try {
    const res = await apiFetch(`${API_URL}/sales/${sale.id}/payments`);
    if (res.ok) history = await res.json();
  } catch (e) {
    console.error(e);
  }

  let overlay = $("saleDetailsOverlay");
  let modal = $("saleDetailsModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "saleDetailsOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = closeSaleDetails;
    document.body.appendChild(overlay);
  }
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "saleDetailsModal";
    modal.className = "modal";
    modal.style.maxWidth = "720px";
    document.body.appendChild(modal);
  }

  const items = Array.isArray(sale.items) ? sale.items : [];

  modal.innerHTML = `
    <div class="modal-header">
      <h3>Venta #${sale.id.slice(-6)}</h3>
      <button class="modal-close" onclick="closeSaleDetails()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px; font-size:13px; color:var(--gray-text)">
        <div><strong>Cliente:</strong><br><span style="color:white">${esc(sale.client || "Mostrador")}</span></div>
        <div><strong>Fecha:</strong><br><span style="color:white">${fmtDate(sale.timestamp)}</span></div>
        <div><strong>Vendedor:</strong><br><span style="color:white">${esc(sale.vendor || "---")}</span></div>
        <div><strong>Estado:</strong><br><span class="status-badge ${isPending ? "s-pending" : "s-ok"}">${isPending ? "PAGO PARCIAL" : "COMPLETADO"}</span></div>
      </div>

      <h4 style="font-size:11px; letter-spacing:2px; color:var(--accent); margin-bottom:10px">ARTÍCULOS</h4>
      <div class="table-wrap" style="margin-bottom:20px">
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr><td>${esc(it.name)}</td><td>${it.size}</td><td>${it.qty}</td><td>${fmt(it.price * it.qty)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <h4 style="font-size:11px; letter-spacing:2px; color:var(--green); margin-bottom:10px">MOVIMIENTOS DE CAJA (ABONOS)</h4>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Método</th><th>Monto</th><th>Referencia</th></tr></thead>
          <tbody>
            ${history
              .map(
                (p) => `
              <tr>
                <td style="font-size:11px">${fmtDate(p.timestamp)}</td>
                <td>${esc(p.method)}</td>
                <td style="font-weight:700; color:var(--accent)">${fmt(p.amount)}</td>
                <td style="font-size:11px; color:var(--gray-text)">${esc(p.notes)}</td>
              </tr>`,
              )
              .join("")}
            ${!history.length ? '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--gray-text)">Sin abonos registrados</td></tr>' : ""}
          </tbody>
        </table>
      </div>

      <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px; text-align:right">
        <div style="font-size:13px; color:var(--gray-text)">Valor de la Venta: ${fmt(sale.total)}</div>
        <div style="font-size:13px; color:var(--green)">Total Recaudado: ${fmt(totalPaid)}</div>
        ${
          isPending
            ? `
          <div style="font-size:14px; font-weight:700; color:var(--orange); margin-top:4px">SALDO PENDIENTE: ${fmt(balance)}</div>
        `
            : `<div style="font-size:11px; color:var(--green); margin-top:4px; font-weight:600">✓ VENTA PAGADA EN SU TOTALIDAD</div>`
        }
      </div>

      ${
        hasShipping
          ? `
        <h4 style="font-size:11px; letter-spacing:2px; color:var(--blue); margin-top:25px; margin-bottom:10px">GESTIÓN DE LOGÍSTICA Y DESPACHO</h4>
        <div style="background:var(--gray2); padding:15px; border-radius:8px; border:1px solid var(--border); margin-bottom:20px">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px">
            <div>
              <label style="font-size:9px; color:var(--gray-text); display:block; margin-bottom:5px">ESTADO DEL ENVÍO</label>
              <select id="shipStatus_${sale.id}" class="tb-select" style="width:100%; background:black; padding:8px">
                <option value="PENDIENTE" ${shipStatus === "PENDIENTE" ? "selected" : ""}>PENDIENTE</option>
                <option value="DESPACHADO" ${shipStatus === "DESPACHADO" ? "selected" : ""}>DESPACHADO</option>
                <option value="EN CAMINO" ${shipStatus === "EN CAMINO" ? "selected" : ""}>EN CAMINO</option>
                <option value="ENTREGADO" ${shipStatus === "ENTREGADO" ? "selected" : ""}>ENTREGADO</option>
                <option value="CANCELADO" ${shipStatus === "CANCELADO" ? "selected" : ""}>CANCELADO</option>
              </select>
            </div>
            <div>
              <label style="font-size:9px; color:var(--gray-text); display:block; margin-bottom:5px">NÚMERO DE GUÍA / TRACKING</label>
              <input type="text" id="trackingNum_${sale.id}" value="${details.tracking_number || ""}" placeholder="Ej: 12345678" 
                style="width:100%; background:black; border:1px solid var(--border); color:white; padding:8px; border-radius:4px">
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px">
             <div style="color:var(--gray-text)"><strong>Dirección:</strong> ${esc(sale.shipping_address)}</div>
             <div style="display:flex; gap:8px">
                <button class="btn-ghost-sm" onclick="generateShippingLabel('${sale.id}')">🏷️ ETIQUETA</button>
                <button class="btn-ghost-sm" onclick="sendTrackingWhatsApp('${sale.id}')">💬 WHATSAPP</button>
             </div>
          </div>
          <button class="btn-accent" onclick="window.applyLogisticsChanges('${sale.id}', this)" style="margin-top:15px; width:100%; height:40px; font-size:12px">APLICAR CAMBIOS DE LOGÍSTICA</button>
        </div>
      `
          : ""
      }
    </div>
    <div class="modal-footer">
       <button class="btn-ghost" onclick="window.printReceiptById('${sale.id}')">🖨 IMPRIMIR TICKET</button>
       <button class="btn-accent" onclick="closeSaleDetails()">CERRAR VENTANA</button>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.registerNewAbono = async function registerNewAbono(saleId) {
  const input = $("newAbonoAmount");
  const amount = parseFloat(input?.value);
  if (!amount || isNaN(amount) || amount <= 0)
    return toast("⚠️ Ingresa un monto válido");

  const res = await apiFetch(`${API_URL}/sales/${saleId}/payments`, {
    method: "POST",
    body: JSON.stringify({
      amount: parseFloat(amount),
      method: "Abono Manual",
      notes: "Abono desde panel administrativo",
    }),
  });
  if (res.ok) {
    toast("✅ Abono registrado");
    if (typeof refreshAll === "function") await refreshAll(); // Sincronización total

    // Cerrar el modal de abono si está abierto
    if ($("abonoOverlay")) {
      $("abonoOverlay").classList.remove("open");
      $("abonoModal").classList.remove("open");
    }
    // Refrescar el detalle si estaba abierto (ahora solo mostrará el historial actualizado)
    if ($("saleDetailsModal")?.classList.contains("open"))
      viewSaleDetails(saleId);
  }
};

window.closeSaleDetails = function closeSaleDetails() {
  $("saleDetailsOverlay")?.classList.remove("open");
  $("saleDetailsModal")?.classList.remove("open");
};

window.printReceiptById = (id) => {
  const sale = window.salesLog.find((s) => s.id === id);
  // Usamos la función de impresión que ya existe en pos.js
  if (sale && typeof printReceipt === "function") printReceipt(sale);
};

window.exportSalesCSV = function exportSalesCSV() {
  const rows = [
    ["ID", "Fecha", "Cliente", "Total", "Metodo"],
    ...window.salesLog.map((s) => [
      s.id,
      s.timestamp,
      s.client,
      s.total,
      s.method,
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ventas.csv";
  a.click();
};

function renderSalesTable() {
  const tbody = $("salesBody");
  if (!tbody) return;
  const dateFilter = $("sfDate")?.value || "";
  const methodFilter = $("sfMethod")?.value || "";
  const channelFilter = $("sfChannel")?.value || "";
  const statusFilter = $("sfShippingStatus")?.value || "";

  const sLog = Array.isArray(window.salesLog) ? window.salesLog : [];
  let filtered = [...sLog];

  // 1. Filtro por Tiempo / Fecha
  if (dateFilter) {
    filtered = filtered.filter((s) => s.timestamp.startsWith(dateFilter));
    _salesTimeRange = "custom";
    const container = document.querySelector("#page-sales .phc-quick-filters");
    if (container)
      container
        .querySelectorAll(".ph-tab")
        .forEach((b) => b.classList.remove("active"));
  } else if (_salesTimeRange !== "all") {
    const todayStr = getTodayStr();
    if (_salesTimeRange === "today") {
      filtered = filtered.filter((s) => s.timestamp.startsWith(todayStr));
    } else if (_salesTimeRange === "yesterday") {
      const yestStr = getPastDate(1);
      filtered = filtered.filter((s) => s.timestamp.startsWith(yestStr));
    } else if (_salesTimeRange === "week") {
      const weekAgoStr = getPastDate(7);
      filtered = filtered.filter((s) => s.timestamp >= weekAgoStr);
    } else if (_salesTimeRange === "month") {
      const monthAgoStr = getPastDate(30);
      filtered = filtered.filter((s) => s.timestamp >= monthAgoStr);
    }
  }

  // 2. Filtros de Atributos (Método y Canal)
  if (methodFilter) {
    filtered = filtered.filter((s) =>
      (s.payment_method || s.method || "")
        .toLowerCase()
        .includes(methodFilter.toLowerCase()),
    );
  }
  if (channelFilter) {
    filtered = filtered.filter(
      (s) =>
        (s.channel || "fisica").toLowerCase() === channelFilter.toLowerCase(),
    );
  }
  if (statusFilter) {
    filtered = filtered.filter((s) => {
      const d =
        typeof s.payment_details === "string"
          ? JSON.parse(s.payment_details || "{}")
          : s.payment_details || {};
      return (d.shipping_status || "PENDIENTE") === statusFilter;
    });
  }

  // 3. Renderizado
  let totalRevenue = 0;
  if (!filtered.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="9">Sin ventas en este periodo</td></tr>';
  } else {
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    tbody.innerHTML = filtered
      .map((s, idx) => {
        const hasShipping =
          s.shipping_address && s.shipping_address.trim() !== "";

        const d =
          typeof s.payment_details === "string"
            ? JSON.parse(s.payment_details || "{}")
            : s.payment_details || {};
        const shipStatus = d.shipping_status || "PENDIENTE";

        const channelBadge = hasShipping
          ? `<span class="status-badge s-fisica" style="font-size:9px" title="${esc(s.shipping_address)}">📦 ENVÍO: ${shipStatus}</span>`
          : `<span class="status-badge s-ok">${s.channel || "Física"}</span>`;

        totalRevenue += Number(s.total) || 0;
        return `
        <tr>
          <td style="color:var(--gray-text);font-size:11px">#${filtered.length - idx}</td>
          <td style="font-size:12px">${fmtDate(s.timestamp)}</td>
          <td>${channelBadge}</td>
          <td>${s.vendor || "---"}</td>
          <td style="color:var(--gray-text)">${esc(s.client || "Mostrador")}</td>
          <td style="font-size:11px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            ${s.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
          </td>
          <td><span class="status-badge s-ok">${s.payment_method || s.method || "Efectivo"}</span></td>
          <td style="font-weight:700; color:var(--accent)">${fmt(s.total)}</td>
          <td>
            <div style="display:flex; gap:5px; justify-content:center;">
              <button class="action-btn" onclick="viewSaleDetails('${s.id}')">👁</button>
              <button class="action-btn" onclick="window.printReceiptById('${s.id}')">🖨</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }

  // 4. Actualizar KPIs
  if ($("sv1")) $("sv1").textContent = fmt(totalRevenue);
  if ($("sv2")) $("sv2").textContent = filtered.length;
  if ($("sv3"))
    $("sv3").textContent = fmt(
      filtered.length ? Math.round(totalRevenue / filtered.length) : 0,
    );
}

window.loadVIPCustomersData = async function loadVIPCustomersData() {
  try {
    const res = await apiFetch(`${API_URL}/customers/vip`);
    const vips = await res.json();
    if ($("vipCustomersBody"))
      $("vipCustomersBody").innerHTML = vips
        .map(
          (c) => `
        <tr>
          <td>${esc(c.email)}</td><td>${esc(c.name)}</td><td>${esc(c.phone)}</td>
          <td>${fmt(c.total_spent)}</td><td>${c.total_orders}</td>
          <td>${c.last_purchase ? fmtDate(c.last_purchase) : "N/A"}</td>
        </tr>`,
        )
        .join("");
  } catch (e) {
    console.error(e);
  }
};

window.renderLayawaySales = function renderLayawaySales() {
  const tbody = $("layawayTableBody");
  if (!tbody) return;
  const sLog = Array.isArray(window.salesLog) ? window.salesLog : [];
  const p = sLog.filter((s) => s && s.payment_status === "partial");

  let tS = 0,
    tC = 0,
    tP = 0;

  tbody.innerHTML = p.length
    ? p
        .map((s) => {
          const paid = Number(s.total_paid || 0);
          const balance = Number(s.total || 0) - paid;
          const days = Math.floor(
            (new Date() - new Date(s.timestamp)) / (1000 * 60 * 60 * 24),
          );

          tS++;
          tC += paid;
          tP += balance;

          return `
    <tr>
      <td>${fmtDate(s.timestamp)}</td>
      <td style="font-weight:600">${esc(s.client)}</td>
      <td><span class="status-badge ${days > 30 ? "s-out" : "s-low"}">${days} días</span></td>
      <td>${fmt(s.total)}</td>
      <td style="color:var(--green)">${fmt(paid)}</td>
      <td style="font-weight:700; color:var(--orange)">${fmt(balance)}</td>
      <td>
        <div style="display:flex; gap:5px">
          <button class="btn-ghost-sm" title="Detalles" onclick="viewSaleDetails('${s.id}')">👁</button>
          <button class="btn-accent" style="font-size:9px; padding:4px 8px; clip-path:none" onclick="window.openAbonoModal('${s.id}')">➕ ABONAR</button>
        </div>
      </td>
    </tr>`;
        })
        .join("")
    : '<tr class="empty-row"><td colspan="7">No hay productos separados pendientes</td></tr>';

  if ($("sepTotalSales")) $("sepTotalSales").textContent = tS;
  if ($("sepTotalCollected")) $("sepTotalCollected").textContent = fmt(tC);
  if ($("sepTotalPending")) $("sepTotalPending").textContent = fmt(tP);
};

window.openAbonoModal = function (saleId) {
  const sale = window.salesLog.find((s) => s.id === saleId);
  if (!sale) return;
  const balance = Number(sale.total || 0) - Number(sale.total_paid || 0);

  let overlay = $("abonoOverlay") || document.createElement("div");
  let modal = $("abonoModal") || document.createElement("div");

  if (!overlay.id) {
    overlay.id = "abonoOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };
    modal.id = "abonoModal";
    modal.className = "modal modal-sm";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header"><h3>Registrar Abono</h3><button class="modal-close" onclick="$('abonoOverlay').click()">✕</button></div>
    <div class="modal-body">
      <div style="text-align:center; margin-bottom:20px">
        <div style="font-size:11px; color:var(--gray-text)">SALDO PENDIENTE</div>
        <div style="font-size:32px; font-family:'Bebas Neue'; color:var(--accent)">${fmt(balance)}</div>
      </div>
      <div class="form-group"><label>MONTO A COBRAR</label><input type="number" id="newAbonoAmount" placeholder="0" style="width:100%; background:black"></div>
      <button class="btn-accent" style="width:100%; margin-top:20px; height:45px" onclick="registerNewAbono('${sale.id}')">CONFIRMAR ABONO</button>
    </div>`;
  overlay.classList.add("open");
  modal.classList.add("open");
};

let _layawayFilter = "pending";
window.setLayawayFilter = (f) => {
  _layawayFilter = f;
  const tabs = {
    pending: "layawayTabPending",
    completed: "layawayTabCompleted",
    all: "layawayTabAll",
  };
  Object.entries(tabs).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", f === key);
  });
  renderLayawaySales();
};

window.applyLogisticsChanges = async function (saleId, btn) {
  const statusEl = document.getElementById(`shipStatus_${saleId}`);
  const trackingEl = document.getElementById(`trackingNum_${saleId}`);
  if (!statusEl || !trackingEl) return;

  const newStatus = statusEl.value;
  const newTracking = trackingEl.value.trim();

  const sale = window.salesLog.find((s) => String(s.id) === String(saleId));
  if (!sale) return;

  const details =
    typeof sale.payment_details === "string"
      ? JSON.parse(sale.payment_details || "{}")
      : sale.payment_details || {};

  details.shipping_status = newStatus;
  details.tracking_number = newTracking;

  // Lógica automática: si hay guía y está pendiente, pasar a despachado
  if (newTracking && newStatus === "PENDIENTE") {
    details.shipping_status = "DESPACHADO";
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⌛ GUARDANDO...";

  try {
    const res = await apiFetch(`${API_URL}/sales/${saleId}`, {
      method: "PATCH",
      body: JSON.stringify({ payment_details: details }),
    });

    if (res.ok) {
      toast("✅ Logística actualizada correctamente");
      await fetchSalesLog();
      viewSaleDetails(saleId);
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${res.status}`);
    }
  } catch (e) {
    console.error("❌ Logistics Save Error:", e);
    toast("❌ Error: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

window.generateShippingLabel = function (saleId) {
  const s = window.salesLog.find((sale) => String(sale.id) === String(saleId));
  if (!s) return;

  const isCOD = s.method && s.method.toLowerCase().includes("entrega");
  const win = window.open("", "_blank", "width=500,height=700");

  // Generar un código de barras simple para la referencia del pedido
  // Esto es una representación visual, no un código de barras escaneable real sin una librería adicional
  const barcodeRef = s.id
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(-10);

  const labelHtml = `
    <html>
      <head>
        <title>Etiqueta de Envío #${s.id.slice(-6)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;600;700&display=swap');
          body { font-family: 'Poppins', sans-serif; padding: 15px; color: #000; background: #fff; margin: 0; }
          .label-container { 
            border: 2px solid #000; padding: 15px; width: 100%; max-width: 480px; margin: 0 auto; 
            box-sizing: border-box; display: flex; flex-direction: column; gap: 15px;
          }
          .header { 
            border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; 
            display: flex; justify-content: space-between; align-items: center; 
          }
          .logo { 
            font-family: 'Bebas Neue', sans-serif; font-size: 28px; font-weight: 900; 
            letter-spacing: 3px; color: #000; 
          }
          .logo-dot { width: 6px; height: 6px; background: #e8ff47; border-radius: 50%; display: inline-block; margin: 0 1px; }
          .carrier-info { 
            font-size: 12px; font-weight: bold; border: 1px solid #000; 
            padding: 4px 8px; background: #f0f0f0; text-transform: uppercase; 
          }
          .section { margin-bottom: 10px; }
          .section-title { 
            font-size: 10px; text-transform: uppercase; color: #555; font-weight: 600; 
            margin-bottom: 3px; border-bottom: 1px dashed #ccc; padding-bottom: 2px; 
          }
          .section-value { font-size: 16px; font-weight: 700; line-height: 1.2; color: #000; }
          .address { font-size: 14px; margin-top: 3px; }
          .phone { font-size: 14px; margin-top: 3px; }
          .footer { 
            border-top: 1px solid #000; padding-top: 15px; margin-top: 10px; 
            display: flex; justify-content: space-between; align-items: flex-end; 
          }
          .order-ref { text-align: left; }
          .order-ref-value { font-size: 18px; font-weight: 900; color: #000; }
          .cod-box { 
            background: #000; color: #e8ff47; padding: 8px 12px; text-align: center; 
            min-width: 120px; border-radius: 4px; 
          }
          .cod-label { font-size: 9px; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
          .cod-value { font-family: 'Bebas Neue', sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 1px; }
          .paid-status { 
            font-size: 12px; font-weight: bold; color: #28a745; border: 1px solid #28a745; 
            padding: 5px 10px; border-radius: 4px; background: rgba(40, 167, 69, 0.1); 
          }
          .barcode { 
            font-family: 'Libre Barcode 39', cursive; font-size: 40px; line-height: 1em; 
            text-align: center; margin-top: 15px; 
          }
          .barcode-text { font-family: monospace; font-size: 10px; text-align: center; margin-top: 5px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label-container { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="header">
            <div class="logo">W<span class="logo-dot"></span>NNER</div>
            <div class="carrier-info">${s.shipping_carrier || "ESTÁNDAR"}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Destinatario</div>
            <div class="section-value">${esc(s.client).toUpperCase()}</div>
            <div class="section-value address">${esc(s.shipping_address || "DIRECCIÓN NO PROPORCIONADA")}</div>
            <div class="section-value phone">${esc(s.customer_phone || "")}</div>
          </div>

          <div class="section">
            <div class="section-title">Remitente</div>
            <div class="section-value" style="font-size: 13px;">WINNER STORE - SEDE DESPACHOS<br>Bogotá D.C, Colombia</div>
          </div>

          <div class="footer">
            <div class="order-ref">
              <div class="section-title">Referencia de Pedido</div>
              <div class="order-ref-value">#${s.id.toUpperCase().slice(-8)}</div>
            </div>
            ${isCOD ? `<div class="cod-box"><div class="cod-label">COBRAR CONTRA ENTREGA</div><div class="cod-value">${fmt(s.total)}</div></div>` : '<div class="paid-status">PAGADO</div>'}
          </div>

          <div class="barcode">${barcodeRef}</div>
          <div class="barcode-text">REF: ${barcodeRef}</div>
        </div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
      </body>
    </html>`;

  win.document.write(labelHtml);
  win.document.close();
};

window.sendTrackingWhatsApp = function (saleId) {
  const s = window.salesLog.find((sale) => String(sale.id) === String(saleId));
  if (!s) return;

  const details =
    typeof s.payment_details === "string"
      ? JSON.parse(s.payment_details || "{}")
      : s.payment_details || {};
  const carrier =
    s.shipping_carrier || details.shippingCarrier || "la transportadora";

  const message =
    `¡Hola ${s.client}! 🚀 Tu pedido de W●NNER ya fue despachado.\n\n` +
    `📦 *Transportadora:* ${carrier}\n` +
    `🔢 *Número de Guía:* ${details.tracking_number}\n\n` +
    `Puedes rastrearlo en la página oficial de la transportadora. ¡Gracias por tu compra!`;

  const phone = s.customer_phone ? s.customer_phone.replace(/\D/g, "") : "";
  const waUrl = `https://wa.me/${phone.startsWith("57") ? phone : "57" + phone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
};

window.openMassShippingModal = function () {
  let overlay = $("massShippingOverlay");
  let modal = $("massShippingModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "massShippingOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = closeMassShippingModal;
    document.body.appendChild(overlay);
  }
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "massShippingModal";
    modal.className = "modal";
    modal.style.maxWidth = "720px";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>Generar Guías Masivas</h3>
      <button class="modal-close" onclick="closeMassShippingModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px; color:var(--gray-text); margin-bottom:20px;">
        Aquí se mostrará una interfaz para la generación y gestión de guías de envío masivas.
        Podrás seleccionar múltiples pedidos, elegir transportadoras y generar los documentos necesarios.
      </p>
      <p style="font-size:14px; color:var(--accent); font-weight:bold;">
        ¡Esta funcionalidad está en desarrollo! Pronto podrás sincronizar con tus transportadoras.
      </p>
      <div style="margin-top:20px; text-align:center;">
        <img src="https://via.placeholder.com/300x200?text=Interfaz+de+Guias+Masivas" alt="Placeholder" style="max-width:100%; height:auto; border-radius:8px;">
      </div>
    </div>
    <div class="modal-footer">
       <button class="btn-accent" onclick="closeMassShippingModal()">ENTENDIDO</button>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.closeMassShippingModal = function () {
  $("massShippingOverlay")?.classList.remove("open");
  $("massShippingModal")?.classList.remove("open");
};

// Exportaciones globales limpias
window.fetchSalesLog = fetchSalesLog;
window.renderSalesTable = renderSalesTable;
window.viewSaleDetails = viewSaleDetails;
window.registerNewAbono = registerNewAbono;
window.exportSalesCSV = exportSalesCSV;
window.loadVIPCustomersData = loadVIPCustomersData;
window.renderLayawaySales = renderLayawaySales;
