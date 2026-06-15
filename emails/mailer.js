"use strict";

const nodemailer = require("nodemailer");

/**
 * Configuración del transportador de correo.
 * Soporta configuración automática basada en el puerto para evitar el error 'Greeting never received'.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  // secure: true para puerto 465, false para 587 o 25
  secure: parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""), // Robustez: quita espacios de la App Password
  },
  pool: true, // Mantiene la conexión abierta para múltiples correos (evita timeouts)
  maxConnections: 5,
  maxMessages: 100,
  tls: {
    // No fallar si el certificado del servidor de correo es auto-firmado o tiene discrepancias de nombre
    rejectUnauthorized: false,
  },
});

// Verificar la conexión al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ [Mailer] Error de conexión SMTP:", error.message);
    
    if (error.message.includes("535") || error.message.includes("Username and Password not accepted")) {
      console.log("💡 [SOLUCIÓN GMAIL]: Google requiere una 'Contraseña de Aplicación'.");
      console.log("   Crea una aquí: https://myaccount.google.com/apppasswords");
    } else if (error.message.includes("Greeting")) {
      console.log("💡 Tip: Intenta cambiar el puerto a 465 con secure:true o 587 con secure:false.");
    }
  } else {
    console.log("📧 [Mailer] Servidor listo para enviar notificaciones.");
  }
});

const mailer = {
  /**
   * Envía confirmación de compra al cliente
   */
  async sendSaleEmail(sale) {
    if (!sale.customerEmail) return;

    const mailOptions = {
      from: `"Winner Store" <${process.env.SMTP_USER}>`,
      to: sale.customerEmail,
      subject: `🏆 ¡Gracias por tu compra, ${sale.customerName}! — Orden #${sale.id.slice(-6)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #000; text-align: center;">WINNER</h2>
          <p>Tu pedido ha sido registrado con éxito. Estamos preparando tus prendas para despacho.</p>
          <hr>
          <p><strong>Referencia:</strong> ${sale.id}</p>
          <p><strong>Total:</strong> $${Number(sale.totalAmount).toLocaleString("es-CO")}</p>
          <p><strong>Método:</strong> ${sale.paymentMethod}</p>
          <br>
          <p style="font-size: 12px; color: #777;">Winner Store Streetwear - Colombia.</p>
        </div>
      `,
    };

    return transporter.sendMail(mailOptions);
  },

  /**
   * Envía correo de recuperación de contraseña
   */
  async sendResetEmail(user, tempPassword) { // Agregamos tempPassword como parámetro
    // Determinamos el saludo basado en la hora actual de Bogotá (UTC-5)
    const now = new Date();
    const hour = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours();
    
    let greeting = "Hola";
    if (hour >= 6 && hour < 12) greeting = "Buenos días";
    else if (hour >= 12 && hour < 18) greeting = "Buenas tardes";
    else greeting = "Buenas noches";

    const mailOptions = {
      from: `"Seguridad Winner" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Recuperación de Contraseña — Winner Store",
      text: `${greeting} ${user.username}, has solicitado recuperar tu contraseña. Tu clave temporal es: ${tempPassword}`, // Usamos la contraseña generada
    };

    return transporter.sendMail(mailOptions);
  },

  /**
   * Envía el reporte de cierre de caja al administrador
   * @param {Object} session - Datos de la sesión cerrada
   * @param {Buffer} pdfBuffer - El PDF generado por ReportService
   */
  async sendCashClosingEmail(session, pdfBuffer) {
    const adminEmail = process.env.SMTP_USER; // Se envía a tu propio Gmail
    const dateStr = new Date(session.closedAt || Date.now()).toLocaleDateString("es-CO");
    const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

    const mailOptions = {
      from: `"Winner Store Reports" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📊 CIERRE DE CAJA - ${dateStr} - Orden #${session.id.slice(-6).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border: 1px solid #eee; color: #333;">
          <h2 style="text-align: center; color: #000; letter-spacing: 5px;">WINNER</h2>
          <h3 style="text-align: center; border-bottom: 2px solid #e8ff47; padding-bottom: 10px;">REPORTE DIARIO DE OPERACIONES</h3>
          
          <p>Hola, el sistema ha generado automáticamente el reporte de cierre de caja para la sesión <strong>${session.id}</strong>.</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Ventas Totales:</strong> <span style="color: #2ecc71;">${fmt(session.theoreticalSales)}</span></p>
            <p style="margin: 5px 0;"><strong>Gastos Registrados:</strong> <span style="color: #e74c3c;">${fmt(session.theoreticalExpenses)}</span></p>
            <p style="margin: 5px 0;"><strong>Saldo Final en Caja:</strong> <strong>${fmt(session.realBalance)}</strong></p>
            <p style="margin: 5px 0;"><strong>Diferencia (Arqueo):</strong> <span style="color: ${session.difference < 0 ? '#e74c3c' : '#2ecc71'};">${fmt(session.difference)}</span></p>
          </div>

          <p style="font-size: 13px; color: #777;">Adjunto a este correo encontrarás el informe detallado en formato PDF con el desglose de cada transacción.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 11px; text-align: center; color: #999;">Winner Store Streetwear Colombia — Business Intelligence System</p>
        </div>
      `,
      attachments: [
        {
          filename: `Reporte_Cierre_${session.id}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    return transporter.sendMail(mailOptions);
  },
};

module.exports = mailer;
