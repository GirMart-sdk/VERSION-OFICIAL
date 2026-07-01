/**
 * WINNER STORE - Admin Panel Bundle Entry Point
 * 
 * This file imports all necessary JavaScript modules for the admin panel.
 * `esbuild` will use this file to create a single, optimized bundle.
 */
 "use strict"; // Re-added for consistency, though ES modules handle strict mode implicitly.

// Importar dependencias de NPM
window.Cropper = require('cropperjs');
window.Html5Qrcode = require('html5-qrcode').Html5Qrcode;
window.JsBarcode = require('jsbarcode');
window.QRCode = require('qrcodejs');


require("./shared/core.js");          // Módulos compartidos primero
require("./shared/store.js");         // El gestor de estado es crucial
require("./shared/storage-core.js");

require("./admin/auth.js");           // Lógica de autenticación
require("./admin/dashboard.js");      // Módulos del panel de admin
require("./admin/inventory.js");
require("./admin/pos.js");
require("./admin/sales-logic.js");
require("./admin/payments-logic.js");
require("./admin/expenses-logic.js"); // Movido desde goper/
require("./admin/cash-logic.js");
require("./admin/messaging.js");
require("./admin/scanner.js");
require("./admin/dashboard-themes.js"); // Movido desde themead/