"use strict";

const path = require("path");
// Cargar variables de entorno desde la raíz
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const ReportService = require("./services/reportService");
const mailer = require("../emails/mailer");

async function testCloseEmail() {
  console.log("🧪 Iniciando prueba de envío de reporte de cierre...");
  console.log(`   Destinatario (SMTP_USER): ${process.env.SMTP_USER}`);

  // 1. Mock de datos de sesión (Arqueo simulado)
  const mockSession = {
    id: "CS-TEST-" + Date.now().toString(36).toUpperCase(),
    openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // Hace 8 horas
    closedAt: new Date(),
    openedBy: "Admin Tester",
    initialBalance: 100000,
    theoreticalSales: 450000,
    theoreticalExpenses: 50000,
    realBalance: 500000,
    difference: 0,
    notes: "Sesión de prueba para validación de correo y diseño de PDF."
  };

  // 2. Mock de ventas para la tabla del PDF
  const mockSales = [
    { createdAt: new Date(), customerName: "Juan Perez (Test)", paymentMethod: "Efectivo", totalAmount: 150000 },
    { createdAt: new Date(), customerName: "Maria Lopez (Test)", paymentMethod: "Wompi / Online", totalAmount: 300000 }
  ];

  // 3. Mock de gastos para la tabla del PDF
  const mockExpenses = [
    { concept: "Reparación Luz", method: "Efectivo", amount: 20000 },
    { concept: "Insumos Empaque", method: "Efectivo", amount: 30000 }
  ];

  try {
    console.log("📄 Paso 1: Generando PDF profesional en memoria...");
    const pdfBuffer = await ReportService.generateCashClosingPDF(mockSession, mockSales, mockExpenses);
    
    console.log("📧 Paso 2: Enviando correo con adjunto...");
    await mailer.sendCashClosingEmail(mockSession, pdfBuffer);
    
    console.log("\n✨ RESULTADO: Reporte enviado con éxito. Revisa tu Gmail (incluyendo SPAM).");
  } catch (err) {
    console.error("\n❌ ERROR EN LA PRUEBA:");
    console.error(err.message);
  }
}

testCloseEmail();