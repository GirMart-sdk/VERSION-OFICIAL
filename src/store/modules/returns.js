/* ═══════════════════════════════════════════════════════
   WINNER STORE — returns.js (Gestión de Devoluciones & Logística)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.openReturnsModal = function () {
  let overlay = document.getElementById("returnsModalOverlay");
  let modal = document.getElementById("returnsModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "returnsModalOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "returnsModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "550px";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>DEVOLUCIONES & LOGÍSTICA</h3>
      <button class="adm-close" onclick="document.getElementById('returnsModalOverlay').click()">✕</button>
    </div>
    <div class="modal-body" style="overflow-y:auto; max-height:75vh; scrollbar-width: thin;">
      
      <!-- SECCIÓN 1: RASTREO (LOGÍSTICA ACTIVA) -->
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:15px; margin-bottom:25px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">📦 RASTREO DE PEDIDO</h4>
        <p style="font-size:11px; color:var(--gray-text); margin-bottom:12px;">Ingresa tu ID de pedido para conocer el estado actual de tu envío.</p>
        <div style="display:flex; gap:8px;">
          <input type="text" id="returnsTrackId" placeholder="Ej: ONMPX9LOY5" style="flex:1; background:var(--dark); border:1px solid var(--border); color:white; padding:10px; border-radius:4px; font-size:13px;">
          <button onclick="handleReturnsTrackUI()" style="background:var(--accent); color:black; border:none; padding:0 20px; border-radius:4px; font-weight:bold; cursor:pointer; font-family:'Bebas Neue';">BUSCAR</button>
        </div>
        <div id="trackResultContainer" style="margin-top:15px; display:none;"></div>
      </div>

      <!-- SECCIÓN 2: POLÍTICA DE DEVOLUCIÓN -->
      <section style="margin-bottom:25px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">🔄 POLÍTICA DE CAMBIOS</h4>
        <p style="font-size:13px; color:var(--gray-text); line-height:1.5;">Tienes hasta <strong>5 días hábiles</strong> después de recibir tu compra para solicitar un cambio por talla o referencia. El producto debe estar en perfectas condiciones, con etiquetas y sin señales de uso.</p>
      </section>

      <!-- SECCIÓN 3: PROCESO PASO A PASO -->
      <section style="margin-bottom:25px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">🛠️ CÓMO SOLICITAR UN CAMBIO</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="background:var(--accent); color:black; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0; margin-top:2px;">1</div>
            <div style="font-size:12px; color:white;">Rastrea tu pedido arriba para confirmar que el estado sea <strong>ENTREGADO</strong>.</div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="background:var(--accent); color:black; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0; margin-top:2px;">2</div>
            <div style="font-size:12px; color:white;">Haz clic en el botón de "Solicitar Cambio" que aparecerá en el resultado del rastreo.</div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="background:var(--accent); color:black; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0; margin-top:2px;">3</div>
            <div style="font-size:12px; color:white;">Envía el producto a nuestra bodega central. Una vez verificado, te enviaremos el cambio sin costo de envío adicional.</div>
          </div>
        </div>
      </section>

      <div style="background: rgba(232, 255, 71, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid var(--accent); margin-bottom: 20px;">
        <p style="font-size: 11px; color: white; margin: 0;"><strong>⚠️ Importante:</strong> Los productos en oferta (SALE) solo tienen cambio por garantía de fábrica comprobada.</p>
      </div>

      <div style="text-align:center; padding-top:20px; border-top:1px solid var(--border);">
        <div style="font-size:10px; letter-spacing:2px; color:rgba(255,255,255,0.4); font-weight:bold;">WINNER STORE LOGISTICS © 2026</div>
      </div>

    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.handleReturnsTrackUI = async function () {
  const input = document.getElementById("returnsTrackId");
  const container = document.getElementById("trackResultContainer");
  const orderId = input.value.trim();

  if (!orderId) return showToast("⚠️ Ingresa un ID de pedido");

  container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--accent); font-size:12px;">🔍 Buscando en red logística...</div>`;
  container.style.display = "block";

  try {
    const res = await apiFetch(`${API_URL}/orders/${orderId}`);
    if (!res.ok) throw new Error();
    const order = await res.json();

    container.innerHTML = `
      <div style="background:var(--dark); padding:15px; border-radius:6px; border:1px solid var(--accent);">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <span style="font-size:11px; color:var(--gray-text);">ESTADO:</span>
          <span style="font-size:12px; font-weight:bold; color:var(--accent);">${order.status.toUpperCase()}</span>
        </div>
        <div style="font-size:13px; color:white; margin-bottom:5px;">Transportadora: <strong>${order.shippingMethod}</strong></div>
        ${order.trackingNumber ? `<div style="font-size:13px; color:white;">Guía: <strong style="color:var(--accent)">${order.trackingNumber}</strong></div>` : ""}
        
        ${
          order.status === "ENTREGADO"
            ? `
          <button onclick="window.open('https://wa.me/${window.WHATSAPP_PHONE}?text=${encodeURIComponent("Hola Winner! 👋 Mi pedido #" + orderId + " ya fue entregado y necesito solicitar un cambio.")}', '_blank')" 
            style="width:100%; margin-top:15px; background:white; color:black; border:none; padding:10px; border-radius:4px; font-weight:bold; font-size:11px; cursor:pointer;">
            SOLICITAR CAMBIO AHORA →
          </button>
        `
            : ""
        }
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="background:rgba(255,0,0,0.1); padding:10px; border-radius:4px; border:1px solid var(--red); color:var(--red); font-size:12px;">❌ ID no encontrado. Verifica tu ticket o correo.</div>`;
  }
};
