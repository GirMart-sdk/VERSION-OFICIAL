"use strict";

const PDFDocument = require("pdfkit");

/**
 * ReportService — Generador de documentos PDF profesionales
 */
const ReportService = {
  /**
   * Genera un reporte PDF detallado del cierre de caja (Arqueo)
   * @param {Object} session - Datos de la sesión de CashSession (incluyendo totales)
   * @param {Array} sales - Lista de ventas realizadas en el turno
   * @param {Array} expenses - Lista de gastos realizados en el turno
   */
  async generateCashClosingPDF(session, sales = [], expenses = []) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

      // --- CABECERA ESTILO BRANDING ---
      doc.fillColor("#000000").rect(0, 0, 612, 120).fill();
      doc.fillColor("#ffffff").fontSize(35).font("Helvetica-Bold").text("WINNER", 50, 40);
      doc.fontSize(10).font("Helvetica").text("STREETWEAR COLOMBIA — SISTEMA DE GESTIÓN", 50, 80);
      
      doc.fillColor("#e8ff47").fontSize(18).font("Helvetica-Bold").text("CIERRE DE CAJA", 350, 45, { align: "right", width: 200 });
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica").text(`ID SESIÓN: ${session.id.toUpperCase()}`, 350, 70, { align: "right", width: 200 });
      doc.text(`FECHA: ${new Date(session.closedAt || Date.now()).toLocaleString("es-CO")}`, 350, 82, { align: "right", width: 200 });

      // --- INFO DEL RESPONSABLE ---
      doc.fillColor("#000000").fontSize(12).font("Helvetica-Bold").text("INFORMACIÓN DE LA SESIÓN", 50, 140);
      doc.moveTo(50, 155).lineTo(550, 155).lineWidth(1).strokeColor("#eeeeee").stroke();

      doc.fontSize(10).fillColor("#333333").font("Helvetica");
      doc.text(`Cajero/Administrador: ${session.openedBy}`, 50, 165);
      doc.text(`Hora Apertura: ${new Date(session.openedAt).toLocaleTimeString()}`, 50, 178);
      doc.text(`Hora Cierre: ${session.closedAt ? new Date(session.closedAt).toLocaleTimeString() : 'En proceso'}`, 50, 191);

      // --- BLOQUE DE RESUMEN FINANCIERO (KPIs) ---
      doc.roundedRect(50, 215, 500, 80, 5).fillColor("#f9f9f9").fill().strokeColor("#e0e0e0").stroke();
      
      // Columna 1
      doc.fillColor("#666666").fontSize(8).text("SALDO INICIAL", 70, 230);
      doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold").text(fmt(session.initialBalance), 70, 242);
      
      doc.fillColor("#666666").fontSize(8).text("VENTAS TOTALES (+)", 70, 265);
      doc.fillColor("#2ecc71").fontSize(12).text(fmt(session.theoreticalSales), 70, 275);

      // Columna 2
      doc.fillColor("#666666").fontSize(8).text("GASTOS TOTALES (-)", 230, 230);
      doc.fillColor("#e74c3c").fontSize(12).text(fmt(session.theoreticalExpenses), 230, 242);

      doc.fillColor("#666666").fontSize(8).text("TOTAL ESPERADO", 230, 265);
      doc.fillColor("#000000").fontSize(12).text(fmt(Number(session.initialBalance) + Number(session.theoreticalSales) - Number(session.theoreticalExpenses)), 230, 275);

      // Columna 3 (Resultado)
      const diff = Number(session.difference || 0);
      doc.fillColor("#000000").fontSize(8).text("SALDO REAL EN FÍSICO", 400, 230);
      doc.fontSize(14).text(fmt(session.realBalance), 400, 242);
      
      doc.fillColor(diff < 0 ? "#e74c3c" : diff > 0 ? "#f39c12" : "#2ecc71");
      doc.fontSize(8).text("DIFERENCIA (Arqueo)", 400, 265);
      doc.fontSize(12).text(fmt(diff), 400, 275);

      // --- TABLA DE VENTAS ---
      let currentY = 320;
      doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("RESUMEN DE VENTAS", 50, currentY);
      currentY += 20;

      // Encabezado Tabla
      doc.fillColor("#f0f0f0").rect(50, currentY, 500, 20).fill();
      doc.fillColor("#000000").fontSize(9).text("HORA", 60, currentY + 6);
      doc.text("CLIENTE", 110, currentY + 6);
      doc.text("MÉTODO", 300, currentY + 6);
      doc.text("TOTAL", 480, currentY + 6, { align: "right", width: 60 });
      
      currentY += 25;
      doc.font("Helvetica").fontSize(8);
      
      sales.forEach((s) => {
        if (currentY > 750) { doc.addPage(); currentY = 50; }
        doc.fillColor("#333333").text(new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 60, currentY);
        doc.text(s.customerName.substring(0, 25), 110, currentY);
        doc.text(s.paymentMethod, 300, currentY);
        doc.text(fmt(s.totalAmount), 480, currentY, { align: "right", width: 60 });
        currentY += 15;
      });

      if (sales.length === 0) {
        doc.fillColor("#999").text("No se registraron ventas en esta sesión.", 60, currentY);
        currentY += 15;
      }

      // --- TABLA DE GASTOS ---
      currentY += 20;
      doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("RESUMEN DE GASTOS", 50, currentY);
      currentY += 20;

      doc.fillColor("#f0f0f0").rect(50, currentY, 500, 20).fill();
      doc.fillColor("#000000").fontSize(9).text("CONCEPTO", 60, currentY + 6);
      doc.text("MÉTODO", 300, currentY + 6);
      doc.text("MONTO", 480, currentY + 6, { align: "right", width: 60 });

      currentY += 25;
      doc.font("Helvetica").fontSize(8);

      expenses.forEach((e) => {
        if (currentY > 750) { doc.addPage(); currentY = 50; }
        doc.fillColor("#333333").text(e.concept.substring(0, 35), 60, currentY);
        doc.text(e.method, 300, currentY);
        doc.text(fmt(e.amount), 480, currentY, { align: "right", width: 60 });
        currentY += 15;
      });

      if (expenses.length === 0) {
        doc.fillColor("#999").text("No se registraron gastos en esta sesión.", 60, currentY);
        currentY += 15;
      }

      // --- PIE DE PÁGINA Y FIRMAS ---
      currentY = 720;
      doc.moveTo(50, currentY).lineTo(200, currentY).lineWidth(1).strokeColor("#999").stroke();
      doc.moveTo(350, currentY).lineTo(500, currentY).stroke();
      doc.fontSize(8).text("Firma Cajero", 50, currentY + 5, { width: 150, align: "center" });
      doc.text("Firma Auditor/Admin", 350, currentY + 5, { width: 150, align: "center" });

      doc.fontSize(7).fillColor("#aaaaaa").text("Documento generado automáticamente por Winner Store Management v3.5", 50, 780, { align: "center", width: 500 });

      doc.end();
    });
  }
};

module.exports = ReportService;