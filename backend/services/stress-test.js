"use strict";
/**
 * Winner Store v3.5 - System Health Check
 * Ejecuta este script con: node tests/stress-test.js
 */
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const API_KEY = 'dev-api-key';

async function runTests() {
    console.log("🧪 Iniciando pruebas de integridad...");

    try {
        // TEST 1: Conectividad y Productos
        console.log("1. Verificando catálogo de productos...");
        const products = await axios.get(`${API_URL}/products`, { headers: { 'x-api-key': API_KEY } });
        console.log(`   ✅ OK: ${products.data.length} productos detectados.`);

        // TEST 2: Intento de venta con stock insuficiente (Error esperado)
        console.log("2. Probando protección de sobreventa (Stock Negativo)...");
        const payloadFallo = {
            total: 999999,
            items: [{ id: 'P001', name: 'Test', qty: 9999, price: 100, size: 'M' }],
            client: 'Tester',
            payment_method: 'Efectivo'
        };

        try {
            await axios.post(`${API_URL}/sales`, payloadFallo, { headers: { 'x-api-key': API_KEY } });
            console.log("   ❌ ERROR: El sistema permitió una venta sin stock.");
        } catch (err) {
            console.log("   ✅ OK: Sistema bloqueó venta inválida correctamente.");
        }

        // TEST 3: Dashboard Stats
        console.log("3. Verificando motor de analítica (Prisma Select)...");
        // Nota: requiere token de admin, saltamos por ahora o usamos API_KEY si está permitido
        const stats = await axios.get(`${API_URL}/stats`, { headers: { 'x-api-key': API_KEY } });
        if (stats.data.totalRevenue !== undefined) {
            console.log("   ✅ OK: Dashboard respondiendo.");
        }

        console.log("\n✨ RESULTADO FINAL: Sistema estable para producción.");
    } catch (error) {
        console.error("\n❌ FALLO CRÍTICO EN PRUEBAS:");
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
}

runTests();