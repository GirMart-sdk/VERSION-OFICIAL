/**
 * WINNER STORE - Admin Panel Bundle Entry Point
 * 
 * This file imports all necessary JavaScript modules for the admin panel.
 * `esbuild` will use this file to create a single, optimized bundle.
 */
 "use strict"; // Re-added for consistency, though ES modules handle strict mode implicitly.

require("./core.js"); // Core utilities and global functions
require("./auth.js"); // Authentication related logic
require("./storage-core.js"); // Local storage management
require("./inventory.js"); // Inventory management
require("./pos.js"); // Point of Sale logic
require("./scanner.js"); // Barcode scanner integration
require("./themead/dashboard-themes.js"); // Dashboard theme management
require("./messaging.js"); // Messaging and notifications
require("./dashboard.js"); // Dashboard specific logic
require("./sales-logic.js"); // Sales processing logic
require("./payments-logic.js"); // Payment handling logic
require("./goper/expenses-logic.js"); // Expenses management
require("./cash-logic.js"); // Cash register/arqueo logic