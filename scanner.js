/* ═══════════════════════════════════════════════════════
   WINNER — scanner.js (Gestión de QR)
   ═══════════════════════════════════════════════════════ */
let html5QrScanner = null;
let _scanMode = "inventory";

window.setScanMode = (mode) => {
  _scanMode = mode;
  if ($("scanModeInventory"))
    $("scanModeInventory").classList.toggle("active", mode === "inventory");
  if ($("scanModePOS"))
    $("scanModePOS").classList.toggle("active", mode === "pos");
};

async function startScanner() {
  if (html5QrScanner) return;
  html5QrScanner = new Html5Qrcode("scannerBox");
  await html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 15, qrbox: 250 },
    (text) => {
      let data = text;
      try {
        data = JSON.parse(text).id || text;
      } catch (e) {}
      const p = window.inventory.find((x) => x.id === data || x.sku === data);
      if (p) {
        if (_scanMode === "pos") {
          window.addToPOSCartById(p.id, "M");
          toast("🛒 " + p.name);
        } else {
          toast("📦 " + p.name);
          window.editProduct(p.id);
        }
      } else {
        toast("⚠ No encontrado");
      }
    },
    () => {},
  );
  $("startScanBtn").style.display = "none";
  $("stopScanBtn").style.display = "block";
}

window.stopScanner = () => {
  if (html5QrScanner)
    html5QrScanner.stop().then(() => {
      html5QrScanner = null;
      $("startScanBtn").style.display = "block";
      $("stopScanBtn").style.display = "none";
    });
};

window.closeMobileScannerLink = () => {
  $("mobileScanOverlay")?.classList.remove("open");
  $("mobileScanModal")?.classList.remove("open");
};

window.processManualQR = () => {
  const val = $("manualQRInput").value.trim();
  const p = window.inventory.find((x) => x.sku === val || x.id === val);
  if (p) {
    if (_scanMode === "pos") window.addToPOSCartById(p.id, "M");
    else window.editProduct(p.id);
  } else toast("⚠ No encontrado");
};

window.openMobileScannerLink = () => {
  let baseUrl = window.location.origin;

  // Si detectamos localhost, avisamos al usuario que el QR podría no funcionar en el cel
  if (window.location.hostname === "localhost") {
    toast("⚠️ Nota: Entra por IP local para que el QR funcione en tu celular");
  }

  const url = baseUrl + window.location.pathname + "#qrscan";

  const box = $("mobileScanQR");
  box.innerHTML = "";
  new QRCode(box, { text: url, width: 200, height: 200 });
  $("mobileScanModal").classList.add("open");
  $("mobileScanOverlay").classList.add("open");
};
