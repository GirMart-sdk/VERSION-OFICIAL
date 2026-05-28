/* ═══════════════════════════════════════════════════════
   WINNER — inventory.js (Inventario & Gestión)
   ═══════════════════════════════════════════════════════ */
let _invStockFilter = "all"; // 'all', 'low', 'out'

async function fetchInventory() {
  try {
    const res = await apiFetch(`${API_URL}/products`);
    window.inventory = await res.json();
    renderInventory();
    if (typeof renderPOSProducts === "function") renderPOSProducts();
  } catch (e) {
    toast("⚠️ Error al cargar productos");
  }
}

function setInvCategory(cat) {
  _invActiveCat = cat;
  document.querySelectorAll(".inv-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderInventory();
}

function setInvStockFilter(filter) {
  _invStockFilter = filter;
  // Al aplicar un filtro de stock, reseteamos el filtro de categoría a "todos"
  setInvCategory("all"); // Esto también llamará a renderInventory
}

function renderInventory() {
  const container = $("invCards");
  const search = ($("invSearch") || { value: "" }).value.toLowerCase();
  const catFilter =
    typeof _invActiveCat !== "undefined" && _invActiveCat !== "all"
      ? _invActiveCat
      : "";
  const stockFilter = _invStockFilter;

  if (!container) return;

  let filtered = window.inventory;

  // Aplicar filtro de stock primero
  if (stockFilter === "low") {
    filtered = filtered.filter((p) => totalStock(p) <= 50 && totalStock(p) > 0);
  } else if (stockFilter === "out") {
    filtered = filtered.filter((p) => totalStock(p) === 0);
  }

  // Luego aplicar filtros de categoría y búsqueda
  filtered = filtered.filter(
    (p) =>
      p.name.toLowerCase().includes(search) &&
      (!catFilter || p.cat.toLowerCase() === catFilter.toLowerCase()),
  );

  container.innerHTML = filtered
    .map((p) => {
      const ts = totalStock(p);
      const stat = stockStatus(ts);
      return `
      <div class="inv-card">
        <span class="inv-stock-badge ${stat.cls}">${stat.label}</span>
        <img src="${p.img || p.image}" class="inv-card-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=80'"/>
        <div class="inv-card-body">
          <div class="inv-card-cat">${p.cat || p.category}</div>
          <div class="inv-card-name">${p.name}</div>
          <div class="inv-card-price">${fmt(p.price)}</div>
          <div class="inv-card-footer">
            <button class="btn-ghost" onclick="showProductQR('${p.id}')">🔲 QR</button>
            <button onclick="editProduct('${p.id}')">✎ Editar</button>
            <button class="btn-ghost" style="color:var(--red)" onclick="deleteProduct('${p.id}')">✕</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  let totalInventoryValue = 0;
  window.inventory.forEach((p) => {
    totalInventoryValue += (p.price || 0) * totalStock(p);
  });

  if ($("is1")) $("is1").textContent = window.inventory.length;
  if ($("is2"))
    $("is2").textContent = window.inventory.filter(
      (p) => totalStock(p) <= 50 && totalStock(p) > 0,
    ).length;
  if ($("is3"))
    $("is3").textContent = window.inventory.filter(
      (p) => totalStock(p) === 0,
    ).length;
  if ($("is4")) $("is4").textContent = fmt(totalInventoryValue);
}

window.openProductModal = (id = null) => {
  $("editProductId").value = id || "";
  if (id) {
    const p = window.inventory.find((x) => String(x.id) === String(id));
    if (p) {
      $("pName").value = p.name;
      $("pCat").value = p.cat || p.category;
      $("pPrice").value = p.price;
      $("pSku").value = p.sku || "";
      $("pImg").value = p.img || p.image || "";
      renderStockGrid(p.cat || p.category, p.stock);
    }
  } else {
    ["pName", "pPrice", "pSku", "pImg"].forEach((f) => {
      if ($(f)) $(f).value = "";
    });
    renderStockGrid("mujer", {});
  }
  updateStockTotal();
  $("productModal").classList.add("open");
  $("productModalOverlay").classList.add("open");
};

window.closeProductModal = () => {
  $("productModal").classList.remove("open");
  $("productModalOverlay").classList.remove("open");
};

window.deleteProduct = async (id) => {
  if (!confirm("¿Eliminar este producto?")) return;
  const res = await apiFetch(`${API_URL}/products/${id}`, { method: "DELETE" });
  if (res.ok) {
    fetchInventory();
    toast("Producto eliminado");
  }
};

function handleCategoryChange() {
  const category = $("pCat").value;
  renderStockGrid(category, {});
  updateStockTotal();
}

function renderStockGrid(category, stock = {}) {
  const sizes = getSizesForCategory(category);
  const gridEl = $("sizeGridForm");
  if (!gridEl) return;
  if (sizes.length === 0) {
    gridEl.innerHTML = `<div class="size-cell" style="grid-column:1/-1"><label>Cantidad</label><input type="number" id="ps-qty" min="0" value="${stock.qty || 0}" oninput="updateStockTotal()"/></div>`;
  } else {
    gridEl.innerHTML = sizes
      .map(
        (s) =>
          `<div class="size-cell"><label>${s}</label><input type="number" id="ps-${s}" min="0" value="${stock[s] || 0}" oninput="updateStockTotal()"/></div>`,
      )
      .join("");
  }
}

function updateStockTotal() {
  const el = $("stockTotalPreview");
  const cat = $("pCat").value;
  const sizes = getSizesForCategory(cat);
  let total = 0;
  if (sizes.length === 0) total = parseInt($("ps-qty")?.value) || 0;
  else
    total = sizes.reduce(
      (s, sz) => s + (parseInt($("ps-" + sz)?.value) || 0),
      0,
    );
  if (el) el.textContent = total;
}

async function saveProduct() {
  const id = $("editProductId").value;
  const name = $("pName").value.trim();
  const price = parseFloat($("pPrice").value);

  if (!name || isNaN(price)) {
    toast("⚠️ Por favor completa el nombre y el precio con valores válidos");
    return;
  }

  const cat = $("pCat").value;
  const sizes = getSizesForCategory(cat);
  const stock = {};
  if (sizes.length === 0) stock.qty = parseInt($("ps-qty").value) || 0;
  else sizes.forEach((s) => (stock[s] = parseInt($("ps-" + s).value) || 0));

  const data = {
    id: id || genId(),
    name: name,
    price: price,
    category: cat,
    sku: $("pSku").value,
    stock: stock,
    on_sale: $("pOnSale").checked,
    promo_price: parseFloat($("pPromoPrice").value) || 0,
    image: $("pImg").value,
  };

  try {
    const res = await apiFetch(`${API_URL}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast("✅ Producto guardado correctamente");
      closeProductModal();
      fetchInventory();
    } else {
      const result = await res.json().catch(() => ({}));
      toast(`❌ Error: ${result.error || "No se pudo guardar el producto"}`);
    }
  } catch (e) {
    toast("❌ Error de conexión al intentar guardar");
  }
}

window.editProduct = (id) => window.openProductModal(id);

window.showProductQR = (id) => {
  const p = window.inventory.find((x) => String(x.id) === String(id));
  if (!p) return;
  window._qrCurrentProduct = p; // Guardar referencia para imprimir/descargar
  const canvas = $("qrModalCanvas");
  canvas.innerHTML = "";

  const payload = JSON.stringify({ id: p.id, sku: p.sku, v: "W-1.0" });

  new QRCode(canvas, {
    text: payload,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  if ($("qrModalInfo")) $("qrModalInfo").textContent = `${p.sku} - ${p.name}`;
  $("qrModal").classList.add("open");
  $("qrModalOverlay").classList.add("open");
};

window.loadLowStockAlerts = async () => {
  try {
    const res = await apiFetch(
      `${window.API_URL}/analytics/low-stock?threshold=50`,
    );
    if (!res.ok) return;
    const prods = await res.json();
    const alertsDiv = $("lowStockAlerts");
    if (alertsDiv) {
      alertsDiv.innerHTML = prods.length
        ? `<div class="alert-banner" style="background:rgba(255,0,0,0.1); border:1px solid red; padding:10px; margin-bottom:10px">⚠️ ${prods.length} productos con bajo stock</div>`
        : "";
    }
  } catch (e) {
    console.error("LowStock Alerts Error:", e);
  }
};

window.triggerImageUpload = () => $("pImgFile").click();
window.handleImageUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    if ($("pImg")) $("pImg").value = ev.target.result;
    toast("✓ Imagen cargada");
  };
  reader.readAsDataURL(file);
};

/* ── LÓGICA DE IMPRESIÓN Y DESCARGA ── */

window.printSingleQR = () => {
  const p = window._qrCurrentProduct;
  if (!p) return toast("⚠️ Selecciona un producto primero");

  const canvas = $("qrModalCanvas").querySelector("canvas");
  if (!canvas) return toast("⚠️ El QR no se ha generado");

  const imgData = canvas.toDataURL("image/png");
  const win = window.open("", "_blank", "width=450,height=500");

  win.document.write(`
    <html>
      <head><title>Imprimir QR - ${p.sku}</title></head>
      <body style="text-align:center; font-family:sans-serif; padding:40px;">
        <h2 style="letter-spacing:4px;">WINNER</h2>
        <img src="${imgData}" style="width:250px; border: 1px solid #eee;">
        <p style="font-size:18px; margin-top:10px;"><strong>${p.sku}</strong></p>
        <p style="font-size:14px; color:#666;">${p.name}</p>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
    </html>
  `);
  win.document.close();
};

// Alias para el botón dentro del modal de edición
window.printProductQR = window.printSingleQR;

window.downloadSingleQR = () => {
  const p = window._qrCurrentProduct;
  if (!p) return;
  const canvas = $("qrModalCanvas").querySelector("canvas");
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `QR_WINNER_${p.sku}.png`;
  a.click();
};

window.downloadProductQR = window.downloadSingleQR;

window.printAllQRs = () => {
  if (!window.inventory || !window.inventory.length)
    return toast("No hay productos");

  const win = window.open("", "_blank");
  const itemsHtml = window.inventory
    .map(
      (p) => `
    <div style="display:inline-block; margin:15px; text-align:center; width:160px; border:1px solid #f0f0f0; padding:10px;">
      <div id="qr-${p.id}"></div>
      <p style="font-family:sans-serif; font-size:11px; margin-top:8px; font-weight:bold;">${p.sku}</p>
      <p style="font-family:sans-serif; font-size:10px; color:#555; margin:0; height:24px; overflow:hidden;">${p.name}</p>
    </div>
  `,
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Imprimir Todos los QRs - Winner</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      </head>
      <body style="text-align:center; padding:20px;">
        <h2 style="font-family:sans-serif; letter-spacing:5px; border-bottom:2px solid #000; padding-bottom:10px;">WINNER STORE - CATALOGO QR</h2>
        <div style="display:flex; flex-wrap:wrap; justify-content:center;">
          ${itemsHtml}
        </div>
        <script>
          window.onload = () => {
            const inv = ${JSON.stringify(window.inventory.map((p) => ({ id: p.id, sku: p.sku })))};
            inv.forEach(p => {
              new QRCode(document.getElementById("qr-" + p.id), {
                text: JSON.stringify({id: p.id, sku: p.sku, v: "W-1.0"}),
                width: 140, height: 140
              });
            });
            setTimeout(() => { window.print(); }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
};

window.switchFormTab = (tab) => {
  document
    .querySelectorAll(".ftab")
    .forEach((b) => b.classList.toggle("active", b.dataset.ftab === tab));
  document
    .querySelectorAll(".ftab-content")
    .forEach((c) => c.classList.toggle("active", c.id === "ftab-" + tab));
};

function triggerStockUpload() {
  $("invCsvInput").click();
}

async function handleStockUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  toast("⌛ Leyendo archivo...");
  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  const updates = [];

  // Formato esperado: ID/SKU, Talla, Cantidad
  for (let i = 1; i < lines.length; i++) {
    const [id, size, qty] = lines[i].split(",").map((s) => s.trim());
    if (id && qty) {
      updates.push({ id, sku: id, size: size || "U", qty: parseInt(qty) || 0 });
    }
  }

  try {
    const res = await apiFetch(`${API_URL}/inventory/bulk-update`, {
      method: "POST",
      body: JSON.stringify({ updates }),
    });

    if (res.ok) {
      toast("✅ Inventario actualizado masivamente");
      fetchInventory();
    } else {
      const err = await res.json();
      toast("❌ Error: " + err.error);
    }
  } catch (e) {
    toast("❌ Error al subir stock");
  } finally {
    event.target.value = "";
  }
}

/* ── IMAGE UPLOAD ── */
function triggerImageUpload() {
  $("pImgFile").click();
}
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    $("pImg").value = e.target.result;
    toast("✓ Imagen cargada");
  };
  reader.readAsDataURL(file);
}

window.setInvCategory = setInvCategory;
window.fetchInventory = fetchInventory;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showProductQR = showProductQR;
window.triggerStockUpload = triggerStockUpload;
window.handleStockUpload = handleStockUpload;
window.triggerImageUpload = triggerImageUpload;
window.handleImageUpload = handleImageUpload;
window.handleCategoryChange = handleCategoryChange;
window.renderInventory = renderInventory;
window.setInvStockFilter = setInvStockFilter;
