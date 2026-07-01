/**
 * WINNER STORE - Public Store Bundle Entry Point
 *
 * This file imports all necessary JavaScript modules for the public store.
 * `esbuild` will use this file to create a single, optimized bundle.
 */
"use strict";

// Importar dependencias de NPM (si las hubiera para la tienda)
window.Html5Qrcode = require('html5-qrcode').Html5Qrcode;

// Módulos principales de la tienda
require("./shared/core.js");
require("./store/app.js");

// Módulos secundarios que estaban sueltos, ahora organizados.
require("./store/modules/shipping-logic.js");
require("./store/modules/shop.js");
require("./store/modules/help.js");
require("./store/modules/info.js");
require("./store/modules/store-info.js");
require("./store/modules/returns.js");
require("./store/modules/categories-rotator.js");
require("./store/modules/hero-effects.js");
require("./store/modules/feedback.js");
require("./store/modules/featured.js");
require("./store/modules/promo.js");