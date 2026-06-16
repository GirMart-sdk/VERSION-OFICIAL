"use strict";

const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

/**
 * Configuración del transportador de correo.
 * Utiliza variables de entorno para máxima seguridad.
 */
const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
const transporter = nodemailer.createTransport({
  host: emailHost,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar la conexión con el servidor de correo al iniciar
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ [Mailer] Error de conexión SMTP (Revisa tu .env y Contraseña de Aplicación):", error.message);
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
    const doc = new PDFDocument({ size: "A4", margin: 0 }); // Usamos 0 margin para el header full-width
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

  // --- CABECERA (Igual a Factura) ---
    doc.fillColor("#000000").rect(0, 0, 612, 130).fill();

    // Logo Winner Estilizado
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(38).text("W", 50, 45);
    doc.fillColor("#f40202").circle(98, 70, 6).fill(); 
    doc.fillColor("#ffffff").text("NNER", 110, 45);
    doc.font("Helvetica").fontSize(9).fillColor("#aaaaaa").text("STREETWEAR COLOMBIA", 53, 92, { characterSpacing: 3 });

    // Información del Reporte (Lado Derecho)
    doc
      .fillColor("#e8ff47")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("REPORTE DIARIO DE CAJA", 350, 48, { align: "right", width: 210 });
    doc
      .fillColor("#ffffff")
      .font("Helvetica")
      .fontSize(10)
      .text(`SESIÓN: #${(data.arqueo?.id || Date.now()).toString().slice(-8).toUpperCase()}`, 350, 70, { align: "right", width: 210 });
    doc.fillColor("#888888").text(`FECHA: ${data.date || new Date().toLocaleDateString()}`, 350, 85, { align: "right", width: 210 });


    // --- DATOS CLIENTE ---
    let curY = 160;
    doc.fillColor("#f9f9f9").rect(50, curY, 512, 70).fill();
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9).text("DESTINATARIO / CLIENTE", 65, curY + 15);
    
    doc.font("Helvetica").fontSize(11).fillColor("#333333");
    doc.text(sale.customerName.toUpperCase(), 65, curY + 30);
    doc.fontSize(9).fillColor("#777777");
    doc.text(`${sale.customerEmail}  |  ${sale.customerPhone || "Sin teléfono"}`, 65, curY + 45);

    doc.fillColor("#000000").font("Helvetica-Bold").text("DIRECCIÓN DE ENVÍO", 320, curY + 15, { align: 'right', width: 220 });
    doc.font("Helvetica").fillColor("#333333").text(sale.shippingAddress || "Recogida en tienda física", 320, curY + 30, { align: 'right', width: 220 });

    // --- TABLA DE PRODUCTOS ---
    curY = 260;
    doc.fillColor("#000000").rect(50, curY, 512, 22).fill();
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("DESCRIPCIÓN DEL ARTÍCULO", 65, curY + 7);
    doc.text("CANT", 350, curY + 7, { width: 40, align: "center" });
    doc.text("P. UNITARIO", 400, curY + 7, { width: 75, align: "right" });
    doc.text("SUBTOTAL", 485, curY + 7, { width: 75, align: "right" });

    curY += 32;
    doc.fillColor("#333333");
    sale.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.fillColor("#fcfcfc").rect(50, curY - 5, 512, 25).fill();
      }

      const prodName = `${item.product?.name || item.name} - Talla ${item.size}`;
      const textHeight = doc.heightOfString(prodName, { width: 280 });

      doc.fillColor("#000000").font("Helvetica").fontSize(10).text(prodName, 65, curY, { width: 280 });
      doc.fillColor("#666666");
      doc.text(item.quantity.toString(), 350, curY, {
        width: 40,
        align: "center",
      });
      doc.text(fmt(item.unitPrice || item.price), 400, curY, {
        width: 75,
        align: "right",
      });
      doc.fillColor("#000000").font("Helvetica-Bold").text(
        fmt((item.unitPrice || item.price) * item.quantity),
        485,
        curY,
        { width: 75, align: "right" },
      );

      curY += 25;
    });

    // --- TOTAL ---
    curY += 20;
    doc
      .moveTo(350, curY)
      .lineTo(562, curY)
      .lineWidth(0.5)
      .strokeColor("#eeeeee")
      .stroke();
    
    curY += 15;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#777777").text("TOTAL NETO PAGADO", 300, curY, { width: 150, align: 'right' });
    doc
      .fontSize(22)
      .fillColor("#000000")
      .text(fmt(sale.totalAmount || sale.total), 440, curY - 8, {
        align: "right",
        width: 120,
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
  // Validación flexible: necesitamos al menos la contraseña
  if (!process.env.EMAIL_PASS) {
    console.warn("⚠️ [Mailer] No se puede enviar factura: EMAIL_PASS no configurado");
    return;
  }
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

  // En Gmail, el 'from' debe ser el mismo correo autenticado
  const sender = process.env.EMAIL_USER;

  const mailOptions = {
    from: `"Winner Store" <${sender}>`,
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
 * @param {String} token - Token único de recuperación.
 */
async function sendResetEmail(user, token) {
  // Validamos solo lo estrictamente necesario (la contraseña del SMTP)
  if (!process.env.EMAIL_PASS) {
    console.warn("⚠️ [Mailer] No se puede enviar correo: EMAIL_PASS no configurado en .env");
    return;
  }

  // Usar el email del usuario, o el username si es un correo
  const emailTarget =
    user.email || (user.username.includes("@") ? user.username : null);

  if (!emailTarget) {
    console.error(
      `❌ [Mailer] No se pudo determinar el correo para el usuario: ${user.username}`,
    );
    return;
  }

  const sender = process.env.EMAIL_USER || "no-reply@winnerstore.com";
  // Construir la URL del frontend (ajusta según tu dominio)
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password.html?token=${token}`;

  const mailOptions = {
    from: `"Winner Store Soporte" <${sender}>`,
    to: emailTarget,
    subject: "🔐 Recuperación de Contraseña - Winner Store",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="letter-spacing: 5px; color: #000; margin: 0;">WINNER</h1>
        </div>
        <h2 style="color: #333; text-align: center;">Hola, ${user.username}</h2>
        <p style="color: #555; line-height: 1.6; text-align: center;">Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para asignar una nueva clave. Este enlace expira en 60 minutos.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #e8ff47; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; border: 1px solid #000;">RESTABLECER CONTRASEÑA</a>
        </div>
        <div style="background: #ffffff; padding: 20px; border-left: 4px solid #e8ff47; margin: 20px 0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="margin: 0; font-size: 13px; color: #666;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
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

/**
 * Envía una alerta de seguridad al administrador cuando se detecta un posible ataque.
 * @param {String} ip - Dirección IP del atacante.
 * @param {String} user - Usuario que intentaron vulnerar.
 * @param {String} userAgent - Navegador/Dispositivo utilizado.
 */
async function sendSecurityAlert(ip, user, userAgent) {
  const mailOptions = {
    from: `"WINNER Security" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Te avisa a ti (el admin)
    subject: "⚠️ ALERTA DE SEGURIDAD - Intento de Intrusión",
    html: `
      <div style="background:#111; color:white; padding:20px; font-family:sans-serif; border-radius: 8px;">
        <h2 style="color:#ff3c3c; border-bottom: 1px solid #333; padding-bottom: 10px;">ALERTA DE SEGURIDAD</h2>
        <p>Se han detectado múltiples intentos fallidos de login en un corto periodo de tiempo.</p>
        <div style="background:#000; padding:15px; border-left: 4px solid #ff3c3c; margin: 20px 0;">
          <p style="margin:5px 0;"><strong>IP de origen:</strong> <span style="color:#ff3c3c;">${ip}</span></p>
          <p style="margin:5px 0;"><strong>Usuario intentado:</strong> ${user}</p>
          <p style="margin:5px 0;"><strong>Dispositivo:</strong> <span style="font-size:11px; color:#888;">${userAgent}</span></p>
        </div>
        <p style="color:#999; font-size:12px;">El sistema ha bloqueado automáticamente esta IP por 15 minutos para proteger la integridad de la base de datos.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Envía una alerta genérica al administrador (Sustituye logs manuales por avisos proactivos).
 * @param {String} subject - Asunto de la alerta.
 * @param {String} message - Contenido detallado.
 * @param {String} type - 'error', 'warning' o 'info'.
 */
async function sendAdminAlert(subject, message, type = "info") {
  const colors = { error: "#ff3c3c", warning: "#ffcc00", info: "#00ccff" };
  const icon = { error: "❌", warning: "⚠️", info: "ℹ️" };

  const mailOptions = {
    from: `"WINNER System" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `${icon[type]} WINNER ALERT: ${subject}`,
    html: `
      <div style="background:#1a1a1a; color:#eee; padding:25px; font-family:sans-serif; border-top: 5px solid ${colors[type]};">
        <h2 style="color:${colors[type]}; margin-top:0;">Notificación del Sistema</h2>
        <p style="font-size:16px;">${message}</p>
        <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
        <p style="font-size:12px; color:#888;">
          Generado automáticamente por WINNER v3.5 el ${new Date().toLocaleString("es-CO")}
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Genera un PDF con el resumen de caja y ventas del día.
 */
async function generateDailyReportPDF(data) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

    // Cabecera
    doc.fillColor("#000000").rect(0, 0, 600, 100).fill();
    doc.fillColor("#ffffff").fontSize(26).text("WINNER STORE", 50, 35);
    doc.fontSize(9).text("REPORTE OPERATIVO DIARIO", 50, 68);
    doc.fillColor("#e8ff47").fontSize(12).text(`FECHA: ${data.date || new Date().toLocaleDateString()}`, 350, 45, { align: "right", width: 200 });

    // --- GRID HORIZONTAL DE METRICAS ---
    let curY = 160;
    
    // Caja 1: Ventas (Negro/Neón)
    doc.fillColor("#000000").rect(50, curY, 165, 65).fill();
    doc.fillColor("#aaaaaa").font("Helvetica").fontSize(7).text("VENTAS TOTALES (BRUTO)", 60, curY + 15);
    doc.fillColor("#e8ff47").font("Helvetica-Bold").fontSize(16).text(fmt(data.totalSales || 0), 60, curY + 28);

    // Caja 2: Gastos
     doc.fillColor("#f9f9f9").rect(220, curY, 160, 65).fill();
    doc.fillColor("#777777").font("Helvetica").fontSize(7).text("TOTAL GASTOS OPERATIVOS", 230, curY + 15);
    doc.fillColor("#ff3c3c").font("Helvetica-Bold").fontSize(16).text(fmt(data.totalExpenses || 0), 230, curY + 28);
   
    // Caja 3: Neto
   doc.fillColor("#e8ff47").rect(400, curY, 162, 65).fill();
    doc.fillColor("#000000").font("Helvetica").fontSize(7).text("EFECTIVO NETO EN CAJA", 410, curY + 15);
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(16).text(fmt(data.netCash || 0), 410, curY + 28);

    curY += 85;

    // --- DETALLE DE ARQUEO ---
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10).text("ESTADO DEL ARQUEO DE CAJA", 50, curY);
    doc.moveTo(50, curY + 15).lineTo(562, curY + 15).lineWidth(0.5).strokeColor("#eeeeee").stroke();
     curY += 25;
    
    if (data.arqueo) {
      doc.fillColor("#777777").font("Helvetica").fontSize(9).text("Saldo Real Físico Reportado:", 50, curY);
      doc.fillColor("#000000").font("Helvetica-Bold").text(fmt(data.arqueo.realBalance), 200, curY);
      
      const diffColor = data.arqueo.difference < 0 ? "#ff3c3c" : "#2ecc71";
      doc.fillColor("#777777").font("Helvetica").fontSize(9).text("Diferencia (Sobrante/Faltante):", 300, curY);
      doc.fillColor(diffColor).font("Helvetica-Bold").text(fmt(data.arqueo.difference), 450, curY, { align: 'right', width: 100 });
      curY += 15;
    }

    // --- DESGLOSE POR METODO (TABLA PEQUEÑA) ---
    curY += 25;
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10).text("RESUMEN POR MÉTODO DE PAGO", 50, curY);
    doc.moveTo(50, curY + 15).lineTo(562, curY + 15).stroke();
    curY += 28;

    if (data.methodBreakdown) {
        Object.entries(data.methodBreakdown).forEach(([method, amount]) => {
           doc.fillColor("#555555").font("Helvetica").fontSize(9).text(method.toUpperCase(), 65, curY);
            doc.fillColor("#000000").text(fmt(amount), 450, curY, { align: 'right', width: 100 });
            curY += 18;
        });
    }

     // --- TABLA DE TRANSACCIONES (Estilo Factura) ---
  curY += 30;
    if (curY > 500) { doc.addPage(); curY = 50; } // Salto de página si no hay espacio

    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10).text("LISTADO DE TRANSACCIONES DEL TURNO", 50, curY);
    curY += 20;

    // Encabezado Tabla
    // Encabezado Tabla (Igual a Factura)
    doc.fillColor("#000000").rect(50, curY, 512, 22).fill();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
    doc.text("HORA", 65, curY + 7);
    doc.text("CLIENTE", 115, curY + 7);
    doc.text("MÉTODO DE PAGO", 285, curY + 7);
    doc.text("TOTAL NETO", 485, curY + 7, { width: 75, align: 'right' });
    curY += 32;

    // Filas de Ventas
    if (data.sales && data.sales.length > 0) {
        data.sales.forEach((sale, index) => {
            if (curY > 750) { doc.addPage(); curY = 50; }

             const isEven = index % 2 === 0;
            if (isEven) {
              doc.fillColor("#fcfcfc").rect(50, curY - 5, 512, 22).fill();
            }
            
            const time = sale.timestamp ? new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            doc.fillColor("#666666").font("Helvetica").fontSize(8.5);
            doc.text(time, 65, curY);
            doc.fillColor("#000000").text(sale.client.toUpperCase().substring(0, 30), 115, curY);
            doc.fillColor("#666666").text(sale.method.toUpperCase(), 285, curY);
            doc.fillColor("#000000").font("Helvetica-Bold").text(fmt(sale.total), 485, curY, { width: 75, align: 'right' });
            
            curY += 22;
        });

        // Fila final de sumatoria de transacciones
        curY += 10;
        doc.fillColor("#777777").font('Helvetica-Bold').fontSize(10).text("SUMATORIA VENTAS DEL TURNO", 300, curY, { width: 180, align: 'right' });
        doc.fillColor("#000000").fontSize(14).text(fmt(data.totalSales), 485, curY - 3, { width: 75, align: 'right' });
    } else {
        doc.fillColor("#999999").fontSize(9).text("No se registraron transacciones individuales en este turno.", 50, curY, { align: 'center', width: 500 });
    }

    // Footer
    doc.font('Helvetica').fontSize(8).fillColor("#aaaaaa").text("Winner Store Management System v3.5 - Este es un documento informativo de control interno.", 50, 785, { align: "center" });

    doc.end();
  });
}

/**
 * Envía el informe de cierre al administrador.
 */
async function sendDailyReportEmail(reportData) {
  if (!process.env.EMAIL_PASS) return;

  const pdfBuffer = await generateDailyReportPDF(reportData);
  const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

  const mailOptions = {
    from: `"Winner Store Reports" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `📊 Cierre de Caja - ${reportData.date} - Winner Store`,
    html: `
      <div style="font-family:sans-serif; max-width:600px; color:#333;">
        <h2 style="color:#000;">Informe de Cierre Diario</h2>
        <p>Se ha generado el resumen de operaciones para el día <strong>${reportData.date}</strong>.</p>
        <div style="background:#f9f9f9; padding:20px; border-radius:10px; border:1px solid #eee;">
          <p><strong>Ventas Totales:</strong> ${fmt(reportData.totalSales)}</p>
          <p><strong>Gastos:</strong> ${fmt(reportData.totalExpenses)}</p>
          <hr>
          <p style="font-size:18px;"><strong>Efectivo Neto: ${fmt(reportData.netCash)}</strong></p>
        </div>
        <p>Adjunto encontrarás el informe detallado en formato PDF.</p>
      </div>
    `,
    attachments: [
      {
        filename: `cierre_winner_${reportData.date.replace(/\//g, "-")}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { 
  sendSaleEmail, 
  sendResetEmail, 
  sendSecurityAlert, 
  sendAdminAlert,
  sendDailyReportEmail 
};
