"use strict";
/**
 * Script para simular una venta de tipo "Separado"
 * Verifica la actualización de KPIs de Deuda y Efectivo.
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:3000/api';
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY || 'dev-api-key';

async function simulateLayaway() {
    console.log("\n🚀 [SIMULADOR DE VENTA] Iniciando venta de tipo SEPARADO...");

    const saleData = {
        id: "SIM-" + Date.now().toString(36).toUpperCase(),
        client: "Cliente de Prueba Neon",
        customer_phone: "573000000000",
        total: 85000,
        payment_method: "Efectivo",
        payment_status: "partial", // Indica que es un separado
        channel: "fisica",
        vendor: "Simulador",
        items: [
            { id: "P001", name: "Camiseta Streetwear Oversize", qty: 1, price: 85000, size: "M" }
        ],
        payment_details: {
            isLayaway: true,
            abonoAmount: 30000, // El cliente deja 30k, debe 55k
            shipping_status: "ABONO"
        }
    };

    try {
        const res = await axios.post(`${API_URL}/sales`, saleData, { 
            headers: { 'x-api-key': API_KEY } 
        });
        
        if (res.data.success || res.status === 200) {
            console.log("✅ VENTA REGISTRADA CON ÉXITO");
            console.log("------------------------------------------");
            console.log(`💰 Total Venta:   $85,000`);
            console.log(`💵 Abono (Caja):  $30,000`);
            console.log(`🟠 Deuda Creada:  $55,000`);
            console.log("------------------------------------------");
            console.log("👉 Ahora ve al Dashboard y presiona F5 o navega a otra sección y vuelve.");
        }
    } catch (error) {
        console.error("❌ ERROR AL SIMULAR VENTA:");
        
        const serverMsg = error.response?.data?.error || error.response?.data?.message;
        if (serverMsg) {
            console.error(`   Motivo: ${serverMsg}`);
        } else {
            console.error(`   Detalle técnico: ${error.message}`);
        }

        if (error.message.includes("Stock insuficiente")) {
            console.log("⚠️ Tip: Asegúrate de que el producto P001 tenga stock en el Seed o Inventario.");
        }
    }
}

simulateLayaway();