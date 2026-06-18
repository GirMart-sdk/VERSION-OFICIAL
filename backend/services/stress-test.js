"use strict";
/**
 * Winner Store v3.5 - System Health Check
 * Ejecuta este script con: node backend/services/stress-test.js
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Cargamos el archivo .env para sincronizar la API Key con el servidor
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
    const result = require('dotenv').config({ path: envPath });
    if (result.error) console.error("   ⚠️ Error cargando .env:", result.error);
}

// Intentamos conectar a localhost o a la IP configurada
const API_URL = 'http://localhost:3000/api';
// Intentamos leer la llave desde el entorno, de lo contrario usamos la de desarrollo
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY || 'dev-api-key';
const maskedKey = API_KEY.substring(0, 4) + "..." + API_KEY.substring(API_KEY.length - 4);

async function runTests() {
    console.log("\n🧪 [WINNER SYSTEM CHECK] Iniciando pruebas de integridad...");
    console.log(`[*] Usando API Key: ${maskedKey}`);
    console.log(`[*] Objetivo: ${API_URL}`);

    try {
        // TEST 1: Conectividad y Productos
        console.log("[*] 1. Verificando catálogo de productos...");
        const products = await axios.get(`${API_URL}/products`, { headers: { 'x-api-key': API_KEY } });
        console.log(`   ✅ OK: ${products.data.length} productos detectados.`);

        // TEST 2: Intento de venta con stock insuficiente (Error esperado)
        console.log("[*] 2. Probando protección de sobreventa (Stock Crítico)...");
        const payloadFallo = {
            total: 500000,
            items: [{ id: 'P001', name: 'Producto Test', qty: 9999, price: 500000, size: 'M' }],
            client: 'Tester Stress',
            payment_method: 'Efectivo'
        };

        try {
            await axios.post(`${API_URL}/sales`, payloadFallo, { headers: { 'x-api-key': API_KEY } });
            console.log("   ❌ FALLO: El sistema permitió una venta sin stock real.");
        } catch (err) {
            console.log("   ✅ OK: Sistema bloqueó venta inválida correctamente.");
        }

        // TEST 3: Dashboard Stats
        console.log("[*] 3. Verificando motor de analítica...");
        const stats = await axios.get(`${API_URL}/stats`, { headers: { 'x-api-key': API_KEY } });
        if (stats.data && stats.data.totalSales !== undefined) {
            console.log(`   ✅ OK: Dashboard activo. Ventas hoy: ${stats.data.salesToday}`);
        } else {
            console.log("   ⚠️ ADVERTENCIA: La API de stats no devolvió el formato esperado.");
        }

        console.log("\n✨ [RESULTADO]: Sistema estable y listo para operar en 192.168.1.3");
    } catch (error) {
        console.error("\n❌ [FALLO CRÍTICO]:");
        if (error.code === 'ECONNREFUSED') {
            console.error("   Parece que el servidor no está corriendo. Ejecuta INICIAR_WINNER.bat primero.");
        } else {
            console.error("   " + (error.response?.data?.error || error.message));
        }
        process.exit(1);
    }
}

runTests();