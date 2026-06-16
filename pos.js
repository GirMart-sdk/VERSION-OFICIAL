/* ═══════════════════════════════════════════════════════
   WINNER — pos.js (Punto de Venta)
   ═══════════════════════════════════════════════════════ */

let posCurrentPaymentMethod = null;
let _payTimeRange = "all";

// Inicialización de estado global para evitar errores de renderizado
window.WinnerApp = window.WinnerApp || {
  pos: {
    cart: [],
    activeCategory: "all",
  },
};

function renderPOSProducts() {
  try {
    const list = $("posProductList");
    const searchInput = $("posSearch");
    const q = searchInput ? searchInput.value.toLowerCase() : "";
    const catFilter =
      window.WinnerApp.pos.activeCategory === "all"
        ? ""
        : window.WinnerApp.pos.activeCategory;

    if (!list) return;
    if (!window.inventory || window.inventory.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--gray-text)">Cargando productos...</div>';
      return;
    }

    const items = window.inventory.filter(
      (p) =>
        totalStock(p) > 0 &&
        (p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          !q) &&
        (!catFilter || p.cat.toLowerCase() === catFilter.toLowerCase()),
    );

    if (items.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--gray-text)">Sin productos disponibles</div>';
      return;
    }

    list.innerHTML = items
      .map((p) => {
        const ts = totalStock(p);
        const stat = stockStatus(ts);

        return `
        <div class="pos-product-card" data-product-id="${p.id}" id="prod-card-${p.id}">
          <img src="${p.img || p.image}" alt="${p.name}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 200 200%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23333%22 font-family=%22sans-serif%22 font-size=%2212%22%3ESin foto%3C/text%3E%3C/svg%3E'"/>
          <span class="ppc-stock-tag ${stat.cls}">${ts} DISP.</span>
          <div class="pos-product-card-info">
            <div class="ppc-cat">${p.cat}</div>
            <div class="ppc-name">${p.name}</div>
            <div class="ppc-price">${fmt(p.price)}</div>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".pos-product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.productId;
        const product = window.inventory.find(
          (p) => String(p.id) === String(id),
        );
        if (product) openPOSSizeSelector(product);
      });
    });
  } catch (e) {
    console.error("❌ Error en renderPOSProducts:", e);
  }
}

function setPOSCategory(cat) {
  window.WinnerApp.pos.activeCategory = cat;
  document
    .querySelectorAll(".pos-tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.cat === cat));
  renderPOSProducts();
}
window.posSearchProducts = renderPOSProducts;

function openQRScannerPOS() {
  if (typeof setScanMode === "function") setScanMode("pos");
  navigateTo("qrscan");
  if (typeof startProductQRScanner === "function") startProductQRScanner();
}

function printReceipt(sale) {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) {
    console.warn("⚠️ Ventana de impresión bloqueada por el navegador.");
    toast("⚠️ Permite las ventanas emergentes para imprimir el ticket.");
    return;
  }
  const method = (sale.method || "Efectivo").toUpperCase();
  const isLayaway = sale.payment_details?.isLayaway;
  const abono = sale.payment_details?.abonoAmount || 0;
  const saldo = Math.max(0, sale.total - abono);

  win.document.write(`<html><head><meta charset="UTF-8">
    <style>body{font-family:monospace;padding:20px;font-size:13px;max-width:320px;margin:0 auto}
    h2{text-align:center;letter-spacing:4px;font-size:20px}
    .line{border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between}
    .total{font-size:18px;font-weight:900}</style>
  </head><body>
    <h2 style="margin-bottom:0">W●NNER</h2><p style="text-align:center;font-size:10px;margin-top:5px;letter-spacing:1px">STREETWEAR COLOMBIA</p>
    ${isLayaway ? '<h3 style="text-align:center; border:1px solid #000; padding:5px; margin-top:10px; font-size:14px;">TICKET DE SEPARADO</h3>' : ""}
    <div class="line"></div>
    <p>Fecha: ${fmtDate(sale.timestamp)}</p>
    <p>Ticket: ${sale.id.slice(-8).toUpperCase()}</p>
    <p>Cliente: ${sale.client || "Mostrador"}</p>
    <div class="line"></div>
    ${sale.items.map((i) => `<div class="row"><span>${i.name} ×${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("")}
    <div class="line"></div>
    <div class="row total"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
    ${
      isLayaway
        ? `
      <div class="row"><span>Abono Inicial:</span><span>${fmt(abono)}</span></div>
      <div class="row" style="font-weight:700; font-size:15px; margin-top:5px;"><span>SALDO PENDIENTE:</span><span>${fmt(saldo)}</span></div>
      <div class="line"></div>
    `
        : ""
    }
    <div class="line" style="border-style: solid"></div>
    <p>MÉTODO: <strong>${method}</strong></p>
    <div class="line"></div>
    <p style="text-align:center;font-size:11px">¡Gracias por tu compra!</p>
  </body></html>`);
  win.document.close();
  win.print();
}

function updatePOSQty(idx, delta) {
  window.WinnerApp.pos.cart[idx].qty += delta;
  if (window.WinnerApp.pos.cart[idx].qty <= 0)
    window.WinnerApp.pos.cart.splice(idx, 1);
  renderPOSCart();
}

function clearPOS() {
  if (window.WinnerApp.pos.cart.length > 0 && !confirm("¿Vaciar venta actual?"))
    return;
  window.WinnerApp.pos.cart = [];
  if ($("posSearch")) $("posSearch").value = "";
  if ($("posVendor")) $("posVendor").value = "";
  if ($("posClient")) $("posClient").value = "";
  if ($("posDiscount")) $("posDiscount").value = "0";
  renderPOSCart();
}

function openPOSSizeSelector(product) {
  const modal = $("posSizeModal");
  const overlay = $("posSizeOverlay");
  const grid = $("posSizeGrid");

  // Si es accesorio, omitimos el modal de tallas y usamos la talla única "U"
  if (
    product.cat.toLowerCase().includes("accesorio") ||
    product.cat.toLowerCase().includes("reloj") ||
    product.cat.toLowerCase().includes("joya") ||
    product.cat.toLowerCase().includes("loción") ||
    product.cat.toLowerCase().includes("gorra")
  ) {
    return addToPOSCart(product, "U");
  }

  if (!hasSizes(product.cat)) {
    addToPOSCart(product, "U");
    return;
  }
  const sizes = getSizesForCategory(product.cat);
  const isShoes =
    product.cat.toLowerCase().includes("calzado") ||
    product.cat.toLowerCase().includes("tenis");

  grid.innerHTML = sizes
    .map((sz, index) => {
      const qty = product.stock[sz] || 0;
      const isDisabled = qty <= 0;

      let label = sz;
      if (isShoes) {
        const corr = getFootwearCorrespondence(sz);
        label = `
          <div style="line-height:1.1">
            <span style="font-size:16px; color:var(--white)">${sz} <small>EU</small></span><br>
            <span style="font-size:11px; color:var(--accent); font-weight:bold;">NAL: ${corr.nal}</span>
          </div>`;
      }

      return `<button class="ftab pos-size-item ${isDisabled ? "disabled" : ""}" 
          style="width:100%; border:1px solid var(--border); padding:15px; font-weight:bold; cursor:pointer;"
          ${isDisabled ? "disabled" : `onclick="addToPOSCartById('${product.id}', '${sz}'); closePOSSizeModal();"`}>
          ${label}<br><small style="font-size:9px; opacity:0.6">${qty} u.</small></button>`;
    })
    .join("");
  overlay.classList.add("open");
  modal.classList.add("open");
}

function closePOSSizeModal() {
  $("posSizeOverlay").classList.remove("open");
  $("posSizeModal").classList.remove("open");
}

function closePOSPaymentModal() {
  $("posPayOverlay")?.classList.remove("open");
  $("posPayModal")?.classList.remove("open");
}

window.togglePOSShippingFields = () => {
  const needsShipping = $("posPayNeedsShipping").checked;
  $("posShippingFieldsGroup").style.display = needsShipping ? "block" : "none";
  // Limpiar campos si se desactiva el envío
  if (!needsShipping) {
    if ($("posShippingAddress")) $("posShippingAddress").value = "";
    if ($("posCustomerPhone")) $("posCustomerPhone").value = "";
    if ($("posShippingCarrier")) $("posShippingCarrier").value = "";
  }
};

window.addToPOSCartById = (id, sz) => {
  const p = window.inventory.find((x) => String(x.id) === String(id));
  if (p) addToPOSCart(p, sz);
};

function addToPOSCart(product, size) {
  if (!window.WinnerApp.pos.cart) window.WinnerApp.pos.cart = [];

  // Validar stock real antes de agregar
  const availableStock = product.stock[size] || product.stock.qty || 0;
  const currentInCart = window.WinnerApp.pos.cart
    .filter((i) => String(i.id) === String(product.id) && i.size === size)
    .reduce((a, b) => a + b.qty, 0);

  if (currentInCart + 1 > availableStock) {
    return toast(`❌ Stock insuficiente para ${product.name} (${size})`);
  }

  const existing = window.WinnerApp.pos.cart.find(
    (i) => String(i.id) === String(product.id) && i.size === size,
  );
  if (existing) existing.qty++;
  else
    window.WinnerApp.pos.cart.push({
      id: product.id,
      sku: product.sku || "",
      name: product.name,
      price: product.price,
      size,
      qty: 1,
    });

  // Disparar animación visual
  animateAddToCart(product.id);
  renderPOSCart();
  toast(`✓ ${product.name} (${size}) agregado`);
}

function animateAddToCart(productId) {
  const card = document.getElementById(`prod-card-${productId}`);
  const cart = document.getElementById("posRightPanel");
  if (!card || !cart) return;

  const rect = card.getBoundingClientRect();
  const cartRect = cart.getBoundingClientRect();

  const fly = document.createElement("div");
  fly.className = "fly-item";
  fly.style.left = rect.left + "px";
  fly.style.top = rect.top + "px";
  document.body.appendChild(fly);

  setTimeout(() => {
    fly.style.left = cartRect.left + "px";
    fly.style.top = cartRect.top + "px";
    fly.style.opacity = "0";
    fly.style.transform = "scale(0.2)";
    cart.classList.add("cart-glow");
  }, 10);

  setTimeout(() => {
    fly.remove();
    cart.classList.remove("cart-glow");
  }, 600);
}

function renderPOSCart() {
  const container = $("posItems");
  if (!container) return;
  if (!window.WinnerApp.pos.cart || window.WinnerApp.pos.cart.length === 0) {
    container.innerHTML =
      '<div class="pos-empty">Sin productos agregados</div>';
    if (typeof updatePOSTotals === "function") updatePOSTotals();
    return;
  }
  container.innerHTML = window.WinnerApp.pos.cart
    .map(
      (it, idx) => `
    <div class="pos-item-row" style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;">
      <div style="flex:1">
        <div style="font-size: 13px; font-weight: 600;">${it.name}</div>
        <div style="font-size: 11px; color: var(--gray-text);">Talla: ${it.size} | ${fmt(it.price)}</div>
      </div>
      <div class="pos-qty-ctrl">
        <button onclick="updatePOSQty(${idx}, -1)">-</button>
        <span>${it.qty}</span>
        <button onclick="updatePOSQty(${idx}, 1)">+</button>
      </div>
      <div style="font-weight:700; color:var(--accent); min-width:80px; text-align:right">${fmt(it.price * it.qty)}</div>
      <button class="action-btn del" onclick="removeFromPOS(${idx})">✕</button>
    </div>`,
    )
    .join("");
  updatePOSTotals();
}

function removeFromPOS(index) {
  window.WinnerApp.pos.cart.splice(index, 1);
  renderPOSCart();
}

function updatePOSTotals() {
  const sub = window.WinnerApp.pos.cart.reduce(
    (s, i) => s + i.price * i.qty,
    0,
  );
  const disc = parseFloat($("posDiscount")?.value || 0);
  const total = sub * (1 - disc / 100);
  if ($("posSubtotal")) $("posSubtotal").textContent = fmt(sub);
  if ($("posTotal")) $("posTotal").textContent = fmt(Math.round(total));
}

function openPOSPaymentModal(isLayawayInitially = false) {
  if (!window.WinnerApp.pos.cart || !window.WinnerApp.pos.cart.length)
    return toast("⚠️ Carrito vacío");
  const grid = $("posPayMethodsGrid");
  if (!grid) return;

  const allMethods = [
    ...(window.payMethods?.national || []),
    ...(window.payMethods?.wallets || []),
    ...(window.payMethods?.delivery || []),
    ...(window.payMethods?.intl || []),
  ].filter((m) => m.enabled);

  grid.innerHTML = allMethods
    .map(
      (m) => `
    <button class="pos-pay-option-btn" onclick="${m.id === "qr_tienda" ? `alert('Muestre el código QR al cliente'); selectPOSPaymentMethod('${m.id}', '${m.name}', '${m.type}')` : `selectPOSPaymentMethod('${m.id}', '${m.name}', '${m.type}')`}" 
      style="padding:12px;border:2px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px">
      <span>${m.icon}</span> <div><strong>${m.name}</strong><br><small>${m.type}</small></div>
    </button>`,
    )
    .join("");

  if ($("posPayTotal"))
    $("posPayTotal").textContent = $("posTotal").textContent;
  $("posPayOverlay").classList.add("open");
  $("posPayModal").classList.add("open");
  $("posPayStep1").style.display = "block";

  // Pre-configurar si es separado
  if ($("posPayIsLayaway")) {
    $("posPayIsLayaway").checked = isLayawayInitially;
    toggleLayawayFields();
  }

  // Resetear campos de envío
  if ($("posPayNeedsShipping")) $("posPayNeedsShipping").checked = false;
  if ($("posShippingFieldsGroup"))
    $("posShippingFieldsGroup").style.display = "none";
  if ($("posShippingAddress")) $("posShippingAddress").value = "";
  if ($("posCustomerPhone")) $("posCustomerPhone").value = "";
  if ($("posShippingCarrier")) $("posShippingCarrier").value = "";
  $("posPayStep2").style.display = "none";
  $("posPayConfirmBtn").style.display = "none";
  $("posPayBackBtn").style.display = "none";
}

window.selectPOSPaymentMethod = function (id, name, type) {
  posCurrentPaymentMethod = { id, name, type };
  $("posPayMethod").textContent = `${name} (${type})`;
  $("posPayStep1").style.display = "none";
  $("posPayStep2").style.display = "block";
  $("posPayConfirmBtn").style.display = "block";
  $("posPayBackBtn").style.display = "block";

  // Ocultar todos los formularios de detalles de pago específicos primero
  document
    .querySelectorAll('[id^="posPayForm"]')
    .forEach((f) => (f.style.display = "none"));

  // Mostrar el formulario relevante según el ID del método seleccionado
  let formToShow = null;

  if (id === "cod" || id === "cash") {
    formToShow = $("posPayFormCash");
  } else if (id === "wompi") {
    // Para Wompi en tienda física, usualmente registramos los detalles de la tarjeta o voucher
    formToShow = $("posPayFormCard");
    if ($("posPayCardRef"))
      $("posPayCardRef").placeholder = "Ref. Voucher o Aprobación";
  }

  if (formToShow) {
    formToShow.style.display = "block";
  }
};

window.posPayBackToMethods = () => {
  $("posPayStep1").style.display = "block";
  $("posPayStep2").style.display = "none";
  $("posPayConfirmBtn").style.display = "none";
  $("posPayBackBtn").style.display = "none";
};

window.calcCashChange = () => {
  const totalRaw = $("posTotal").textContent.replace(/[^0-9-]/g, "");
  const total = parseFloat(totalRaw) || 0;
  const isLayaway = $("posPayIsLayaway").checked;
  const received = parseFloat($("posPayCashReceived").value) || 0;
  const abono = parseFloat($("posPayAbonoAmount").value) || 0;
  const target = isLayaway ? abono : total;
  $("posPayCashChange").textContent = fmt(Math.max(0, received - target));
};

window.toggleLayawayFields = () => {
  $("layawayAmountGroup").style.display = $("posPayIsLayaway").checked
    ? "block"
    : "none";
};

async function confirmPOSPaymentWithDetails() {
  const totalRaw = $("posTotal").textContent.replace(/[^0-9-]/g, "");
  const total = parseFloat(totalRaw);
  if (isNaN(total) || total <= 0) return toast("⚠️ Total inválido");
  if (!posCurrentPaymentMethod) return toast("⚠ Selecciona método de pago");

  const isLayaway = $("posPayIsLayaway").checked;
  const abono = parseFloat($("posPayAbonoAmount").value) || 0;
  if (isLayaway && abono <= 0) return toast("⚠️ Ingresa el abono");

  const needsShipping = $("posPayNeedsShipping").checked;
  const confirmBtn = $("posPayConfirmBtn");
  let shippingAddress = "";
  let customerPhone = "";
  let shippingCarrier = "";
  // Acceso seguro al email con fallback
  let customerEmail = $("posPayEmail")?.value?.trim() || "";

  // Validar formato de email si no está vacío
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return toast("⚠️ El formato del correo electrónico es inválido");
  }

  // El shippingStatus ahora se usa como "Estado del Separado"
  let shippingStatus = isLayaway ? "ABONO" : "PENDIENTE";

  if (needsShipping) {
    shippingAddress = $("posShippingAddress").value.trim();
    customerPhone = $("posCustomerPhone").value.trim();
    shippingCarrier = $("posShippingCarrier").value.trim();
    if (!shippingAddress || !customerPhone || !shippingCarrier) {
      return toast("⚠️ Completa los detalles de envío");
    }
  }

  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const sale = {
      id: genId(),
      timestamp: nowStr(),
      items: window.WinnerApp.pos.cart,
      total: total,
      method: posCurrentPaymentMethod.name,
      payment_method: posCurrentPaymentMethod.name,
      channel: "fisica",
      vendor: $("posVendor")?.value || "Admin",
      client: $("posClient")?.value || "Mostrador",
      customer_email: customerEmail, // Añadir el email del cliente a los datos de la venta
      customer_phone:
        customerPhone || $("posCustomerPhone")?.value.trim() || "",
      payment_status: isLayaway ? "partial" : "completed",
      shipping_address:
        shippingAddress || (isLayaway ? "Apartado en Tienda" : "Venta Directa"),
      shipping_carrier: shippingCarrier || "Físico",
      // Detalles de pago y envío (fusionados)
      payment_details: {
        shipping_status: shippingStatus,
        isLayaway,
        abonoAmount: abono,
        received: parseFloat($("posPayCashReceived")?.value) || 0,
      },
    };

    toast("⌛ Procesando...");

    const res = await apiFetch(`${window.API_URL}/sales`, {
      method: "POST",
      body: JSON.stringify(sale),
    });
    if (res.ok) {
      if (typeof toast.clear === "function") toast.clear(); // Ocultar "Procesando"
      toast("✅ Venta registrada");
      printReceipt(sale);
      window.WinnerApp.pos.cart = []; // Limpiar carrito global
      renderPOSCart();
      closePOSPaymentModal();
      refreshAll();
      if (typeof renderDashboard === "function") renderDashboard();
    } else {
      const err = await res.json().catch(() => ({}));
      toast("❌ Error: " + (err.error || "No se pudo registrar"));
    }
  } catch (e) {
    toast("❌ " + e.message);
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

window.renderPOSProducts = renderPOSProducts;
window.setPOSCategory = setPOSCategory;
window.openQRScannerPOS = openQRScannerPOS;
window.updatePOSQty = updatePOSQty;
window.removeFromPOS = removeFromPOS;
window.clearPOS = clearPOS;
window.openPOSSizeSelector = openPOSSizeSelector;
window.closePOSSizeModal = closePOSSizeModal;
window.openPOSPaymentModal = openPOSPaymentModal;
window.closePOSPaymentModal = closePOSPaymentModal;
window.confirmPOSPaymentWithDetails = confirmPOSPaymentWithDetails;

let activeScannerInstance = null;

/**
 * Detiene la cámara y restablece los botones de la interfaz.
 */
window.stopProductQRScanner = async function () {
  if (activeScannerInstance) {
    try {
      await activeScannerInstance.stop();
      activeScannerInstance = null;
    } catch (err) {
      console.warn("Scanner stop error:", err);
    }
  }
  // Restablecer botones (Principal y Modal)
  if ($("startScanBtn")) $("startScanBtn").style.display = "inline-block";
  if ($("stopScanBtn")) $("stopScanBtn").style.display = "none";
  if ($("productScanBtn")) $("productScanBtn").style.display = "inline-block";
  if ($("productScanStopBtn")) $("productScanStopBtn").style.display = "none";
};

/**
 * Inicia el escáner de productos para la tienda física.
 * Al detectar un código de barras, busca la talla exacta y la agrega al carrito.
 */
window.startProductQRScanner = function () {
  // Verificación de seguridad de navegador (Cámara requiere HTTPS o Localhost)
  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return toast(
      "❌ Error: El acceso a la cámara requiere conexión segura (HTTPS)",
    );
  }

  // Detectar dinámicamente qué contenedor usar
  let containerId = "qr-reader-main";
  const isModalActive = $("productModal")?.classList.contains("open");
  if (isModalActive) containerId = "qr-reader-modal";

  const scannerContainer = $(containerId);
  if (!scannerContainer) {
    return toast("⚠️ No se encontró el área de proyección de cámara");
  }

  // Ocultar placeholder si existe
  const placeholder = $("productScanPlaceholder");
  if (placeholder) placeholder.style.display = "none";

  // Cambiar texto de botón para feedback UX
  const startBtn = $("startScanBtn") || $("productScanBtn");
  const stopBtn = $("stopScanBtn") || $("productScanStopBtn");

  if (startBtn) startBtn.style.display = "none";
  if (stopBtn) stopBtn.style.display = "inline-block";

  activeScannerInstance = new Html5Qrcode(scannerContainer.id);
  // Optimización para códigos de barras: qrbox más ancho que alto
  const config = {
    fps: 20,
    qrbox: { width: 300, height: 150 },
    aspectRatio: 1.0,
  };

  activeScannerInstance
    .start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        // Éxito al escanear
        console.log("🔍 Código detectado:", decodedText);

        try {
          // 1. Detener cámara inmediatamente para evitar múltiples lecturas y limpiar UI
          await window.stopProductQRScanner();
          toast("⌛ Buscando producto...");

          // 2. Si estamos en el modal de productos, intentamos autocompletar en lugar de agregar al carrito
          if (isModalActive) {
            if ($("pSku")) $("pSku").value = decodedText;
            toast("✅ Código asignado al producto");
            return;
          }

          // Consultar a nuestro backend por el código de barras
          const res = await apiFetch(
            `${API_URL}/inventory/barcode/${decodedText}`,
          );
          if (!res.ok) throw new Error("Producto no registrado");

          const item = await res.json();

          // Usamos la función existente para agregar al carrito con la talla detectada
          window.addToPOSCartById(item.productId, item.size);
        } catch (err) {
          toast("❌ " + err.message);
          console.error("Error Scanner:", err);
        }
      },
      (errorMessage) => {
        /* Ignorar errores de frame */
      },
    )
    .catch((err) => {
      window.stopProductQRScanner();
      toast("❌ No se pudo acceder a la cámara");
      console.error(err);
    });
};

/* ── MANUAL PAYMENT REGISTRATION ── */

window.openPayRegMethodModal = function () {
  const grid = $("payRegMethodsGrid");
  if (!grid) return;
  const methods = [
    ...(window.payMethods?.national || []),
    ...(window.payMethods?.wallets || []),
    ...(window.payMethods?.delivery || []),
    ...(window.payMethods?.intl || []),
  ].filter((m) => m.enabled);

  grid.innerHTML = methods
    .map(
      (m) => `
    <button class="pos-pay-option-btn" style="flex-direction:column; align-items:center; text-align:center; padding:15px; height:auto; gap:8px;" 
      onclick="window.selectPayRegMethod('${m.id}', '${m.name}', '${m.icon}')">
      <span style="font-size:24px">${m.icon}</span>
      <span style="font-size:12px; font-weight:700; color:white;">${m.name}</span>
      <span style="font-size:9px; color:var(--gray-text); text-transform:uppercase;">${m.type}</span>
    </button>`,
    )
    .join("");
  $("payRegMethodOverlay").classList.add("open");
  $("payRegMethodModal").classList.add("open");
};

window.closePayRegMethodModal = () => {
  $("payRegMethodOverlay")?.classList.remove("open");
  $("payRegMethodModal")?.classList.remove("open");
};

window.selectPayRegMethod = (id, name, icon) => {
  $("payRegMethodValue").value = id; // Almacenar el ID del método para lógica interna
  $("payRegMethodSelected").innerHTML =
    `<span style="margin-right:8px">${icon}</span> ${name}`;
  window.closePayRegMethodModal();

  const refGroup = $("payRegRefGroup");
  const refInput = $("payRegRef");
  const instructionsDiv = $("payRegMethodInstructions");

  // Restablecer visibilidad y texto por defecto
  if (refGroup) refGroup.style.display = "flex"; // Por defecto visible
  if (refInput) refInput.placeholder = "REF-2026-001";
  if (instructionsDiv) instructionsDiv.innerHTML = "";

  // Lógica dinámica según el método seleccionado
  switch (id) {
    case "cod": // Contra Entrega
      if (refGroup) refGroup.style.display = "none";
      if (instructionsDiv)
        instructionsDiv.innerHTML =
          "El cliente pagará en efectivo al recibir el pedido. No se requiere referencia de transacción.";
      break;
    case "epayco": // Nequi/Daviplata
      if (refInput) refInput.placeholder = "ID de transacción Nequi/Daviplata";
      if (instructionsDiv)
        instructionsDiv.innerHTML =
          "Solicita al cliente el ID de la transacción de Nequi o Daviplata.";
      break;
    case "payu": // PayU Latam (PSE/Tarjetas)
    case "stripe": // Stripe (Internacional)
      if (refInput)
        refInput.placeholder = "Número de referencia de la pasarela";
      if (instructionsDiv)
        instructionsDiv.innerHTML =
          "Ingresa el número de referencia proporcionado por la pasarela de pago (PayU/Stripe).";
      break;
    case "qr_tienda": // QR Winner (Directo)
      if (refInput) refInput.placeholder = "Referencia del pago QR";
      if (instructionsDiv)
        instructionsDiv.innerHTML =
          "Confirma el pago escaneando el QR del cliente o verificando la referencia.";
      break;
    default: // Para otros métodos como 'addi', 'sistecredito', o nuevos
      if (instructionsDiv)
        instructionsDiv.innerHTML =
          "Ingresa una referencia si es necesario (ej. número de aprobación, nombre del cliente).";
      break;
  }
};

window.registerPayment = () => {
  const method = $("payRegMethodValue").value;
  const amount = parseFloat($("payRegAmount").value);
  if (!method || !amount) return toast("⚠️ Datos incompletos");
  const entry = {
    id: genId(),
    ts: nowStr(),
    // Buscar el nombre del método para el registro, ya que 'method' ahora almacena el ID
    method: (
      [
        ...(window.payMethods?.national || []),
        ...(window.payMethods?.wallets || []),
        ...(window.payMethods?.delivery || []),
        ...(window.payMethods?.intl || []),
      ].find((m) => m.id === method) || { name: method }
    ).name,
    amount,
    ref: $("payRegRef").value,
  };
  window.payLog.unshift(entry);
  LS.set("payLog", window.payLog);
  window.renderPaymentsTable();
  toast("✅ Cobro registrado");
};

/* ── PAYMENTS HISTORY ── */

window.setPayTimeFilter = (range) => {
  _payTimeRange = range;
  const container = document.querySelector("#page-payments .phc-quick-filters");
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
  if (range !== "custom" && $("payFilterDate")) $("payFilterDate").value = "";
  window.renderPaymentsTable();
};

window.resetPayFilters = () => {
  if ($("payFilterDate")) $("payFilterDate").value = "";
  if ($("payFilterMethod")) $("payFilterMethod").value = "";
  window.setPayTimeFilter("all");
};

window.renderPaymentsTable = function () {
  const container = $("paymentsBody")?.parentElement?.parentElement; // Contenedor table-wrap o similar
  if (!container) return;

  const sLog = Array.isArray(window.salesLog) ? window.salesLog : [];
  const pLog = Array.isArray(window.payLog) ? window.payLog : [];

  let payList = [
    ...sLog
      .map((s) => ({
        ...s,
        ts: s.timestamp,
        amount: s.total,
        isSale: true,
      }))
      .filter((p) => {
        // Solo incluir ventas que NO estén canceladas
        const status = p.payment_details?.shipping_status || "PENDIENTE";
        return status !== "CANCELADO";
      }),
    ...pLog.map((p) => ({ ...p, isManual: true })),
  ];

  const dateFilter = $("payFilterDate")?.value;
  const methodFilter = $("payFilterMethod")?.value;

  if (dateFilter) {
    payList = payList.filter((p) => p.ts.startsWith(dateFilter));
  } else if (_payTimeRange !== "all") {
    const todayStr = getTodayStr();
    if (_payTimeRange === "today") {
      payList = payList.filter((p) => p.ts.startsWith(todayStr));
    } else if (_payTimeRange === "yesterday") {
      const yestStr = getPastDate(1);
      payList = payList.filter((p) => p.ts.startsWith(yestStr));
    } else if (_payTimeRange === "week") {
      const weekAgoStr = getPastDate(7);
      payList = payList.filter((p) => p.ts >= weekAgoStr);
    } else if (_payTimeRange === "month") {
      const monthAgoStr = getPastDate(30);
      payList = payList.filter((p) => p.ts >= monthAgoStr);
    }
  }

  if (methodFilter) {
    payList = payList.filter((p) =>
      (p.method || "").toLowerCase().includes(methodFilter.toLowerCase()),
    );
  }

  payList.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  // ── DIVISIÓN DE DATOS ──────────────────────────────────
  const orders = payList.filter(
    (p) =>
      (p.method || "").startsWith("WOMPI") ||
      p.method === "COD" ||
      p.channel === "online",
  );

  const locals = payList.filter(
    (p) =>
      !(
        (p.method || "").startsWith("WOMPI") ||
        p.method === "COD" ||
        p.channel === "online"
      ),
  );

  const totalAmount = payList.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );

  // Helper para renderizar las filas de cada sección
  const renderRows = (list) => {
    if (!list.length)
      return '<div style="text-align:center; padding:20px; color:var(--gray-text)">No hay registros</div>';
    return list
      .map(
        (p) => `
        <div class="activity-item" style="padding:15px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.01)">
          <div style="display:flex; gap:15px; align-items:center;">
            <div style="font-size:20px">${(p.method || "").includes("WOMPI") ? "💎" : p.method === "COD" ? "🚚" : "💵"}</div>
            <div>
              <div style="font-weight:600; font-size:14px; color:white;">${esc(p.client || "Mostrador")}</div>
              <div style="font-size:11px; color:var(--gray-text); margin-top:2px;">
                ${fmtDate(p.ts)} • <span style="color:var(--accent)">${esc(p.method || "Efectivo")}</span>
              </div>
              <div style="font-size:10px; color:var(--gray3); font-family:monospace; margin-top:2px;">REF: ${esc(p.ref || p.id.slice(-6))}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; color:var(--accent); font-size:17px;">${fmt(p.amount)}</div>
            <div style="margin-top:5px; display:flex; gap:5px; justify-content:flex-end;">
               <span class="status-badge s-ok" style="font-size:9px; padding:2px 6px;">${p.isSale ? "VENTA" : "COBRO"}</span>
               <button class="btn-ghost-sm" style="padding:2px 8px" onclick="${p.isSale ? `viewSaleDetails('${p.id}')` : `alert('Ref: ${esc(p.ref)}')`}">👁 VER</button>
            </div>
          </div>
        </div>`,
      )
      .join("");
  };

  // Reemplazamos la tabla entera por una estructura de "Ventanitas" (Acordeones)
  container.innerHTML = `
    <div class="payments-accordion-wrap" style="display:flex; flex-direction:column; gap:15px;">
      
      <!-- SECCIÓN DE RESUMEN VERTICAL (KPIs) -->
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:5px;">
        <div class="dash-neon-box" style="padding:15px 25px; flex-direction:row; justify-content:space-between; align-items:center;">
           <div style="text-align:left">
             <span class="dash-label-impact" style="margin-bottom:2px">TOTAL RECAUDADO</span>
             <span class="dash-val-large" style="font-size:32px; color:var(--white)">${fmt(totalAmount)}</span>
           </div>
           <div style="text-align:right">
             <span class="dash-label-impact" style="margin-bottom:2px">OPERACIONES</span>
             <span class="dash-val-large" style="font-size:32px; color:var(--accent)">${payList.length}</span>
           </div>
        </div>
      </div>

      <!-- VENTANITA 1: PEDIDOS ONLINE -->
      <div class="dash-neon-box" style="padding:0; overflow:hidden; display:block;">
        <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('hidden')" 
             style="padding:15px 20px; background:rgba(232, 255, 71, 0.08); display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid var(--border);">
          <span style="font-family:'Bebas Neue'; letter-spacing:2px; color:var(--accent); font-size:20px;">
            📦 PEDIDOS ONLINE & PASARELAS (${orders.length})
          </span>
          <div style="text-align:right">
            <div style="font-size:14px; font-weight:800; color:white">${fmt(orders.reduce((s, p) => s + (Number(p.amount) || 0), 0))}</div>
            <div style="font-size:9px; color:var(--gray-text); letter-spacing:1px;">CLICK PARA VER ▾</div>
          </div>
        </div>
        <div class="accordion-body hidden" style="padding:0; background:rgba(0,0,0,0.2)">
          <div class="activity-feed">${renderRows(orders)}</div>
        </div>
      </div>

      <!-- VENTANITA 2: PAGOS LOCALES -->
      <div class="dash-neon-box" style="padding:0; overflow:hidden; display:block;">
        <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('hidden')" 
             style="padding:15px 20px; background:rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid var(--border);">
          <span style="font-family:'Bebas Neue'; letter-spacing:2px; color:white; font-size:20px;">
            🏪 VENTAS LOCALES & CAJA (${locals.length})
          </span>
          <div style="text-align:right">
            <div style="font-size:14px; font-weight:800; color:var(--accent)">${fmt(locals.reduce((s, p) => s + (Number(p.amount) || 0), 0))}</div>
            <div style="font-size:9px; color:var(--gray-text); letter-spacing:1px;">CLICK PARA VER ▾</div>
          </div>
        </div>
        <div class="accordion-body hidden" style="padding:0; background:rgba(0,0,0,0.2)">
          <div class="activity-feed">${renderRows(locals)}</div>
        </div>
      </div>

    </div>
  `;

  if ($("phSummaryTotal")) $("phSummaryTotal").textContent = fmt(totalAmount);
  if ($("phSummaryCount")) $("phSummaryCount").textContent = payList.length;
};

window.exportPaymentsCSV = () => {
  const rows = [["Fecha", "Cliente", "Metodo", "Referencia", "Monto", "Tipo"]];
  const tbody = $("paymentsBody");
  if (!tbody || tbody.querySelector(".empty-row"))
    return toast("⚠️ No hay datos para exportar");

  const trs = tbody.querySelectorAll("tr");
  trs.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 6) {
      rows.push([
        tds[0].innerText,
        tds[1].innerText,
        tds[2].innerText,
        tds[3].innerText,
        tds[4].innerText.replace("$", "").replace(/\./g, ""),
        tds[5].innerText,
      ]);
    }
  });

  const csvContent =
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `pagos_winner_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Alterna la visibilidad de un grupo de filas basado en la fecha
 */
window.toggleDayGroup = function (headerRow, dateKey) {
  const tbody = headerRow.parentElement;
  const rows = tbody.querySelectorAll(`tr[data-day-group="${dateKey}"]`);
  const isHidden = rows[0] && rows[0].style.display === "none";

  rows.forEach((r) => {
    r.style.display = isHidden ? "" : "none";
  });
  headerRow.style.opacity = isHidden ? "1" : "0.6";
};
