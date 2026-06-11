"use strict";

const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

/**
 * Configuración del transportador de correo.
 * Utiliza variables de entorno para máxima seguridad.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.resend.com",
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    // Resend requiere que el usuario sea siempre "resend" para SMTP
    user: (process.env.EMAIL_HOST || "").includes("resend")
      ? "resend"
      : process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar la conexión con el servidor de correo al iniciar
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ [Mailer] Error de configuración SMTP:", error.message);
  } else {
    console.log("📧 [Mailer] Servidor de correo listo para enviar mensajes");
  }
});

/**
 * Genera un buffer de PDF con el diseño de la marca.
 * @param {Object} sale - Objeto de la venta.
 */
async function generateInvoicePDF(sale) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // --- CABECERA ---
    doc.fillColor("#000000").rect(0, 0, 600, 100).fill();

    // Marca / Logo (Lado Izquierdo) - Usamos texto plano para evitar caracteres invalidos
    doc.fillColor("#ffffff").fontSize(28).text("WINNER", 50, 35);
    doc.fillColor("#ffffff").fontSize(9).text("STREETWEAR COLOMBIA", 50, 68);

    // Informacion de Factura (Lado Derecho)
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    doc
      .fillColor("#e8ff47")
      .fontSize(16)
      .text("FACTURA DE VENTA", 350, 35, { align: "right", width: 200 });
    doc
      .fillColor("#ffffff")
      .fontSize(9)
      .text(`ORDEN: #${sale.id.slice(-8).toUpperCase()}`, 350, 58, {
        align: "right",
        width: 200,
      });
    doc.text(`FECHA: ${dateStr}`, 350, 72, {
      align: "right",
      width: 200,
    });

    // --- DATOS CLIENTE ---
    doc.fillColor("#000000").fontSize(11).text("DATOS DEL CLIENTE", 50, 130);
    doc
      .moveTo(50, 145)
      .lineTo(550, 145)
      .lineWidth(1)
      .strokeColor("#eeeeee")
      .stroke();

    doc.fontSize(10).fillColor("#333333");
    let curY = 160;
    doc.text(`Nombre: ${sale.customerName.toUpperCase()}`, 50, curY);
    doc.text(`Email: ${sale.customerEmail}`, 50, curY + 15);
    doc.text(`Tel: ${sale.customerPhone || "---"}`, 50, curY + 30);
    doc.text(
      `Dir: ${sale.shippingAddress || "Recogida en tienda"}`,
      50,
      curY + 45,
    );

    // --- TABLA DE PRODUCTOS ---
    curY = 240;
    doc.fillColor("#f9f9f9").rect(50, curY, 500, 20).fill();
    doc
      .fillColor("#000000")
      .fontSize(9)
      .text("DESCRIPCION", 60, curY + 6);
    doc.text("CANT", 350, curY + 6, { width: 40, align: "center" });
    doc.text("PRECIO", 400, curY + 6, { width: 70, align: "right" });
    doc.text("TOTAL", 480, curY + 6, { width: 70, align: "right" });

    curY += 30;
    doc.fillColor("#333333");
    sale.items.forEach((item) => {
      const prodName = `${item.product.name} (${item.size})`;
      const textHeight = doc.heightOfString(prodName, { width: 280 });

      doc.text(prodName, 60, curY, { width: 280 });
      doc.text(item.quantity.toString(), 350, curY, {
        width: 40,
        align: "center",
      });
      doc.text(`$${item.unitPrice.toLocaleString("es-CO")}`, 400, curY, {
        width: 70,
        align: "right",
      });
      doc.text(
        `$${(item.unitPrice * item.quantity).toLocaleString("es-CO")}`,
        480,
        curY,
        { width: 70, align: "right" },
      );

      curY += Math.max(textHeight, 20) + 5;
    });

    // --- TOTAL ---
    curY += 10;
    doc
      .moveTo(350, curY)
      .lineTo(550, curY)
      .lineWidth(2)
      .strokeColor("#000000")
      .stroke();
    curY += 10;
    doc.fontSize(12).fillColor("#000000").text("TOTAL A PAGAR:", 350, curY);
    doc
      .fontSize(14)
      .text(`$${sale.totalAmount.toLocaleString("es-CO")}`, 440, curY, {
        align: "right",
        width: 110,
      });

    // --- PIE DE PÁGINA ---
    doc
      .fontSize(8)
      .fillColor("#aaaaaa")
      .text("Gracias por elegir Winner Store Streetwear.", 50, 780, {
        align: "center",
      });

    doc.end();
  });
}

/**
 * Envía un correo de confirmación de venta al cliente.
 * @param {Object} sale - Objeto de la venta incluyendo items y productos.
 */
async function sendSaleEmail(sale) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) return;
  if (!sale.customerEmail) return;

  const pdfBuffer = await generateInvoicePDF(sale);
  const accentColor = "#e8ff47";

  const itemsHtml = sale.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #252525; color: #f5f5f0;">${item.product.name} <br><small style="color:${accentColor}">Talla: ${item.size}</small></td>
      <td style="padding: 12px; border-bottom: 1px solid #252525; text-align: center; color: #f5f5f0;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #252525; text-align: right; color: ${accentColor}; font-weight: bold;">$${item.unitPrice.toLocaleString("es-CO")}</td>
    </tr>`,
    )
    .join("");

  const mailOptions = {
    from: `"Winner Store" <${process.env.EMAIL_USER}>`,
    to: sale.customerEmail,
    subject: `🔥 Confirmación de Pedido #${sale.id.slice(-6).toUpperCase()}`,
    html: `
      <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: auto; background: #0a0a0a; color: #f5f5f0; padding: 40px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #ffffff;">W<span style="color: #f40202;">●</span>NNER</h1>
          <p style="font-size: 10px; letter-spacing: 2px; color: #777;">STREETWEAR COLOMBIA</p>
        </div>
        
        <h2 style="color: #FF9800; text-align: center; font-size: 24px;">¡YA ERES UN GANADOR, ${sale.customerName.split(" ")[0].toUpperCase()}!</h2>
        <p style="text-align: center; color: #777; font-size: 14px;">Tu pedido ha sido recibido con éxito. Adjuntamos tu factura oficial en PDF.</p>
        
        <div style="background: #000000; padding: 20px; border-radius: 4px; margin: 30px 0; border: 1px solid #000000;">
          <h3 style="margin-top: 0; font-size: 12px; color: #ff0000; letter-spacing: 2px;">RESUMEN DE ORDEN</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px; font-size: 11px; border-bottom: 2px solid ${accentColor};">PRODUCTO</th>
              <th style="padding: 10px; font-size: 11px; border-bottom: 2px solid ${accentColor};">CANT.</th>
              <th style="text-align: right; padding: 10px; font-size: 11px; border-bottom: 2px solid #ff0000;">PRECIO</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="text-align: right; margin-top: 25px;">
          <p style="margin: 0; color: #03f4d9; font-size: 12px;">VALOR TOTAL</p>
          <h3 style="margin: 5px 0 0 0; color: #e4ba00fb; font-size: 28px;">$${sale.totalAmount.toLocaleString("es-CO")}</h3>
        </div>
        </div>

        <div style="text-align: center; margin-top: 40px; border-top: 1px solid #252525; padding-top: 30px;">
          <img src="https://wompi.com/assets/img/logos/wompi-logo.png" alt="Wompi" style="width: 80px; filter: grayscale(1); opacity: 0.5;">
          <p style="font-size: 10px; color: #999; margin-top: 5px;">Transacción segura garantizada por el ecosistema Bancolombia.</p>
        </div>
        
        <p style="font-size: 11px; color: #555; text-align: center; margin-top: 20px; line-height: 1.6;">
          ¿Tienes dudas sobre tu pedido? <br>
          Contáctanos vía WhatsApp al <a href="https://wa.me/573166019030" style="color:${accentColor}; text-decoration: none;">+57 316 601 9030</a>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `factura_winner_${sale.id.slice(-6).toUpperCase()}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Email enviado: ${info.messageId}`);
  } catch (error) {
    console.error("[Mailer] Error enviando email:", error);
  }
}

/**
 * Envía un correo de recuperación de contraseña.
 * @param {Object} user - Objeto del usuario (id, username, email).
 */
async function sendResetEmail(user) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) return;

  // Usar el email del usuario, o el username si es un correo
  const emailTarget =
    user.email || (user.username.includes("@") ? user.username : null);

  if (!emailTarget) {
    console.error(
      `❌ [Mailer] No se pudo determinar el correo para el usuario: ${user.username}`,
    );
    return;
  }

  const mailOptions = {
    from: `"Winner Store Soporte" <${process.env.EMAIL_USER}>`,
    to: emailTarget,
    subject: "🔐 Recuperación de Contraseña - Winner Store",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Hola, ${user.username}</h2>
        <p style="color: #555; line-height: 1.6;">Has solicitado restablecer tu contraseña para acceder al panel de Winner Store.</p>
        <div style="background: #ffffff; padding: 20px; border-left: 4px solid #e8ff47; margin: 20px 0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="margin: 0; font-weight: bold;">Tu solicitud ha sido recibida.</p>
          <p style="margin: 10px 0 0 0;">Por favor, contacta al soporte técnico o utiliza el sistema de gestión para asignar una nueva clave.</p>
        </div>
        <p style="font-size: 11px; color: #999; text-align: center; margin-top: 30px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[Mailer] Email de recuperación enviado a ${emailTarget}: ${info.messageId}`,
    );
  } catch (error) {
    console.error("[Mailer] Error enviando email de recuperación:", error);
  }
}

module.exports = { sendSaleEmail, sendResetEmail };
