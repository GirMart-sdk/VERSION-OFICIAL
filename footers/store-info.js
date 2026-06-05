/* ═══════════════════════════════════════════════════════
   WINNER STORE — store-info.js (Información & Legal)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.WHATSAPP_PHONE = "573135642283"; // Valor por defecto

/**
 * Carga la configuración de redes e info desde el servidor (.env)
 */
async function loadDynamicConfig() {
  try {
    const res = await apiFetch(`${API_URL}/config`);
    if (!res.ok) return;
    const config = await res.json();

    // Actualizar links en el DOM
    const ig = document.getElementById("link-instagram");
    const tt = document.getElementById("link-tiktok");
    const fb = document.getElementById("link-facebook");
    const wa = document.getElementById("link-whatsapp");

    if (ig) ig.href = config.social.instagram;
    if (tt) tt.href = config.social.tiktok;
    if (fb) fb.href = config.social.facebook;
    if (wa) {
      wa.href = `https://wa.me/${config.social.whatsapp}`;
      window.WHATSAPP_PHONE = config.social.whatsapp;
    }

    // Guardar info para el modal
    window._WINNER_INFO = config.info;
  } catch (err) {
    console.warn("Usando links de redes por defecto.");
  }
}
window.loadDynamicConfig = loadDynamicConfig;

window.openAboutModal = function () {
  const info = window._WINNER_INFO || {};
  const aboutText =
    info.about || "Winner Store: Streetwear colombiano de alta gama.";
  const visionText = info.vision || "Liderar la cultura urbana nacional.";

  let overlay = document.getElementById("aboutModalOverlay");
  let modal = document.getElementById("aboutModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "aboutModalOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "aboutModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "500px";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>SOBRE W<span style="color:var(--accent)">●</span>NNER</h3>
      <button class="adm-close" onclick="document.getElementById('aboutModalOverlay').click()">✕</button>
    </div>
    <div class="modal-body" style="line-height: 1.6;">
      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:2px; margin-bottom:10px;">NUESTRA ESENCIA</h4>
      <p style="font-size:14px; color:var(--gray-text); margin-bottom:15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${aboutText}</p>
      
      <hr style="border:0; border-top: 1px solid #2a2a2a; margin: 15px 0;">

      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:2px; margin-bottom:10px;">VISIÓN 2026</h4>
      <p style="font-size:14px; color:var(--gray-text); margin-bottom:20px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${visionText}</p>
      
      <button class="adm-btn" style="width:100%; height:45px; margin: 10px 0 20px 0; font-family:'Bebas Neue'; letter-spacing:1px; cursor:pointer;" onclick="document.getElementById('aboutModalOverlay').click(); setTimeout(() => document.getElementById('productos').scrollIntoView({behavior:'smooth'}), 300);">VER COLECCIÓN →</button>

      <div style="margin-top:30px; text-align:center; border-top: 1px solid var(--border); padding-top:20px;">
        <div style="font-size:11px; letter-spacing:3px; color:rgba(255,255,255,0.85); font-weight:bold;">WINNER STORE COLOMBIA © 2026</div>
      </div>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.openShippingModal = function () {
  const info = window._WINNER_INFO || {};
  const shippingText =
    info.shipping_info || "Información de envíos nacionales.";

  const zones = window.SHIPPING_ZONES || {};
  const carriers = window.CARRIER_QUOTERS || [];

  let overlay = document.getElementById("shippingInfoOverlay");
  let modal = document.getElementById("shippingInfoModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "shippingInfoOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "shippingInfoModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "520px";
    document.body.append(overlay, modal);
  }

  const ratesHtml = `
    <div style="margin: 15px 0; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border); overflow: hidden;">
      <table style="width:100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead style="background: var(--border); color: var(--accent);">
          <tr>
            <th style="padding: 10px;">ZONA LOGÍSTICA</th>
            <th style="padding: 10px; text-align: right;">COSTO ESTIMADO</th>
          </tr>
        </thead>
        <tbody style="color: rgba(255,255,255,0.8);">
          ${Object.values(zones)
            .map(
              (z) => `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 10px;"><strong>${z.name}</strong><br><small style="color:var(--gray-text)">${z.desc}</small></td>
              <td style="padding: 10px; color: var(--accent); text-align: right; font-weight: bold;">${fmt(z.price)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  const carriersHtml = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 15px;">
      ${carriers
        .map(
          (c) => `
        <a href="${c.url}" target="_blank" rel="noopener" 
           style="background: var(--gray); border: 1px solid var(--border); padding: 10px; border-radius: 6px; 
                  display: flex; align-items: center; gap: 8px; text-decoration: none; transition: 0.2s;"
           onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <span style="font-size: 16px;">${c.icon}</span>
          <span style="font-size: 10px; font-weight: bold; color: white; letter-spacing: 1px;">${c.name.toUpperCase()}</span>
        </a>
      `,
        )
        .join("")}
    </div>
  `;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>LOGÍSTICA & ENVÍOS</h3>
      <button class="adm-close" onclick="document.getElementById('shippingInfoOverlay').click()">✕</button>
    </div>
    <div class="modal-body" style="overflow-y:auto; max-height:75vh; scrollbar-width: thin;">
      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">TABLA DE TARIFAS POR ZONA</h4>
      <p style="font-size:13px; color:var(--gray-text); line-height: 1.5;">${shippingText}</p>
      
      ${ratesHtml}

      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin: 20px 0 10px;">COTIZADORES OFICIALES</h4>
      <p style="font-size:11px; color:var(--gray-text);">Accede directamente a la plataforma de cada transportadora para una cotización exacta:</p>
      ${carriersHtml}

      <div style="background: rgba(232, 255, 71, 0.05); padding: 12px; border-radius: 6px; border-left: 3px solid var(--accent); margin-top: 15px;">
        <p style="font-size: 11px; color: white; margin: 0;"><strong>💡 Tip Winner:</strong> Recuerda que por compras superiores a <strong>$100.000</strong> tu envío puede aplicar para tarifa gratuita según la transportadora seleccionada.</p>
      </div>

      <div style="margin-top:25px; text-align:center; border-top: 1px solid var(--border); padding-top:20px;">
        <div style="font-size:10px; letter-spacing:2px; color:rgba(255,255,255,0.5); font-weight:bold;">DESPACHOS DESDE BOGOTÁ & MEDELLÍN</div>
      </div>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.openPrivacyModal = function () {
  const info = window._WINNER_INFO || {};
  const privacyText =
    info.privacy ||
    "En Winner Store protegemos tus datos. La información recolectada se usa exclusivamente para el procesamiento de pedidos, envíos y soporte al cliente.";

  let overlay = document.getElementById("privacyModalOverlay");
  let modal = document.getElementById("privacyModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "privacyModalOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "privacyModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "500px";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>POLÍTICA DE PRIVACIDAD</h3>
      <button class="adm-close" onclick="document.getElementById('privacyModalOverlay').click()">✕</button>
    </div>
    <div class="modal-body" style="line-height: 1.6; max-height: 70vh; overflow-y: auto; padding-right: 10px;">
      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:8px;">TRATAMIENTO DE DATOS</h4>
      <p style="font-size:13px; color:var(--gray-text); margin-bottom:10px;">${privacyText}</p>
      <ul style="font-size:12px; color:var(--gray-text); margin-bottom:20px; padding-left:20px; list-style-type: disc;">
        <li>Nombre, documento e información de contacto.</li>
        <li>Dirección de entrega e historial de compras.</li>
        <li>Datos de pago procesados por Wompi — no almacenamos tarjetas.</li>
        <li>Dirección IP y datos de navegación (cookies).</li>
      </ul>
      
      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:8px;">SEGURIDAD</h4>
      <p style="font-size:13px; color:var(--gray-text); margin-bottom:20px;">Implementamos protocolos de encriptación y cifrado de datos para asegurar que tu información de contacto y transacciones sean privadas y seguras conforme a los estándares de seguridad de entidades financieras y políticas internas.</p>

      <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:8px;">TUS DERECHOS — LEY 1581 DE 2012</h4>
      <p style="font-size:13px; color:var(--gray-text);">Puedes conocer, actualizar, rectificar o solicitar la eliminación de tus datos dejando tu información en un email escrito desde nuestros medios oficiales. Respondemos en máximo 10 días hábiles.</p>
      
      <div style="margin-top:30px; text-align:center; border-top: 1px solid var(--border); padding-top:20px;">
        <div style="font-size:10px; letter-spacing:2px; color:white; font-weight:bold;">CUMPLIMIENTO LEGAL — WINNER STORE 2026</div>
      </div>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};

window.openSizeGuideModal = function () {
  let overlay = document.getElementById("sizeGuideOverlay");
  let modal = document.getElementById("sizeGuideModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sizeGuideOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "sizeGuideModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "600px";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>GUÍA DE TALLAS W<span style="color:var(--accent)">●</span>NNER</h3>
      <button class="adm-close" onclick="document.getElementById('sizeGuideOverlay').click()">✕</button>
    </div>
    <div class="modal-body" style="overflow-y:auto; max-height:75vh; padding-right:10px; scrollbar-width: thin;">
      
      <!-- CALZADO -->
      <section style="margin-bottom:30px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">👟 CALZADO (EURO VS NACIONAL)</h4>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
            <thead style="background:var(--border); color:var(--accent);">
              <tr><th style="padding:10px;">EURO (Físico)</th><th style="padding:10px;">NACIONAL</th><th style="padding:10px;">CM</th></tr>
            </thead>
            <tbody style="color:rgba(255,255,255,0.8);">
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">36 - 37</td><td style="padding:8px;">34 - 35</td><td style="padding:8px;">23.5</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">38 - 39</td><td style="padding:8px;">36 - 37</td><td style="padding:8px;">25.0</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">40 - 41</td><td style="padding:8px;">38 - 39</td><td style="padding:8px;">26.5</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">42 - 43</td><td style="padding:8px;">40 - 41</td><td style="padding:8px;">28.0</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">44 - 45</td><td style="padding:8px;">42 - 43</td><td style="padding:8px;">29.5</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- PANTALONES CABALLERO -->
      <section style="margin-bottom:30px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">👖 PANTALONES CABALLERO</h4>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
            <thead style="background:var(--border); color:var(--accent);">
              <tr><th style="padding:10px;">TALLA (US/CO)</th><th style="padding:10px;">CINTURA (CM)</th><th style="padding:10px;">LARGO (CM)</th></tr>
            </thead>
            <tbody style="color:rgba(255,255,255,0.8);">
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">28 - 30</td><td style="padding:8px;">75 - 80</td><td style="padding:8px;">100</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">32 - 34</td><td style="padding:8px;">85 - 90</td><td style="padding:8px;">102</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">36 - 38</td><td style="padding:8px;">95 - 100</td><td style="padding:8px;">105</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- PANTALONES DAMA -->
      <section style="margin-bottom:30px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">👗 PANTALONES & JEANS DAMA</h4>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
            <thead style="background:var(--border); color:var(--accent);">
              <tr><th style="padding:10px;">TALLA</th><th style="padding:10px;">CADERA (CM)</th><th style="padding:10px;">CINTURA (CM)</th></tr>
            </thead>
            <tbody style="color:rgba(255,255,255,0.8);">
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">6 - 8</td><td style="padding:8px;">88 - 94</td><td style="padding:8px;">64 - 70</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">10 - 12</td><td style="padding:8px;">98 - 104</td><td style="padding:8px;">74 - 80</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">14 - 16</td><td style="padding:8px;">108 - 114</td><td style="padding:8px;">84 - 90</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- PRENDAS SUPERIORES -->
      <section style="margin-bottom:30px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">👕 CAMISETAS, HOODIES & CHAQUETAS</h4>
        <p style="font-size:11px; color:var(--gray-text); margin-bottom:10px;">Estilo <strong>Oversize</strong> (Hormas amplias). Si deseas un ajuste entallado, pide una talla menos.</p>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
            <thead style="background:var(--border); color:var(--accent);">
              <tr><th style="padding:10px;">TALLA</th><th style="padding:10px;">ANCHO (CM)</th><th style="padding:10px;">LARGO (CM)</th></tr>
            </thead>
            <tbody style="color:rgba(255,255,255,0.8);">
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">S / M</td><td style="padding:8px;">54 - 58</td><td style="padding:8px;">70 - 72</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">L / XL</td><td style="padding:8px;">60 - 64</td><td style="padding:8px;">74 - 76</td></tr>
              <tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;">XXL</td><td style="padding:8px;">68</td><td style="padding:8px;">78</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ACCESORIOS -->
      <section style="margin-bottom:30px;">
        <h4 style="color:var(--accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">🧢 ACCESORIOS</h4>
        <div style="background:rgba(232, 255, 71, 0.05); padding:15px; border-radius:8px; border-left:4px solid var(--accent);">
          <p style="font-size:12px; color:white; margin:0;">
            <strong>TALLA ÚNICA (U):</strong> Gorras, Relojes, Joyería y Gafas están diseñados con sistemas de ajuste universal (correas ajustables, eslabones removibles o marcos flexibles).
          </p>
        </div>
      </section>

      <div style="text-align:center; padding-top:20px; border-top:1px solid var(--border);">
        <div style="font-size:10px; letter-spacing:2px; color:rgba(255,255,255,0.4); font-weight:bold;">WINNER STORE — GUÍA DE TALLAS OFICIAL 2026</div>
      </div>

    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
};
