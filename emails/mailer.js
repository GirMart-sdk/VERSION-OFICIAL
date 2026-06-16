"use strict";

const nodemailer = require("nodemailer");

/**
 * Configuración del transportador de correo.
 * Para Gmail:
 * - SMTP_HOST: smtp.gmail.com
 * - SMTP_PORT: 465 (secure: true) o 587 (secure: false)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  // Importante: secure debe ser true solo para el puerto 465
  secure: parseInt(process.env.SMTP_PORT || "465") === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Asegúrate de usar un "App Password" de 16 caracteres
  },
  tls: {
    // Evita errores de negociación en redes locales o con firewalls
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 segundos
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ [Mailer] Error de configuración SMTP:", error.message);
  } else {
    console.log("📧 [Mailer] Servidor de correo listo para enviar mensajes");
  }
});

// --- FUNCIONES DE ENVÍO ---

/**
 * Envía confirmación de compra al cliente.
 */
async function sendSaleEmail(sale) {
  if (!sale.customerEmail) return;
  const mailOptions = {
    from: `"Winner Store" <${process.env.SMTP_USER}>`,
    to: sale.customerEmail,
    subject: `🏆 ¡Gracias por tu compra, ${sale.customerName}! — Orden #${sale.id.slice(-6)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="text-align: center;">WINNER</h2>
        <p>Tu pedido ha sido registrado con éxito. Estamos preparando tus prendas para despacho.</p>
        <hr>
        <p><strong>Referencia:</strong> ${sale.id}</p>
        <p><strong>Total:</strong> $${Number(sale.totalAmount).toLocaleString("es-CO")}</p>
        <p><strong>Método de Pago:</strong> ${sale.paymentMethod}</p>
        <br>
        <p style="font-size: 12px; color: #777;">Winner Store Streetwear - Colombia.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Envía correo de recuperación de contraseña.
 */
async function sendResetEmail(user, tempPassword) {
  const email = user.email || user.username;
  if (!email.includes("@")) return;
  const mailOptions = {
    from: `"Seguridad Winner" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Recuperación de Contraseña — Winner Store",
    text: `Hola ${user.username}, has solicitado recuperar tu contraseña. Tu clave temporal es: ${tempPassword}\n\nTe recomendamos cambiarla inmediatamente al ingresar.`,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Notifica sobre ráfagas de intentos fallidos.
 */
async function sendSecurityAlert(ip, user, userAgent) {
  const mailOptions = {
    from: `"Alerta de Seguridad" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `🚨 ALERTA: Múltiples fallos de login desde ${ip}`,
    html: `<p>Se detectaron 10 fallos en 1 minuto contra el usuario <b>${user}</b>.</p><p>IP: ${ip}<br>Dispositivo: ${userAgent}</p>`,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Alerta general para el administrador.
 */
async function sendAdminAlert(title, message, level = "info") {
  const mailOptions = {
    from: `"Winner System" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `[${level.toUpperCase()}] ${title}`,
    text: message,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Envía el reporte diario de ventas.
 */
async function sendDailyReportEmail(reportData) {
  const mailOptions = {
    from: `"Reportes Winner" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `📊 Reporte de Operaciones - ${reportData.date}`,
    html: `<h3>Resumen del día</h3><p>Ventas: $${reportData.totalSales.toLocaleString()}</p>`,
  };
  return transporter.sendMail(mailOptions);
}

// Stubs para generadores de PDF (pueden expandirse con pdfkit si es necesario)
async function generateInvoicePDF(sale) { return null; }
async function generateDailyReportPDF(data) { return null; }

// Export public functions
module.exports = {
  sendSaleEmail,
  sendResetEmail,
  sendSecurityAlert,
  sendAdminAlert,
  sendDailyReportEmail,
  generateInvoicePDF,
  generateDailyReportPDF,
};
