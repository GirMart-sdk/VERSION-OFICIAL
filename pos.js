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
        return `
        <div class="pos-product-card" data-product-id="${p.id}" style="cursor:pointer">
          <img src="${p.img}" alt="${p.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&q=60'"/>
          <div class="pos-product-card-info">
            <div class="ppc-cat">${p.cat} <span style="float:right; color:${ts < 10 ? "var(--orange)" : "var(--gray-text)"}">Stock: ${ts}</span></div>
            <div class="ppc-name">${p.name}</div>
            <div class="ppc-sku">${p.sku}</div>
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
  if (typeof startScanner === "function") startScanner();
}

function printReceipt(sale) {
  const win = window.open("", "_blank", "width=380,height=600");
  const method = (sale.method || "Efectivo").toUpperCase();
  win.document.write(`<html><head><meta charset="UTF-8">
    <style>body{font-family:monospace;padding:20px;font-size:13px;max-width:320px;margin:0 auto}
    h2{text-align:center;letter-spacing:4px;font-size:20px}
    .line{border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between}
    .total{font-size:18px;font-weight:900}</style>
  </head><body>
    <h2 style="margin-bottom:0">W●NNER</h2><p style="text-align:center;font-size:10px;margin-top:5px;letter-spacing:1px">STREETWEAR COLOMBIA</p>
    <div class="line"></div>
    <p>Fecha: ${fmtDate(sale.timestamp)}</p>
    <p>Ticket: ${sale.id.slice(-8).toUpperCase()}</p>
    <p>Cliente: ${sale.client || "Mostrador"}</p>
    <div class="line"></div>
    ${sale.items.map((i) => `<div class="row"><span>${i.name} ×${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("")}
    <div class="line"></div>
    <div class="row total"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
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
  if (!hasSizes(product.cat)) {
    addToPOSCart(product, "U");
    return;
  }
  const sizes = getSizesForCategory(product.cat);
  grid.innerHTML = sizes
    .map((sz, index) => {
      const qty = product.stock[sz] || 0;
      const isDisabled = qty <= 0;
      return `<button class="ftab pos-size-item ${isDisabled ? "disabled" : ""}" 
          style="width:100%; border:1px solid var(--border); padding:15px; font-weight:bold; cursor:pointer;"
          ${isDisabled ? "disabled" : `onclick="addToPOSCartById('${product.id}', '${sz}'); closePOSSizeModal();"`}>
          ${sz}<br><small style="font-size:9px; opacity:0.6">${qty} u.</small></button>`;
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
      name: product.name,
      price: product.price,
      size,
      qty: 1,
    });
  renderPOSCart();
  toast(`✓ ${product.name} (${size}) agregado`);
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

function openPOSPaymentModal() {
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
  if (id === "cod") {
    // "Contra Entrega" se comporta como un pago en efectivo
    formToShow = $("posPayFormCash");
  } else if (id === "payu" || id === "stripe") {
    // PayU y Stripe suelen involucrar pagos con tarjeta
    formToShow = $("posPayFormCard");
  } else if (id === "epayco") {
    // ePayco para Nequi/Daviplata
    formToShow = $("posPayFormMobile");
  }
  // Para otros métodos como 'addi', 'sistecredito', 'qr_tienda', 'paypal',
  // que no requieren campos de entrada específicos en el POS, no se mostrará
  // ningún formulario adicional. Solo se verá el total y el nombre del método.
  // Si se desea un formulario específico para estos, se debería añadir a admin-panel.html
  // y mapearlo aquí.

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
  let shippingStatus = "";

  if (needsShipping) {
    shippingAddress = $("posShippingAddress").value.trim();
    customerPhone = $("posCustomerPhone").value.trim();
    shippingCarrier = $("posShippingCarrier").value.trim();
    if (!shippingAddress || !customerPhone || !shippingCarrier) {
      return toast("⚠️ Completa los detalles de envío");
    }
    shippingStatus = "PENDIENTE"; // Estado inicial para envíos desde POS
  }

  try {
    const sale = {
      id: genId(),
      timestamp: nowStr(),
      items: window.WinnerApp.pos.cart,
      total: total,
      method: posCurrentPaymentMethod.name,
      channel: "fisica",
      vendor: $("posVendor")?.value || "Admin",
      client: $("posClient")?.value || "Mostrador",
      payment_status: isLayaway ? "partial" : "completed",
      // Añadir detalles de envío al objeto de venta si aplica
      ...(needsShipping && {
        shipping_address: shippingAddress,
        customer_phone: customerPhone,
        shipping_carrier: shippingCarrier,
      }),
      // Detalles de pago y envío (fusionados)
      payment_details: {
        ...(needsShipping && {
          shipping_status: shippingStatus,
        }),
        isLayaway,
        abonoAmount: abono,
        received: parseFloat($("posPayCashReceived").value) || 0,
      },
    };

    toast("⌛ Procesando...");
    if (confirmBtn) confirmBtn.disabled = true;

    const res = await apiFetch(`${window.API_URL}/sales`, {
      method: "POST",
      body: JSON.stringify(sale),
    });
    if (res.ok) {
      toast("✅ Venta registrada");
      printReceipt(sale);
      if (isLayaway && abono > 0) {
        await apiFetch(`${window.API_URL}/sales/${sale.id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            amount: abono,
            method: sale.method,
            notes: "Abono inicial",
          }),
        });
      }
      window.WinnerApp.pos.cart = []; // Limpiar carrito global
      renderPOSCart();
      closePOSPaymentModal();
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      toast("❌ Error: " + (err.error || "No se pudo registrar"));
    }
  } catch (e) {
    toast("❌ Error: No se pudo contactar con el servidor");
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

/* ══════════════════════════════════════════════════════════
   PAYMENT METHODS MANAGEMENT (Gestión de Pagos)
══════════════════════════════════════════════════════════ */

window.renderPayMethods = function () {
  const renderPaySection = (containerId, methods) => {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = methods
      .map(
        (m) => `
      <div class="pay-method-card ${m.enabled ? "enabled" : ""}" onclick="togglePayMethod('${containerId}','${m.id}')">
        <div class="pmc-main">
          <span class="pmc-icon">${m.icon}</span>
          <div class="pmc-info">
            <div class="pmc-name">${m.name}</div>
            <div class="pmc-type">${m.type}</div>
          </div>
        </div>
        <button class="toggle-switch ${m.enabled ? "on" : ""}"
          aria-label="${m.enabled ? "Desactivar" : "Activar"} ${m.name}">
        </button>
      </div>`,
      )
      .join("");
  };

  if (window.payMethods) {
    renderPaySection("payNational", window.payMethods.national || []);
    renderPaySection("payWallets", window.payMethods.wallets || []);
    renderPaySection("payDelivery", window.payMethods.delivery || []);
    renderPaySection("payIntl", window.payMethods.intl || []);
  }
};

const PAY_SECTION_MAP = {
  payNational: "national",
  payWallets: "wallets",
  payDelivery: "delivery",
  payIntl: "intl",
};

window.togglePayMethod = function (sectionId, methodId) {
  const key = PAY_SECTION_MAP[sectionId];
  if (!key) return;
  const m = window.payMethods[key].find((x) => x.id === methodId);
  if (m) {
    m.enabled = !m.enabled;
    LS.set("payMethods", window.payMethods);
    window.renderPayMethods();
  }
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
  const tbody = $("paymentsBody");
  if (!tbody) return;

  const sLog = Array.isArray(window.salesLog) ? window.salesLog : [];
  const pLog = Array.isArray(window.payLog) ? window.payLog : [];

  let payList = [
    ...sLog.map((s) => ({
      ...s,
      ts: s.timestamp,
      amount: s.total,
      isSale: true,
    })),
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

  let totalAmount = 0;
  if (!payList.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">Sin transacciones registradas</td></tr>';
  } else {
    tbody.innerHTML = payList
      .map((p) => {
        totalAmount += Number(p.amount) || 0;
        return `
        <tr>
          <td>${fmtDate(p.ts)}</td>
          <td>${esc(p.client || "Mostrador")}</td>
          <td>${esc(p.method || "Efectivo")}</td>
          <td style="font-size:11px; color:var(--gray-text);">${esc(p.ref || p.id.slice(-6))}</td>
          <td style="font-weight:700; color:var(--accent);">${fmt(p.amount)}</td>
          <td><span class="status-badge s-ok">${p.isSale ? "VENTA" : "COBRO"}</span></td>
          <td><button class="btn-ghost-sm" onclick="${p.isSale ? `viewSaleDetails('${p.id}')` : `alert('Ref: ${esc(p.ref)}')`}">👁</button></td>
        </tr>`;
      })
      .join("");
  }
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
