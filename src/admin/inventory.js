/* ═══════════════════════════════════════════════════════
   WINNER — inventory.js (Inventario & Gestión)
   ═══════════════════════════════════════════════════════ */
// eslint-disable-next-line no-redeclare
/* global JsBarcode, totalStock, stockStatus, getSizesForCategory, genId, renderPOSProducts, toast, fmt, $, apiFetch */
"use strict";

let _invStockFilter = "all"; // 'all', 'low', 'out'
let _invActiveCat = "all";

let cropperInstance = null;
let currentCropFile = null;
let videoStream = null;

async function fetchInventory() {
  try {
    const res = await apiFetch(`${API_URL}/products`);
    const inventoryData = await res.json();
    // En lugar de usar una variable global, guardamos los datos en el store
    window.AppStore.commit("SET_INVENTORY", inventoryData);
    if (typeof renderPOSProducts === "function") renderPOSProducts();
  } catch (error) {
    toast(`⚠️ Error al cargar productos: ${error.message || error}`);
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
  // Soporte dual para index.html (admInventoryBody) y admin-panel.html (invCards)
  const container = $("invCards") || $("admInventoryBody");
  const search = ($("invSearch") || { value: "" }).value.toLowerCase();
  const catFilter =
    typeof _invActiveCat !== "undefined" && _invActiveCat !== "all"
      ? _invActiveCat
      : "";
  const stockFilter = _invStockFilter;

  if (!container) return;

  // Leemos el inventario desde la fuente única de verdad: el store.
  let filtered = window.AppStore.state.inventory;

  // Aplicar filtro de stock primero
  if (stockFilter === "low") {
    filtered = filtered.filter((p) => totalStock(p) <= 5 && totalStock(p) > 0);
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
        <span class="ppc-stock-tag ${stat.cls}">${ts} DISP.</span>
        <!-- Imagen local o placeholder SVG -->
        <img src="${p.img || p.image}" class="inv-card-img" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22 viewBox=%220 0 300 300%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23252525%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23444%22 font-family=%22sans-serif%22 font-size=%2214%22%3ESin imagen%3C/text%3E%3C/svg%3E'"/>
        <div class="inv-card-body">
          <div class="inv-card-cat">${p.cat || p.category}</div>
          <div class="inv-card-name">${p.name}</div>
          <div class="inv-card-price">${fmt(p.price)}</div>
          <div class="inv-card-footer">
            <button class="btn-ghost" onclick="window.showProductQR('${p.id}')">📊 Barras</button>
            <button onclick="window.editProduct('${p.id}')">✎ Editar</button>
            <button class="btn-ghost" style="color:var(--red)" onclick="window.deleteProduct('${p.id}')">✕</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  let totalInventoryValue = 0;
  window.AppStore.state.inventory.forEach((p) => {
    totalInventoryValue += (p.price || 0) * totalStock(p);
  });

  if ($("is1")) $("is1").textContent = window.AppStore.state.inventory.length;
  if ($("is2"))
    $("is2").textContent = window.AppStore.state.inventory.filter(
      (p) => totalStock(p) <= 5 && totalStock(p) > 0,
    ).length;
  if ($("is3"))
    $("is3").textContent = window.AppStore.state.inventory.filter(
      (p) => totalStock(p) === 0,
    ).length;
  if ($("is4")) $("is4").textContent = fmt(totalInventoryValue);
}

// Alias para index.html
window.renderAdminInventory = renderInventory;

window.openProductModal = (id = null) => {
  $("editProductId").value = id || "";
  if (id) {
    const p = window.AppStore.state.inventory.find((x) => String(x.id) === String(id));
    if (p) {
      $("pName").value = p.name;
      const category = p.cat || p.category; // Aseguramos que la categoría se cargue
      if ($("pCat")) $("pCat").value = category; // Actualizamos el input hidden
      if ($("pCatDisplay")) $("pCatDisplay").textContent = category; // Actualizamos el texto del botón
      $("pPrice").value = p.price;
      $("pSku").value = p.sku || "";
      $("pCost").value = p.cost || ""; // Cargar el costo
      $("pImg").value = p.img || p.image || "";
      renderStockGrid(p.cat || p.category, p.stock);
    }
  } else {
    ["pName", "pPrice", "pSku", "pImg", "pCost"].forEach((f) => {
      if ($(f)) $(f).value = "";
    });
    if ($("pCat")) $("pCat").value = "";
    if ($("pCatDisplay"))
      $("pCatDisplay").textContent = "Seleccionar Categoría...";
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

window.closeQRModal = () => {
  $("qrModal").classList.remove("open");
  $("qrModalOverlay").classList.remove("open");
};

/**
 * Abre el modal emergente para seleccionar la categoría de boutique
 */
window.openCategoryPicker = () => {
  const overlay = $("categoryPickerOverlay");
  const modal = $("categoryPickerModal");
  if (overlay && modal) {
    overlay.classList.add("open");
    modal.classList.add("open");
  }
};

window.closeCategoryPicker = () => {
  $("categoryPickerOverlay")?.classList.remove("open");
  $("categoryPickerModal")?.classList.remove("open");
};

/**
 * Selecciona una categoría, actualiza la UI y dispara el cambio de tallas
 */
window.selectCategory = (val) => {
  const input = $("pCat");
  const display = $("pCatDisplay");
  if (input) input.value = val;
  if (display) display.textContent = val;

  // Disparar la lógica inteligente de tallas
  handleCategoryChange(); // Llamada directa a la función local
  window.closeCategoryPicker();
  toast(`📂 Categoría: ${val}`);
};

window.deleteProduct = async (id) => {
  if (!confirm("¿Eliminar este producto?")) return;
  const res = await apiFetch(`${API_URL}/products/${id}`, {
    method: "DELETE",
  });
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

  const isShoes =
    category.toLowerCase().includes("calzado") ||
    category.toLowerCase().includes("tenis");
  
  if (sizes.length === 0) {
    gridEl.innerHTML = `<div class="size-cell" style="grid-column:1/-1"><label>Cantidad (Talla Única)</label><input type="number" id="ps-U" min="0" value="${stock.U || stock.qty || 0}" oninput="updateStockTotal()"/></div>`;
  } else {
    gridEl.innerHTML = sizes
      .map((s) => {
        const label = isShoes ? `${s} (EU)` : s;
        return `<div class="size-cell"><label>${label}</label><input type="number" id="ps-${s}" min="0" value="${stock[s] || 0}" oninput="updateStockTotal()"/></div>`;
      }) 
      .join("");
  }
}

function updateStockTotal() {
  const el = $("stockTotalPreview");
  const cat = $("pCat").value;
  const sizes = getSizesForCategory(cat);
  let total = 0;
  if (sizes.length === 0) total = parseInt($("ps-U")?.value) || 0;
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
  if (sizes.length === 0) stock.U = parseInt($("ps-U").value) || 0;
  else sizes.forEach((s) => (stock[s] = parseInt($("ps-" + s).value) || 0));

  const data = {
    id: id || genId(),
    name: name,
    price: price,
    cost: parseFloat($("pCost").value) || 0, // Guardar el costo
    category: cat || "Otros",
    sku: $("pSku").value,
    stock: stock,
    image: $("pImg").value,
  };

  try {
    const res = await apiFetch(`${API_URL}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast("✅ Producto guardado correctamente");
      window.closeProductModal();
      fetchInventory();
    } else {
      const result = await res.json().catch(() => ({}));
      toast(`❌ Error: ${result.error || "No se pudo guardar el producto"}`);
    }
  } catch (e) {
    toast("❌ Error de conexión al intentar guardar");
  }
}

window.saveProduct = saveProduct;
window.editProduct = (id) => window.openProductModal(id);

window.showProductQR = (id) => {
  const p = window.AppStore.state.inventory.find((x) => String(x.id) === String(id));
  if (!p) return;
  window._qrCurrentProduct = p;

  // Usar SKU si existe, de lo contrario ID. Idealmente 770...
  const barcodeValue = p.sku || p.id;

  JsBarcode("#barcodeCanvas", barcodeValue, {
    format: "CODE128",
    lineColor: "#000",
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 16,
    margin: 10,
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

window.closeCropperModal = () => {
  $("cropperModal").classList.remove("open");
  $("cropperModalOverlay").classList.remove("open");
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
};

window.handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentCropFile = file;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = $("cropperImage");
    if (!img) {
      toast("❌ Error: Elemento de imagen no encontrado.");
      return;
    }

    img.onload = () => {
      try {
        $("cropperModal").classList.add("open");
        $("cropperModalOverlay").classList.add("open");

        if (cropperInstance) cropperInstance.destroy();

        // Inicializar editor con proporción cuadrada (1:1)
        cropperInstance = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 2,
          autoCropArea: 1,
          background: false,
          responsive: true,
          restore: true,
          guides: true,
          center: true,
          highlight: true,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: true,
        });
      } catch (err) {
        console.error("Error al inicializar Cropper:", err);
        toast("❌ Error al inicializar el editor de imágenes: " + err.message);
        $("cropperModal").classList.remove("open");
        $("cropperModalOverlay").classList.remove("open");
      }
    };

    img.onerror = () => {
      toast(
        "❌ Error al cargar la imagen. Verifica que sea una imagen válida.",
      );
      console.error("Error cargando imagen en cropper");
    };

    img.src = event.target.result;
  };

  reader.onerror = () => {
    toast("❌ Error al leer el archivo");
  };

  reader.readAsDataURL(file);
  e.target.value = ""; // Reset para permitir subir la misma foto tras correcciones
};

window.startProductCamera = async () => {
  const video = $("productVideo");
  const container = $("cameraContainer");
  if (!video || !container) return;

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" }, 
      audio: false 
    });
    video.srcObject = videoStream;
    container.style.display = 'block';
    video.play();
    toast("📷 Cámara iniciada");
  } catch (err) {
    console.error("Error al acceder a la cámara:", err);
    toast("⚠️ No se pudo acceder a la cámara");
  }
};

window.stopCameraUI = () => {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  if ($("cameraContainer")) $("cameraContainer").style.display = 'none';
};

window.captureProductPhoto = () => {
  const video = $("productVideo");
  const canvas = $("productCanvas");
  const context = canvas.getContext('2d');

  if (!video || !canvas) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL('image/jpeg');
  window.stopCameraUI();

  // Integración con el flujo de Cropper existente
  currentCropFile = { name: `captura_${Date.now()}.jpg` };
  const img = $("cropperImage");
  
  img.onload = () => {
    $("cropperModal").classList.add("open");
    $("cropperModalOverlay").classList.add("open");
    if (cropperInstance) cropperInstance.destroy();

    cropperInstance = new Cropper(img, {
      aspectRatio: 1,
      viewMode: 2,
      autoCropArea: 1,
      background: false,
      responsive: true,
      restore: true,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
    });
  };
  img.src = imageData;
};

window.confirmCrop = async () => {
  if (!cropperInstance) {
    console.error("❌ No hay una instancia de Cropper activa.");
    toast("❌ No hay imagen siendo editada.");
    return;
  }

  try {
    const canvas = cropperInstance.getCroppedCanvas({
      width: 1000,
      height: 1000,
    });
    if (!canvas) throw new Error("Fallo al generar lienzo");

    canvas.toBlob(
      async (blob) => {
        try {
          if (!blob)
            throw new Error("No se pudo generar el archivo de imagen.");

          const fileName = currentCropFile
            ? currentCropFile.name
            : "producto.webp";
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = reader.result;
            const res = await apiFetch(`${API_URL}/storage/upload`, {
              method: "POST",
              body: JSON.stringify({ fileName, base64Data: base64data }),
            });

            const data = await res.json();
            if (data.success) {
              if ($("pImg")) $("pImg").value = data.publicUrl;
              if ($("pImgPreviewImg")) {
                $("pImgPreviewImg").src = data.publicUrl;
                $("pImgPreview").style.display = "block";
              }
              toast("✅ Imagen recortada y subida");
              toast(
                "✅ Imagen subida localmente (Se recomienda usar URLs externas para mayor velocidad)",
              );
              window.closeCropperModal();
            } else { 
              throw new Error(data.error);
            }
          };
        } catch (err) {
          console.error("❌ Error en subida:", err);
          toast("❌ Error al subir la imagen");
        }
      },
      "image/webp",
      0.9,
    );
  } catch (err) {
    console.error("❌ Error en confirmCrop:", err);
    toast("❌ Error al confirmar el recorte: " + err.message);
  }
};

/* ── LÓGICA DE IMPRESIÓN Y DESCARGA ── */

window.printSingleQR = () => {
  const p = window._qrCurrentProduct;
  if (!p) return toast("⚠️ Selecciona un producto primero");

  const svg = $("barcodeCanvas");
  if (!svg) return toast("⚠️ Error al generar imagen");

  // Convertir SVG a imagen para impresión
  const svgData = new XMLSerializer().serializeToString(svg);
  // Corregimos btoa para soportar UTF-8 (acentos y ñ) en nombres de productos
  const imgData =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  const win = window.open("", "_blank", "width=400,height=300");

  win.document.write(`
    <html>
      <head><title>Etiqueta - ${p.sku}</title></head>
      <style>
        @page { size: 50mm 25mm; margin: 0; }
        body { 
          margin: 0; padding: 1mm; width: 50mm; height: 25mm; 
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Poppins', sans-serif; text-align: center; box-sizing: border-box; overflow: hidden;
        }
        .brand { font-size: 8pt; font-weight: 900; letter-spacing: 2px; margin-bottom: 0.5mm; color: #000; }
        img { width: 46mm; height: 10mm; object-fit: contain; }
        .sku { font-size: 7pt; font-weight: bold; margin-top: 0.5mm; color: #000; }
        .price { font-size: 8.5pt; font-weight: 900; color: #000; margin: 0.2mm 0; }
        .name { 
          font-size: 5.5pt; color: #333; white-space: nowrap; 
          overflow: hidden; text-overflow: ellipsis; width: 100%; 
        }
      </style>
      <body>
        <div class="brand">W●NNER</div>
        <img src="${imgData}">
        <div class="sku">${p.sku}</div>
        <div class="price">${fmt(p.price)}</div>
        <div class="name">${p.name}</div>
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
  const svg = $("barcodeCanvas");
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `BARCODE_${p.sku}.png`;
    a.click();
  };
  img.src =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
};

window.downloadProductQR = window.downloadSingleQR;

window.printAllQRs = () => {
  if (!window.AppStore.state.inventory || !window.AppStore.state.inventory.length)
    return toast("No hay productos");

  const win = window.open("", "_blank", "width=600,height=800");
  const itemsHtml = window.AppStore.state.inventory
    .map(
      (p) => `
    <div class="label-item">
      <div class="brand">W●NNER</div>
      <svg id="barcode-${p.id}"></svg>
      <div class="sku">${p.sku}</div>
      <div class="price">${fmt(p.price)}</div>
      <div class="name">${p.name}</div>
    </div>
  `,
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Imprimir Etiquetas Masivas - Winner</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: 50mm 25mm; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
          .label-item {
            width: 50mm; height: 25mm;
            padding: 1mm;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: sans-serif; text-align: center;
            box-sizing: border-box; page-break-after: always;
            overflow: hidden;
          }
          .brand { font-size: 8pt; font-weight: 900; letter-spacing: 2px; }
          svg { width: 46mm; height: 9mm; }
          .sku { font-size: 7pt; font-weight: bold; }
          .price { font-size: 8.5pt; font-weight: 900; margin: 0.2mm 0; }
          .name { font-size: 5.5pt; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        </style>
      </head>
      <body>
        ${itemsHtml}
        <script>
          window.onload = () => {;
            const inv = ${JSON.stringify(window.AppStore.state.inventory.map((p) => ({ id: p.id, sku: p.sku })))};
            inv.forEach(p => {
              JsBarcode("#barcode-" + p.id, p.sku || p.id, {
                format: "CODE128", width: 2, height: 40,
                displayValue: false, margin: 0
              });
            });
            setTimeout(() => { window.print(); window.close(); }, 800);
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

  toast("⌛ Procesando base de datos a gran escala...");
  const text = await file.text();

  // Detectar separador automáticamente (, o ;)
  const firstLine = text.split("\n")[0];
  const sep = firstLine.includes(";") ? ";" : ",";

  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return toast("❌ El archivo está vacío");

  // Mapeo inteligente de encabezados (Compatible con Treinta, Excel, etc.)
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());

  // Buscar índices de columnas críticas
  const skuIdx = headers.findIndex(
    (h) =>
      h.includes("sku") ||
      h.includes("referencia") ||
      h.includes("código") ||
      h.includes("id"),
  );
  const qtyIdx = headers.findIndex(
    (h) =>
      h.includes("stock") ||
      h.includes("cantidad") ||
      h.includes("qty") ||
      h.includes("disponible"),
  );
  const sizeIdx = headers.findIndex(
    (h) => h.includes("talla") || h.includes("size"),
  );

  if (skuIdx === -1 || qtyIdx === -1) {
    console.error("Encabezados detectados:", headers);
    return toast(
      "❌ Formato no reconocido. El CSV debe tener columnas 'SKU' y 'Stock'.",
    );
  }

  const updates = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((s) => s.trim());
    const sku = cols[skuIdx];
    const qty = parseInt(cols[qtyIdx]);
    const size = sizeIdx !== -1 ? cols[sizeIdx] : "U"; // Default a "U" si no hay talla

    if (sku && !isNaN(qty)) {
      updates.push({ id: sku, sku: sku, size: size || "U", qty: qty });
    } else {
      skipped++;
    }
  }

  if (updates.length === 0)
    return toast("❌ No se encontraron productos válidos para actualizar");

  try {
    const res = await apiFetch(`${API_URL}/inventory/bulk-update`, {
      method: "POST",
      body: JSON.stringify({
        updates,
        meta: { source: "bulk_upload", count: updates.length },
      }),
    });

    if (res.ok) {
      toast(
        `✅ Sincronizados ${updates.length} productos. ${skipped > 0 ? `(${skipped} omitidos)` : ""}`,
      );
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

window.setInvCategory = setInvCategory; // Usado en HTML
window.fetchInventory = fetchInventory; // Usado globalmente por otros módulos
window.editProduct = (id) => window.openProductModal(id); // Ya estaba definido, pero lo dejamos explícito
// eslint-disable-next-line no-undef
window.deleteProduct = deleteProduct; // Usado en HTML (definido arriba)
// eslint-disable-next-line no-undef
window.showProductQR = showProductQR; // Usado en HTML
window.triggerStockUpload = triggerStockUpload; // Usado en HTML
window.handleStockUpload = handleStockUpload; // Usado en HTML
window.handleCategoryChange = handleCategoryChange; // Usado en HTML
window.renderInventory = renderInventory; // Usado globalmente por otros módulos
window.setInvStockFilter = setInvStockFilter; // Usado en HTML
