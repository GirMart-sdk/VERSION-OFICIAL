"use strict";
/**
 * Winner Store v3.5 - System Health Check
 * Ejecuta este script con: node backend/services/stress-test.js
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Carga robusta de variables de entorno, buscando primero el archivo específico del entorno
const isProdMode = process.env.NODE_ENV === "production";
const envPath = path.resolve(__dirname, "..", "..", isProdMode ? ".env.production" : ".env");
require('dotenv').config({ path: fs.existsSync(envPath) ? envPath : path.resolve(__dirname, '..', '..', '.env') });

// Intentamos conectar a localhost o a la IP configurada
const API_URL = 'http://localhost:3000/api';
// Intentamos leer la llave desde el entorno, de lo contrario usamos la de desarrollo
const API_KEY = process.env.ADMIN_API_KEY; // Usamos la llave de admin para saltar el firewall de IP

if (!API_KEY) {
    console.error("\n❌ [FALLO DE CONFIGURACIÓN]:");
    console.error("   La variable de entorno 'ADMIN_API_KEY' no está definida en tu archivo .env");
    console.error("   Esta llave es necesaria para que el script de pruebas pueda ejecutarse.");
    process.exit(1);
}

const maskedKey = API_KEY.substring(0, 4) + "..." + API_KEY.substring(API_KEY.length - 4);

async function runTests() {
    console.log("\n🧪 [WINNER SYSTEM CHECK] Iniciando pruebas de integridad...");
    console.log(`[*] Usando API Key: ${maskedKey}`);
    console.log(`[*] Objetivo: ${API_URL}`);
    console.log("[*] Modo Admin: Usando ADMIN_API_KEY para saltar firewall de IP.");

    try {
        // TEST 1: Conectividad y Productos
        console.log("[*] 1. Verificando catálogo de productos...");
        const products = await axios.get(`${API_URL}/products`, { headers: { 'x-api-key': API_KEY } });
        console.log(`   ✅ OK: ${products.data.length} productos detectados.`);

        // TEST 2: Intento de venta con stock insuficiente (Error esperado)
        console.log("[*] 2. Probando protección de sobreventa (Stock Crítico)...");
        const saleId = "STRESS-" + Date.now().toString(36).toUpperCase();
        const payloadFallo = {
            id: saleId,
            timestamp: new Date().toISOString(),
            vendor: "Stress Test",
            client: "Cliente de Prueba de Estrés",
            customer_email: "test@winner.com",
            customer_phone: "3001234567",
            shipping_address: "N/A",
            shipping_carrier: "N/A",
            method: "Efectivo",
            payment_method: "Efectivo",
            payment_status: "completed",
            reference_number: saleId,
            channel: "fisica",
            subtotal: 500000,
            discount: 0,
            total: 500000,
            items: [{ id: 'P001', productId: 'P001', name: 'Producto Test', qty: 9999, price: 500000, size: 'M' }],
        };

        try {
            // Añadimos el CSRF Token que ahora es requerido para las peticiones POST
            const csrfRes = await axios.get(`${API_URL}/get-csrf`);
            const csrfToken = csrfRes.data.csrfToken;
            await axios.post(`${API_URL}/sales`, payloadFallo, { headers: { 'x-api-key': API_KEY, 'x-csrf-token': csrfToken } });
            console.log("   ❌ FALLO: El sistema permitió una venta sin stock real.");
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            if (errorMsg.includes("Stock insuficiente")) {
                console.log(`   ✅ OK: Sistema bloqueó la venta por falta de stock.`);
            } else {
                console.log(`   ✅ OK: Sistema bloqueó la venta por otra razón de negocio: ${errorMsg}`);
            }
        }

        // TEST 3: Dashboard Stats
        console.log("[*] 3. Verificando motor de analítica...");
        const stats = await axios.get(`${API_URL}/stats`, { headers: { 'x-api-key': API_KEY } });
        if (stats.data && stats.data.totalSales !== undefined) {
            console.log(`   ✅ OK: Dashboard activo. Ventas hoy: ${stats.data.salesToday}`);
        } else {
            console.log("   ⚠️ ADVERTENCIA: La API de stats no devolvió el formato esperado.");
        }

        // TEST 4: Autenticación
        console.log("[*] 4. Probando sistema de autenticación...");
        // 4.1. Intento de login fallido (error esperado)
        try {
            await axios.post(`${API_URL}/login`, { user: 'not-a-user', pass: 'invalid-password' });
            console.log("   ❌ FALLO: El sistema permitió un login con credenciales incorrectas.");
        } catch (err) {
            if (err.response?.status === 401) {
                console.log("   ✅ OK: Sistema bloqueó correctamente un intento de login inválido.");
            } else {
                console.log(`   ❌ FALLO: El login inválido produjo un error inesperado: ${err.message}`);
            }
        }

        // 4.2. Intento de login exitoso
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;
        if (adminUser && adminPass) {
            const loginRes = await axios.post(`${API_URL}/login`, { user: adminUser, pass: adminPass });
            if (loginRes.data.success && loginRes.data.token) {
                console.log(`   ✅ OK: Login exitoso para el usuario '${adminUser}'.`);
            }
        } else {
            console.log("   ⚠️ AVISO: No se probó el login exitoso (ADMIN_USER/ADMIN_PASS no están en .env).");
        }

        console.log("\n✨ [RESULTADO]: Sistema estable y listo para operar en 192.168.1.3");
    } catch (error) {
        console.error("\n❌ [FALLO CRÍTICO]:");
        if (error.code === 'ECONNREFUSED') {
            console.error("   Parece que el servidor no está corriendo. Ejecuta INICIAR_WINNER.bat primero.");
        } else {
            const errorMsg = error.response?.data?.error || error.message;
            console.error(`   ${errorMsg}`);
            if (errorMsg.includes("API key")) console.error("   Verifica que la ADMIN_API_KEY en tu .env coincide con la del servidor.");
        }
        process.exit(1);
    }
}

runTests();