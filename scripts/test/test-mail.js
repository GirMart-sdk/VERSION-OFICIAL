"use strict";

const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

console.log("🧪 Iniciando prueba de envío de correo...");
console.log(`   Host: ${process.env.SMTP_HOST}`);
console.log(`   Port: ${process.env.SMTP_PORT}`);
console.log(`   User: ${process.env.SMTP_USER}`);
console.log(`   Pass Length: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.length : '0'}`);
console.log(`   Tiene espacios: ${/\s/.test(process.env.SMTP_PASS)}`);

const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST,
 port: parseInt(process.env.SMTP_PORT || "587"),
 secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for 587
 auth: {
   user: process.env.SMTP_USER?.trim(),
   pass: process.env.SMTP_PASS?.replace(/\s/g, ""), // Elimina espacios accidentales
 },
 pool: true,
 maxConnections: 5,
 maxMessages: 100,
 tls: {
 },
});

async function sendTestEmail() { try {
   await transporter.verify();
   console.log("✅ Conexión SMTP verificada con éxito.");
   const info = await transporter.sendMail({
     from: `"Winner Store Test" <${process.env.SMTP_USER}>`,
     to: process.env.SMTP_USER, // Envía a ti mismo para probar
     subject: "🚀 Prueba de Correo Winner Store",
     html: `
       <div style="font-family: sans-serif; padding: 20px;">
         <h2>¡Hola desde Winner Store!</h2>
         <p>Este es un correo de prueba para verificar la configuración SMTP.</p>
         <p>Si lo recibes, ¡todo está funcionando correctamente!</p>
       </div>
     `,
   });
   console.log("📧 Correo de prueba enviado: %s", info.messageId);
 } catch (error) {
   console.error("❌ Error al enviar correo de prueba:", error.message);
   console.error("   Detalle del error:", error);
 }
}

sendTestEmail(); 