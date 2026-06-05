/* ═══════════════════════════════════════════════════════
   WINNER STORE — app.js
   ═══════════════════════════════════════════════════════ */

// ── CONFIGURACIÓN DINÁMICA DE API ────────────────────────
// Detecta automáticamente si estamos en localhost o en la IP 192.168.1.8
window.API_URL = window.location.origin + "/api";
window.API_KEY = "dev-api-key"; // Key por defecto para desarrollo

// Fallback para apiFetch si core.js no carga
if (typeof window.apiFetch !== "function") {
  window.apiFetch = async function (url, options = {}) {
    options.headers = options.headers || {};
    options.headers["x-api-key"] = window.API_KEY;
    return fetch(url, options);
  };
}

/* ── STATE ──────────────────────────────────────────────── */
window.PRODUCTS = [];
let cart = loadCart();
window.activeFilter = "all";
let selectedMethodForFinalize = null;

// Payment flow state
let paymentData = {
  customer: {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  },
  shipping: {
    method: "",
    carrier: "",
    cost: 0,
  },
  payment: {
    method: "",
  },
};

// ═══════════════════════════════════════════════════════
// TRANSPORTADORAS COLOMBIANAS
// ═══════════════════════════════════════════════════════
window.SHIPPING_OPTIONS = [
  {
    id: "servientrega_express",
    name: "Servientrega Express",
    carrier: "Servientrega",
    cost: 18990,
    days: "1-2 días",
    icon: "🚀",
    description: "Express a ciudades principales. Trazabilidad en tiempo real.",
  },
  {
    id: "servientrega_standard",
    name: "Servientrega Estándar",
    carrier: "Servientrega",
    cost: 12990,
    days: "3-5 días",
    icon: "🚚",
    description: "Cobertura nacional. Entrega segura y confiable.",
  },
  {
    id: "4_72",
    name: "4-72 Express",
    carrier: "4-72",
    cost: 21990,
    days: "1-2 días",
    icon: "⚡",
    description: "Cobertura nacional. Entregas rápidas a todo el país.",
  },
  {
    id: "coordinadora",
    name: "Coordinadora",
    carrier: "Coordinadora",
    cost: 14990,
    days: "2-4 días",
    icon: "📦",
    description: "Red nacional. Cobertura en ciudades principales.",
  },
  {
    id: "dhl_colombia",
    name: "DHL Colombia",
    carrier: "DHL Colombia",
    cost: 24990,
    days: "1 día",
    icon: "🌍",
    description: "Envíos internacionales y nacionales express.",
  },
  {
    id: "pickup_bogota",
    name: "Recogida en Bogotá",
    carrier: "Winner Store (Bogotá)",
    cost: 0,
    days: "2-4 horas",
    icon: "🏪",
    description: "Recoge tu pedido en nuestro local de Bogotá.",
  },
  {
    id: "pickup_medellin",
    name: "Recogida en Medellín",
    carrier: "Winner Store (Medellín)",
    cost: 0,
    days: "2-4 horas",
    icon: "🏪",
    description: "Recoge tu pedido en nuestro local de Medellín.",
  },
];

// ═══════════════════════════════════════════════════════
// CONFIGURACIÓN DE PASARELAS DE PAGO
// ═══════════════════════════════════════════════════════
const PAYMENT_GATEWAYS = {
  WOMPI: {
    name: "Wompi (PSE/Tarjetas/Nequi)",
    icon: "💎",
    color: "#e8ff47",
    instructions: "Procesado de forma segura por Bancolombia.",
  },
  COD: {
    name: "Contra Entrega",
    icon: "🚚",
    color: "#ffffff",
    instructions: "Paga en efectivo al recibir tu pedido",
  },
};

async function fetchProducts() {
  try {
    const res = await apiFetch(`${window.API_URL}/products`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error del servidor: ${res.status}`);
    }

    window.PRODUCTS = Array.isArray(data) ? data : [];
    renderProducts(window.activeFilter);

    // Ejecutar render de destacados si el módulo existe
    if (window.FeaturedModule) window.FeaturedModule.render();

    // Ejecutar lógica de promoción inteligente
    if (window.PromoModule) window.PromoModule.init();
  } catch (err) {
    console.error("❌ Error al cargar productos:", err);
    showToast(`❌ ${err.message || "Error de conexión"}`);
  }
}

async function registerOnlineSale(methodName) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = paymentData.shipping.cost || 0;
  const total = subtotal + shippingCost;
  const saleId = "ON" + Date.now().toString(36).toUpperCase();

  const saleData = {
    id: saleId,
    timestamp: new Date().toISOString(),
    vendor: "Tienda Online",
    client: paymentData.customer.name || "Cliente Web",
    customer_email: paymentData.customer.email,
    customer_phone: paymentData.customer.phone,
    shipping_address: paymentData.customer.address, // Directamente en saleData
    shipping_carrier: paymentData.shipping.carrier || "Estándar",
    method: methodName,
    payment_method: methodName, // Añadido para consistencia
    payment_status: "pending", // Todas las ventas online inician en pendiente hasta que se confirme el pago
    reference_number: saleId, // Usar saleId como referencia
    channel: "online",
    subtotal: subtotal,
    discount: 0,
    total: total,
    items: cart.map((i) => ({
      id: i.id,
      productId: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      size: i.size || "M",
    })),
  };

  try {
    console.log("📤 Guardando venta online:", saleData);
    const res = await apiFetch(`${window.API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
    });

    const responseText = await res.text();
    console.log(`📥 Respuesta (${res.status}):`, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("❌ Error parsing response:", responseText);
      return false;
    }

    if (result.success) {
      console.log("✅ Venta registrada en admin:", result.id);
      return saleId;
    } else {
      console.error("⚠️ Server returned error:", result.error);
      return false;
    }
  } catch (err) {
    console.error("❌ Error saving sale:", err);
    return false;
  }
}

/* ── DOM REFS ───────────────────────────────────────────── */
window.DOM = {
  // cursor: document.getElementById('cursor'),
  // cursorRing: document.getElementById('cursor-ring'),
  toast: document.getElementById("toast"),
  toastMsg: document.getElementById("toastMsg"),
  navbar: document.getElementById("navbar"),
  cartToggle: document.getElementById("cartToggle"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartClose: document.getElementById("cartClose"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  cartTotal: document.getElementById("cartTotal"),
  productsGrid: document.getElementById("productsGrid"),
  filterBar: document.getElementById("filterBar"),
  newsletterForm: document.getElementById("newsletterForm"),
  promoCode: document.getElementById("promoCode"),
  menuBtn: document.getElementById("menuBtn"),
  navLinks: document.querySelector(".nav-links"),
};

/* ══════════════════════════════════════════════════════════
   CART PERSISTENCE (localStorage)
══════════════════════════════════════════════════════════ */
function saveCart() {
  try {
    localStorage.setItem("winner_cart", JSON.stringify(cart));
  } catch {}
}

function loadCart() {
  try {
    const data = localStorage.getItem("winner_cart");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   CURSOR — hides automatically on touch devices via CSS
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════════════════════ */
function toggleMobileMenu() {
  DOM.navLinks.classList.toggle("mobile-open");
  DOM.menuBtn.classList.toggle("active");
  document.body.style.overflow = DOM.navLinks.classList.contains("mobile-open")
    ? "hidden"
    : "";
}

// Close mobile menu on navigation
DOM.navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    DOM.navLinks.classList.remove("mobile-open");
    DOM.menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  });
});

/* ══════════════════════════════════════════════════════════
   NAVBAR — scroll effect
══════════════════════════════════════════════════════════ */
window.addEventListener(
  "scroll",
  () => {
    DOM.navbar.classList.toggle("scrolled", window.scrollY > 60);
  },
  { passive: true },
);

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let toastTimer = null;

function showToast(msg) {
  DOM.toastMsg.textContent = msg;
  DOM.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.remove("show"), 2800);
}

/* ══════════════════════════════════════════════════════════
   CART
══════════════════════════════════════════════════════════ */
function openCart() {
  DOM.cartOverlay.classList.add("open");
  DOM.cartDrawer.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  DOM.cartOverlay.classList.remove("open");
  DOM.cartDrawer.classList.remove("open");
  document.body.style.overflow = "";
}

DOM.cartToggle.addEventListener("click", openCart);
DOM.cartClose.addEventListener("click", closeCart);
DOM.cartOverlay.addEventListener("click", closeCart);

// Close with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    // Also close mobile menu
    DOM.navLinks.classList.remove("mobile-open");
    DOM.menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  }
});

function addToCart(productId, sizeId) {
  const product = (window.PRODUCTS || []).find((p) => p.id === productId);
  if (!product) return;

  // Encontrar qué talla seleccionó el usuario si no se pasó por argumento.
  let selectedSize = sizeId;
  if (!selectedSize) {
    const selector = document.querySelector(
      `.size-selector[data-product="${productId}"] .size-btn.active`,
    );
    if (selector) selectedSize = selector.dataset.size;
  }

  // Si aún no hay talla seleccionada, mostramos un error UI o seleccionamos la primera con stock
  if (!selectedSize) {
    const stockObj = product.stock || {};
    const availableSizes = Object.keys(stockObj).filter(
      (s) => product.stock[s] > 0,
    );
    if (availableSizes.length > 0) {
      selectedSize = availableSizes[0];
    } else if (
      product.cat === "accesorios" ||
      product.cat === "accessories" ||
      !product.stock
    ) {
      selectedSize = "U";
    } else {
      showToast(`❌ ${product.name} está agotado`);
      return;
    }
  }

  // Buscar si ya existe EN ESA MISMA TALLA
  const existing = cart.find(
    (i) => i.id === productId && i.size === selectedSize,
  );
  if (existing) {
    // Validar stock
    if (existing.qty + 1 > product.stock[selectedSize]) {
      showToast(`❌ Máximo stock alcanzado para talla ${selectedSize}`);
      return;
    }
    existing.qty++;
  } else {
    cart.push({
      ...product,
      qty: 1,
      size: selectedSize,
      cartId: productId + "_" + selectedSize,
    });
  }

  saveCart();
  renderCart();
  bumpCartCount();

  // Service Intelligence: Abrir carrito automáticamente en el primer item (UX)
  if (cart.length === 1) {
    setTimeout(openCart, 500);
  }
  showToast(`✓ ${product.name} agregado al carrito`);
}
window.addToCart = addToCart;

function removeFromCart(cartId) {
  cart = cart.filter((i) => i.cartId !== cartId);
  saveCart();
  renderCart();
}

function bumpCartCount() {
  DOM.cartCount.classList.add("bump");
  setTimeout(() => DOM.cartCount.classList.remove("bump"), 300);
}

function renderCart() {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  DOM.cartCount.textContent = count;
  DOM.cartTotal.textContent = formatPrice(total);

  if (cart.length === 0) {
    DOM.cartItems.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>Tu carrito está vacío</p>
      </div>`;
    return;
  }

  DOM.cartItems.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <img
        src="${esc(item.img || item.image)}"
        alt="${esc(item.alt)}"
        class="cart-item-img"
        onerror="this.style.background='#252525'"
      />
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}${item.qty > 1 ? ` <span style="color:var(--accent)">×${item.qty}</span>` : ""}</div>
        <div class="cart-item-size">Talla: ${item.size}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <button
        class="cart-item-remove"
        onclick="removeFromCart('${item.cartId}')"
        aria-label="Eliminar ${esc(item.name)}"
      >×</button>
    </div>
  `,
    )
    .join("");
}

/* ══════════════════════════════════════════════════════════
   PAYMENT & CHECKOUT FLOW
══════════════════════════════════════════════════════════ */
// WHATSAPP_PHONE ya está declarado al inicio del archivo

function openPaymentModal() {
  if (cart.length === 0) {
    showToast("🛒 El carrito está vacío");
    return;
  }

  // Reset payment data
  paymentData = {
    customer: { name: "", email: "", phone: "", address: "", city: "" },
    shipping: { method: "", carrier: "", cost: 0 },
    payment: { method: "" },
  };

  // Resetear estado del botón de confirmación
  selectedMethodForFinalize = null;
  const finalizeBtnContainer = document.getElementById(
    "finalizeActionContainer",
  );
  if (finalizeBtnContainer) finalizeBtnContainer.style.display = "none";

  // Reset modal steps
  showPaymentStep(1);

  const overlay = document.getElementById("paymentModalOverlay");
  const modal = document.getElementById("paymentModal");

  overlay.classList.add("open");
  modal.classList.add("open");
}

function closePaymentModal() {
  document.getElementById("paymentModalOverlay").classList.remove("open");
  document.getElementById("paymentModal").classList.remove("open");
}

function showPaymentStep(stepId) {
  document
    .querySelectorAll(".payment-step")
    .forEach((s) => (s.style.display = "none"));
  const element = document.getElementById("paymentStep" + stepId);
  if (element) {
    element.style.display = "block";
  }
}

function continueToPaymentMethod() {
  // Validate customer form
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const city = document.getElementById("customerCity").value.trim();

  if (!name || !email || !phone || !address || !city) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("⚠️ Email inválido");
    return;
  }

  // Store customer data
  paymentData.customer = { name, email, phone, address, city };

  // Persistencia de seguridad: Si se cae el internet, guardamos el progreso
  localStorage.setItem(
    "pending_checkout_customer",
    JSON.stringify(paymentData.customer),
  );

  // Show shipping options (step 2)
  showPaymentStep("2");
  renderShippingOptions();
}

function renderShippingOptions() {
  const container = document.getElementById("shippingOptionsContainer");
  if (!container) {
    // Create container if doesn't exist
    const step2 = document.getElementById("paymentStep2");
    const html = `<div id="shippingOptionsContainer" style="display: flex; flex-direction: column; gap: 12px;"></div>`;
    step2.insertAdjacentHTML("beforeend", html);
  }

  const shippingContainer = document.getElementById("shippingOptionsContainer");

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  // Regla: Envío gratis por compras superiores a $199.900
  const isFreeShippingEligible = subtotal >= 100000; // Por ejemplo, bajar a 100k

  shippingContainer.innerHTML = SHIPPING_OPTIONS.map((option) => {
    const finalCost =
      isFreeShippingEligible && option.cost > 0 ? 0 : option.cost;
    const isSelected = paymentData.shipping.carrier === option.carrier;

    return `
    <div class="shipping-card ${isSelected ? "selected" : ""}" 
         onclick="selectShippingMethod('${option.id}', ${finalCost})" 
         style="padding: 16px; border: 2px solid ${isSelected ? "var(--accent)" : "var(--border)"}; 
                border-radius: 6px; cursor: pointer; transition: all 0.3s; 
                background: ${isSelected ? "rgba(232, 255, 71, 0.05)" : "var(--dark)"}; 
                margin-bottom: 8px; position: relative;">
      ${isSelected ? '<div style="position:absolute; top:10px; right:10px; color:var(--accent);">✓</div>' : ""}
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="font-size: 32px; min-width: 40px;">${option.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: white; font-size: 14px;">${option.name}</div>
          <div style="color: var(--gray-text); font-size: 12px; margin-top: 4px;">${option.carrier} • ${option.days}</div>
          ${isFreeShippingEligible && option.cost > 0 ? '<div style="color:var(--accent); font-size: 11px; margin-top:4px; font-weight:700;">¡APLICA ENVÍO GRATIS!</div>' : ""}
        </div>
        <div style="text-align: right; min-width: 120px;">
          <div style="font-weight: bold; color: ${finalCost === 0 ? "var(--accent)" : "white"}; font-size: 16px;">
            ${finalCost === 0 ? "GRATIS" : formatPrice(finalCost)}
          </div>
        </div>
      </div>
    </div>
  `;
  }).join("");
}

function selectShippingMethod(methodId, cost) {
  const option = SHIPPING_OPTIONS.find((o) => o.id === methodId);
  if (!option) return;

  // Store shipping data
  paymentData.shipping = {
    method: option.name,
    carrier: option.carrier,
    cost: cost,
  };

  // Update summary and move to payment methods
  updatePaymentSummary();
  renderShippingOptions(); // Re-render para mostrar el estado seleccionado
  showPaymentStep("2Payment");
  renderPaymentMethods();
}

/**
 * Carga datos del checkout persistidos en localStorage
 */
function initCheckoutPersistence() {
  const saved = localStorage.getItem("pending_checkout_customer");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (document.getElementById("customerName"))
        document.getElementById("customerName").value = data.name || "";
      if (document.getElementById("customerEmail"))
        document.getElementById("customerEmail").value = data.email || "";
      if (document.getElementById("customerPhone"))
        document.getElementById("customerPhone").value = data.phone || "";
      if (document.getElementById("customerAddress"))
        document.getElementById("customerAddress").value = data.address || "";
      if (document.getElementById("customerCity"))
        document.getElementById("customerCity").value = data.city || "";
    } catch (e) {
      console.warn("No se pudo cargar la persistencia del checkout");
    }
  }
}

function updatePaymentSummary() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = paymentData.shipping.cost || 0;
  const total = subtotal + shipping;

  const summaryHtml = `
    <div style="background: var(--gray); padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span>Subtotal:</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      ${
        shipping > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Envío (${paymentData.shipping.method}):</span>
          <span>${formatPrice(shipping)}</span>
        </div>
      `
          : ""
      }
      <div style="border-top: 1px solid var(--border); padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold;">
        <span>Total:</span>
        <span style="color: var(--accent);">${formatPrice(total)}</span>
      </div>
    </div>
  `;

  const placeholder = document.getElementById("paymentSummary");
  if (placeholder) {
    placeholder.innerHTML = summaryHtml;
  }
}

function renderPaymentMethods() {
  const container = document.getElementById("checkoutPayMethods");
  const methods = [
    {
      id: "WOMPI_CARD",
      name: "Tarjetas de Crédito",
      icon: "💳",
      color: "#00d4ff",
      info: "Visa, Mastercard, Amex",
      badge: "PROCESO SEGURO",
    },
    {
      id: "WOMPI_PSE",
      name: "PSE / Transferencia",
      icon: "🏦",
      color: "#1e90ff",
      info: "Cualquier banco en Colombia",
      badge: "SIN COMISIÓN",
    },
    {
      id: "WOMPI_NEQUI",
      name: "Nequi / Bancolombia",
      icon: "📱",
      color: "#e91e8b",
      info: "Pago inmediato desde tu App",
      badge: "RECOMENDADO",
    },
    {
      id: "COD",
      name: "Contra Entrega",
      icon: "🚚",
      color: "#ffffff",
      info: "Pago al recibir",
      badge: "TIENDA FÍSICA",
    },
  ];

  container.innerHTML = methods
    .map(
      (m) => `
    <div class="pm-card ${selectedMethodForFinalize === m.id ? "selected" : ""}" onclick="setPaymentMethod('${m.id}')">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 28px; background: rgba(0,0,0,0.3); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid ${m.color}44;">
          ${m.icon}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: white; font-size: 14px;">${m.name}</span>
            <span style="font-size: 9px; background: ${m.color}; color: ${m.id === "CARD" || m.id === "COD" ? "#000" : "#fff"}; padding: 2px 6px; border-radius: 4px; font-weight: 900;">${m.badge}</span>
          </div>
          <div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 4px;">${m.info}</div>
        </div>
        <div style="color: ${m.color}; opacity: 0.5;">●</div>
      </div>
    </div>
  `,
    )
    .join("");
}

function setPaymentMethod(methodName) {
  selectedMethodForFinalize = methodName; // Usamos el ID (WOMPI_CARD, etc)
  paymentData.payment.method = methodName;

  // Actualizar visualmente la selección
  renderPaymentMethods();

  // Mostrar el botón de confirmación final
  const container = document.getElementById("finalizeActionContainer");
  if (container) container.style.display = "block";
}

async function finalizePurchase() {
  if (!selectedMethodForFinalize)
    return showToast("⚠️ Por favor selecciona un método de pago");

  const methodId = selectedMethodForFinalize;
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal + (paymentData.shipping.cost || 0);

  const finalizeBtn = document.querySelector("#finalizeActionContainer button");
  if (finalizeBtn) finalizeBtn.disabled = true;

  showToast("⌛ Procesando pedido...");

  // 1. Registramos la venta en nuestro servidor primero (estado pendiente)
  const saleId = await registerOnlineSale(methodId);

  if (saleId && saleId.startsWith("ON")) {
    paymentData.reference = saleId;
    paymentData.amount = total;
    localStorage.setItem("lastSaleId", saleId);
    localStorage.setItem(
      "paymentData",
      JSON.stringify({
        method: methodId,
        customer: paymentData.customer,
        shipping: paymentData.shipping,
        timestamp: new Date().toISOString(),
      }),
    );

    // 2. Si es un pago de Wompi, iniciamos el widget
    if (methodId.startsWith("WOMPI_")) {
      try {
        const response = await apiFetch(`${window.API_URL}/checkout/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saleId,
            amount: total,
            email: paymentData.customer.email,
            paymentType: methodId.replace("WOMPI_", ""),
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo conectar con la pasarela de pagos.");
        }

        const data = await response.json();
        console.log("🔍 Parámetros recibidos de Wompi:", data);

        // Si no hay llaves de Wompi, disparamos el flujo manual por WhatsApp
        if (data.isManual) {
          handleManualWhatsAppPayment(saleId, total, paymentData.customer);
          // Limpiamos carrito y mostramos confirmación
          cart = [];
          saveCart();
          renderCart();
          showOrderConfirmation(paymentData, methodId);
          return;
        }

        // Abrir el widget oficial de Wompi
        // Intentar obtener la clase de múltiples fuentes posibles
        const WompiClass =
          window.WidgetCheckout ||
          (window.Wompi && window.Wompi.WidgetCheckout);

        if (!WompiClass) {
          showToast(
            "❌ Error: La librería de pagos no cargó. Revisa tu conexión o desactiva AdBlock.",
          );
          if (finalizeBtn) finalizeBtn.disabled = false;
          return;
        }

        if (!data.config || !data.config.publicKey) {
          throw new Error(
            "Los parámetros de pago (config) llegaron incompletos del servidor.",
          );
        }

        // Debug de integridad
        console.log("📦 Configuración final enviada al Widget:", data.config);

        if (!data.config.signature || !data.config.signature.integrity) {
          console.error(
            "❌ CRÍTICO: El sello de integridad no está presente. Wompi rechazará el pago.",
          );
        }

        const checkout = new WompiClass(data.config);
        console.log("🚀 Iniciando Widget interno de Wompi...");

        checkout.open(function (result) {
          // Al abrir el widget, podrías ocultar cualquier spinner local si tuvieras uno
          const transaction = result.transaction;
          console.log("🏁 Transacción finalizada:", transaction.status);

          if (transaction.status === "APPROVED") {
            showToast("✅ ¡Pago Exitoso! Generando factura...");

            // Guardamos una copia de los items para la factura antes de limpiar
            paymentData.items = [...cart];

            // Limpiamos el carrito local
            cart = [];
            saveCart();
            renderCart();

            showOrderConfirmation(paymentData, methodId);
          } else {
            if (finalizeBtn) finalizeBtn.disabled = false;
            // Si el pago es rechazado, el usuario sigue en tu página y puede reintentar
            showToast(
              `❌ Transacción ${transaction.status.toLowerCase()}. Puedes intentar con otro medio.`,
            );
          }
        });

        // Salvaguarda: Si el widget no abre en 10 segundos, re-habilitar interfaz
        setTimeout(() => {
          if (finalizeBtn && finalizeBtn.disabled) finalizeBtn.disabled = false;
        }, 10000);

        return; // Detenemos aquí, el widget toma el control
      } catch (err) {
        console.error("Error iniciando Wompi:", err);
        showToast("❌ " + (err.message || err || "Error desconocido"));
        if (finalizeBtn) finalizeBtn.disabled = false;
        return;
      }
    }

    // 3. Para Contra Entrega (COD), notificamos por WhatsApp y mostramos confirmación
    handleManualWhatsAppPayment(saleId, total, paymentData.customer, true);
    showOrderConfirmation(paymentData, methodId);

    setTimeout(() => {
      cart = [];
      saveCart();
      renderCart();
    }, 500);
  } else {
    showToast("❌ Error al procesar el pedido. Intenta de nuevo.");
    if (finalizeBtn) finalizeBtn.disabled = false;
  }
}

function handleManualWhatsAppPayment(saleId, total, customer, isCOD = false) {
  const orderRef = saleId.slice(-8).toUpperCase();
  const type = isCOD ? "CONTRA ENTREGA" : "PAGO ELECTRÓNICO";
  const message = `¡Hola Winner Store! 👋 Acabo de generar el pedido *#${orderRef}* (${type}) por valor de *${formatPrice(total)}*.\n\nMis datos: ${customer.name} - ${customer.phone}.\n\nQuedo atento a la confirmación. ¡Gracias!`;

  const waUrl = `https://wa.me/${window.WHATSAPP_PHONE || "573135642283"}?text=${encodeURIComponent(message)}`;

  showToast("📱 Abriendo WhatsApp para confirmar tu pedido...");
  setTimeout(() => {
    window.location.href = waUrl;
  }, 1500);
}

function simulateNotifications(customer) {
  console.log(`Enviando SMS a ${customer.phone}...`);
  console.log(`Enviando Email a ${customer.email}...`);
  setTimeout(() => {
    showToast("📩 Notificaciones enviadas al cliente");
  }, 1000);
}

function showOrderConfirmation(params, gatewayKey) {
  const modalBody = document.querySelector("#paymentModal .modal-body");
  const modalFooter = document.getElementById("paymentFooter");

  if (!modalBody) return;
  if (modalFooter) modalFooter.style.display = "none";

  let statusIcon = "✅";
  let title = "¡PEDIDO RECIBIDO!";
  let subInstruction = `Hemos enviado el detalle a <strong>${params.customer.email}</strong> y un SMS de confirmación.`;
  let actionBox = "";

  if (gatewayKey === "NEQUI" || gatewayKey === "PSE" || gatewayKey === "CARD") {
    statusIcon = "📱";
    title = gatewayKey === "CARD" ? "PAGO PROCESADO" : "TRANSACCIÓN INICIADA";
    subInstruction =
      gatewayKey === "NEQUI"
        ? "Abre tu app de <strong>Nequi</strong> y aprueba el pago para finalizar."
        : "Tu transacción está siendo validada por el sistema de seguridad de Wompi.";
    actionBox = `
      <div style="background: rgba(232, 255, 71, 0.05); border: 1px solid var(--accent); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="font-size: 12px; color: white; text-align:center;">Referencia Wompi: <strong style="color:var(--accent)">${params.reference}</strong></p>
      </div>
    `;
  } else if (gatewayKey === "COD") {
    statusIcon = "🚚";
    title = "ORDEN RECIBIDA";
    subInstruction =
      "Tu pedido bajo <strong>Pago Contra Entrega</strong> ha sido registrado. Te contactaremos pronto para confirmar el envío.";
  }

  const printBtn = `
    <button class="adm-btn-ghost" onclick="printInvoice(${JSON.stringify(params).replace(/"/g, "&quot;")})" style="width: 100%; margin-bottom: 10px; border-color: var(--accent); color: var(--accent); font-weight:bold;">
      🖨️ IMPRIMIR FACTURA
    </button>
  `;

  modalBody.innerHTML = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 60px; margin-bottom: 15px; filter: drop-shadow(0 0 10px var(--accent));">${statusIcon}</div>
      <h2 style="font-family: 'Bebas Neue'; font-size: 32px; letter-spacing: 3px; color: var(--accent); margin-bottom: 10px;">${title}</h2>
      <p style="color: var(--gray-text); font-size: 14px; margin-bottom: 20px; line-height: 1.5;">${subInstruction}</p>
      
      <div style="background: var(--gray); padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left; border: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
          <span style="color: var(--gray-text);">Orden:</span>
          <span style="font-family: monospace; color: white;">#${params.reference.slice(-8)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: var(--gray-text);">Total a pagar:</span>
          <span style="color: var(--accent); font-weight: bold; font-size: 16px;">${formatPrice(params.amount)}</span>
        </div>
      </div>

      ${actionBox}
      ${printBtn}

      <button class="adm-btn" onclick="window.location.reload()" style="width: 100%; height: 50px;">
        VOLVER AL INICIO
      </button>
    </div>
  `;
}

window.printInvoice = function (params) {
  const win = window.open("", "_blank", "width=800,height=900");
  const date = new Date().toLocaleString("es-CO");
  const itemsHtml = (params.items || [])
    .map(
      (i) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${i.name} (${i.size})</td>
      <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">${i.qty}</td>
      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${i.price.toLocaleString("es-CO")}</td>
    </tr>
  `,
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Factura Winner Store - #${params.reference.slice(-8)}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; align-items: center; }
          .logo { font-size: 40px; font-weight: 900; letter-spacing: 5px; }
          .client-info { margin: 30px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { background: #f8f8f8; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .total { text-align: right; font-size: 22px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #777; border-top: 1px dashed #ccc; padding-top: 20px; }
          .wompi-branding { margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">WINNER</div>
          <div style="text-align: right;">
            <strong style="font-size: 18px;">FACTURA DE VENTA</strong><br>
            <span style="color: #777;">REF: ${params.reference}</span><br>
            <span>${date}</span>
          </div>
        </div>
        <div class="client-info">
          <strong>CLIENTE:</strong> ${params.customer.name.toUpperCase()}<br>
          <strong>EMAIL:</strong> ${params.customer.email}<br>
          <strong>TELÉFONO:</strong> ${params.customer.phone}<br>
          <strong>CIUDAD:</strong> ${params.customer.city}
        </div>
        <table>
          <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total">TOTAL: $${params.amount.toLocaleString("es-CO")}</div>
        <div class="footer">
          ¡Gracias por tu compra! Winner Store Streetwear Colombia.<br>
          Este documento es un soporte de pago electrónico.<br>
          <div class="wompi-branding">
            <img src="https://wompi.com/assets/img/logos/wompi-logo.png" width="90" style="opacity:0.7;"><br>
            <small>Transacción segura procesada por Wompi Bancolombia</small>
          </div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  win.document.close();
};

function formatCardNumber(input) {
  let value = input.value.replace(/\s/g, "");
  let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
  input.value = formatted;
}

function formatExpiry(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2, 4);
  }
  input.value = value;
}

function formatCVV(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 4);
}

function formatPhone(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length > 0) {
    value =
      "+57 " + value.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  input.value = value;
}

function backToPaymentMethod() {
  showPaymentStep("2Payment");
}

function processPayment() {
  const form = document.getElementById("cardForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  finalizePurchase();
}

function processPaymentPSE() {
  const form = document.getElementById("pseForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  finalizePurchase();
}

function processPaymentNequi() {
  const form = document.getElementById("nequiForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  finalizePurchase();
}

function processPaymentDaviplata() {
  const form = document.getElementById("daviplataForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  finalizePurchase();
}

function processPaymentCash() {
  const form = document.getElementById("cashForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  finalizePurchase();
}

function updateCashFields() {
  const option = document.getElementById("cashDeliveryOption").value;
  const info = document.getElementById("cashDeliveryInfo");

  if (option === "delivery") {
    info.innerHTML =
      "ℹ️ Pagarás contra entrega, el repartidor llegará a tu domicilio";
  } else if (option === "pickup") {
    info.innerHTML =
      "ℹ️ Retira tu pedido en nuestro local y verifica antes de pagar";
  } else {
    info.innerHTML = "ℹ️ Selecciona una opción para continuar";
  }
}

// Global hook for the button in HTML
window.checkoutWhatsApp = openPaymentModal;

/* ══════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════ */
function renderProducts(filter) {
  const list =
    filter === "all"
      ? window.PRODUCTS
      : filter === "sale"
        ? window.PRODUCTS.filter((p) => p.oldPrice)
        : window.PRODUCTS.filter((p) => (p.cat || p.category) === filter);

  if (list.length === 0) {
    DOM.productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-text);font-size:14px;letter-spacing:1px;">
        No hay productos en esta categoría.
      </div>`;
    return;
  }

  DOM.productsGrid.innerHTML = list
    .map(
      (p, i) => `
    <div class="product-card reveal" style="transition-delay:${i * 0.07}s">
      <div class="product-img-wrap">
        <img
          src="${esc(p.img || p.image)}"
          alt="${esc(p.alt)}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80'"
        />
        <div class="product-overlay" style="display:flex; flex-direction:column; justify-content:flex-end;">
          <div class="size-selector" data-product="${p.id}" style="display:flex; justify-content:center; gap:5px; margin-bottom:15px;">
            ${Object.keys(p.stock || {})
              .map((size, idx) => {
                const qty = p.stock[size];
                const isFirstAvail =
                  qty > 0 &&
                  Object.keys(p.stock)
                    .slice(0, idx)
                    .every((s) => p.stock[s] === 0);
                return `<button class="size-btn ${qty === 0 ? "disabled" : ""} ${isFirstAvail ? "active" : ""}" data-size="${size}" ${qty === 0 ? "disabled" : ""} style="width:30px; height:30px; border-radius:4px; font-weight:bold; font-size:12px; background: ${qty === 0 ? "#333" : "var(--dark)"}; color: ${qty === 0 ? "#666" : "var(--text)"}; border: 1px solid var(--border); cursor: ${qty === 0 ? "not-allowed" : "pointer"};" onclick="if(this.disabled) return; this.closest('.size-selector').querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active');">${size}</button>`;
              })
              .join("")}
          </div>
          <button
            class="add-to-cart-btn"
            onclick="addToCart('${p.id}')"
            aria-label="Agregar ${esc(p.name)} al carrito"
          >+ AGREGAR</button>
        </div>
        ${p.badge ? `<div class="product-badge badge-${p.badgeType}">${esc(p.badge)}</div>` : p.oldPrice ? `<div class="product-badge badge-sale">OFERTA</div>` : ""}
        <button
          class="wishlist-btn"
          onclick="showToast('💛 Guardado en favoritos')"
          aria-label="Guardar en favoritos"
        >♡</button>
      </div>
      <div class="product-cat">${esc(p.cat)}</div>
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-pricing">
        <span class="product-price">${formatPrice(p.price)}</span>
        ${p.oldPrice ? `<span class="product-price-old">${formatPrice(p.oldPrice)}</span>` : ""}
      </div>
    </div>
  `,
    )
    .join("");

  // Re-observe new cards for reveal animation
  observeRevealElements();
  injectProductJsonLd(window.PRODUCTS);
}

function buildProductUrl(productId) {
  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("product", productId);
  url.hash = "productos";
  return url.href;
}

function buildProductSchema(products) {
  const listItems = products.map((product, index) => {
    const metadata = product.metadata || {};
    const hasStock = Object.values(product.stock || {}).some((qty) => qty > 0);
    const priceValue = Number(product.price || 0).toFixed(2);
    const color =
      metadata.color &&
      metadata.color
        .split(/[\/,]/)
        .map((c) => c.trim())
        .filter(Boolean)[0];
    const sizes =
      metadata.size
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        sku: product.id,
        mpn: metadata.mpn,
        gtin13: metadata.gtin,
        name: product.name,
        description:
          metadata.productType && metadata.productType !== product.cat
            ? `${product.name} · ${metadata.productType} by Winner.`
            : `Ropa urbana Winner inspirada en el streetwear colombiano con ${product.name}`,
        brand: {
          "@type": "Brand",
          name: metadata.brand || "Winner",
        },
        image: product.img,
        color,
        size: sizes.length ? sizes : undefined,
        category: metadata.productType || product.cat,
        material: metadata.material,
        pattern: metadata.pattern,
        offers: {
          "@type": "Offer",
          url: buildProductUrl(product.id),
          priceCurrency: "COP",
          price: priceValue,
          availability: hasStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          shippingWeight: metadata.shippingWeight,
        },
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listItems,
  };
}

function injectProductJsonLd(products) {
  if (!products.length) return;
  const scriptId = "product-json-ld";
  let script = document.getElementById(scriptId);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(buildProductSchema(products), null, 2);
}

/* ── FILTER BUTTONS ─────────────────────────────────────── */
DOM.filterBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  window.activeFilter = btn.dataset.filter;
  DOM.filterBar
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts(window.activeFilter);
});

/* ══════════════════════════════════════════════════════════
   FEATURED CTA BUTTONS
══════════════════════════════════════════════════════════ */
document.querySelectorAll(".featured-cta").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    // For featured item we'll try to get an active size or let addToCart pick the first available
    addToCart(id);
  });
});

// Event listener for size-btn active state update for custom styles
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("size-btn") && !e.target.disabled) {
    const group = e.target.closest(".size-selector");
    if (group) {
      group.querySelectorAll(".size-btn").forEach((b) => {
        b.style.background = "var(--dark)";
        b.style.borderColor = "var(--border)";
        b.style.color = "var(--text)";
      });
      e.target.style.background = "var(--accent)";
      e.target.style.color = "#000";
    }
  }
});

/* ══════════════════════════════════════════════════════════
   PROMO CODE COPY
══════════════════════════════════════════════════════════ */
function copyCode() {
  const el = document.getElementById("promoCode");
  if (!el) return;
  const code = el.textContent.trim();
  navigator.clipboard
    .writeText(code)
    .then(() => showToast(`📋 Código "${code}" copiado`))
    .catch(() => showToast(`Código: ${code}`));
}

/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
══════════════════════════════════════════════════════════ */
let revealObserver;

function observeRevealElements() {
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });
}

/* ══════════════════════════════════════════════════════════
   ANIMATED COUNTER (hero stats)
══════════════════════════════════════════════════════════ */
function animateCounter(el, target, suffix = "", duration = 1800) {
  let start = 0;
  const increment = target / (duration / 16);
  const isFloat = String(target).includes(".");

  function step() {
    start += increment;
    if (start >= target) {
      el.textContent =
        (isFloat
          ? target.toFixed(1)
          : Math.floor(target).toLocaleString("es-CO")) + suffix;
      return;
    }
    el.textContent =
      (isFloat ? start.toFixed(1) : Math.floor(start).toLocaleString("es-CO")) +
      suffix;
    requestAnimationFrame(step);
  }
  step();
}

function initHeroCounters() {
  const statNums = document.querySelectorAll(".stat-num");

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.textContent.trim();

          if (text.includes("2K+")) {
            el.textContent = "0";
            animateCounter(el, 2, "K+");
          } else if (text.includes("150+")) {
            el.textContent = "0";
            animateCounter(el, 150, "+");
          } else if (text.includes("4.9★")) {
            el.textContent = "0★";
            animateCounter(el, 4.9, "★");
          }

          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 },
  );

  statNums.forEach((el) => counterObserver.observe(el));
}

/* ══════════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════════ */
/* formatPrice está definido al inicio del archivo */
/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
(function init() {
  fetchProducts();
  renderCart();
  observeRevealElements();
  initHeroCounters();
  initCheckoutPersistence();
  if (typeof window.loadDynamicConfig === "function")
    window.loadDynamicConfig();
})();
