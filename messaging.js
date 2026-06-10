/* ═══════════════════════════════════════════════════════
   WINNER — messaging.js (Centro de WhatsApp)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.renderMessagingCenter = function () {
  const container = $("messagingList");
  if (!container) return;

  // Usar salesLog o allSalesData de forma segura
  const sales = window.salesLog || window.allSalesData || [];

  if (sales.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">No hay ventas recientes para notificar</div>';
    return;
  }

  // Filtrar ventas que tengan teléfono (para que el botón funcione)
  const filter = $("msgFilterType")?.value || "all";
  let filtered = sales.filter(
    (s) =>
      (s.customer_phone && s.customer_phone.length > 5) ||
      (s.phone && s.phone.length > 5),
  );

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">⚠️ No hay ventas con números de teléfono válidos en esta categoría</div>';
    return;
  }

  if (filter === "pending_ship") {
    filtered = filtered.filter((s) => {
      const d =
        typeof s.payment_details === "string"
          ? JSON.parse(s.payment_details || "{}")
          : s.payment_details || {};
      return s.shipping_address && d.shipping_status === "PENDIENTE";
    });
  } else if (filter === "pending_pay") {
    filtered = filtered.filter((s) => s.payment_status === "partial");
  }

  container.innerHTML = filtered
    .map((s) => {
      const phone = (s.customer_phone || s.phone || "").replace(/\D/g, "");
      const cleanPhone = phone.startsWith("57") ? phone : "57" + phone;
      const d =
        typeof s.payment_details === "string"
          ? JSON.parse(s.payment_details || "{}")
          : s.payment_details || {};

      return `
        <div class="dash-neon-box" style="padding:15px; margin-bottom:10px; flex-direction:row; justify-content:space-between; text-align:left; align-items:center;">
            <div style="z-index:1">
                <div style="font-weight:700; font-size:14px; color:white">${esc(s.client)}</div>
                <div style="font-size:11px; color:var(--gray-text)">Orden #${s.id.slice(-6).toUpperCase()} • ${fmtDate(s.timestamp)}</div>
                <div style="margin-top:5px">
                    <span class="status-badge ${s.payment_status === "completed" ? "s-ok" : "s-low"}">${s.payment_status === "completed" ? "PAGADO" : "PENDIENTE"}</span>
                    ${s.shipping_address ? `<span class="status-badge s-fisica">${d.shipping_status || "PENDIENTE"}</span>` : ""}
                </div>
            </div>
            <div style="display:flex; gap:8px; z-index:1">
                <button class="btn-ghost-sm" onclick="window.sendWSMessage('${s.id}', 'ticket')">📄 TICKET</button>
                ${s.shipping_address ? `<button class="btn-ghost-sm" onclick="window.sendWSMessage('${s.id}', 'shipping')">📦 ENVÍO</button>` : ""}
                ${s.payment_status === "partial" ? `<button class="btn-ghost-sm" style="color:var(--orange)" onclick="window.sendWSMessage('${s.id}', 'payment')">💰 COBRO</button>` : ""}
            </div>
        </div>`;
    })
    .join("");
};

window.sendWSMessage = function (saleId, type) {
  const s = window.salesLog.find((x) => String(x.id) === String(saleId));
  if (!s) return;

  const phone = (s.customer_phone || s.phone || "").replace(/\D/g, "");
  const cleanPhone = phone.startsWith("57") ? phone : "57" + phone;
  const d =
    typeof s.payment_details === "string"
      ? JSON.parse(s.payment_details || "{}")
      : s.payment_details || {};

  let message = "";
  const baseUrl = window.location.origin;

  switch (type) {
    case "ticket":
      message = `¡Hola ${s.client}! 👋 Gracias por elegir W●NNER STREETWEAR. Aquí puedes ver tu comprobante de compra: ${baseUrl}/api/receipt/${s.id}`;
      break;
    case "shipping":
      const carrier =
        s.shipping_carrier || d.shippingCarrier || "la transportadora";
      message = `¡Buenas noticias ${s.client}! 🚀 Tu pedido ya fue despachado.\n\n📦 *Transportadora:* ${carrier}\n🔢 *Guía:* ${d.tracking_number || "Pendiente"}\n\n¡Gracias por tu confianza!`;
      break;
    case "payment":
      const paid = Number(s.total_paid || 0);
      const balance = Number(s.total || 0) - paid;
      message = `Hola ${s.client} 👋, te saludamos de W●NNER. Te recordamos que tienes un saldo pendiente de *${fmt(balance)}* por tu compra del ${fmtDate(s.timestamp)}. ¿Cómo vas con eso?`;
      break;
  }

  // ACTUALIZACIÓN: Flujo sin redirección (Requiere WhatsApp Business API)
  /*
  apiFetch(`${API_URL}/whatsapp/send`, {
    method: 'POST',
    body: JSON.stringify({ to: cleanPhone, message: message })
  }).then(() => toast("✓ Mensaje enviado automáticamente"));
  */

  // MODO ACTUAL (Legacy con redirección manual)
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
};

window.setMsgFilter = function (val) {
  window.renderMessagingCenter();
};
