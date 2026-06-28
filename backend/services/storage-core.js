/* ═══════════════════════════════════════════════════════
   WINNER STORE — storage-core.js (Servicio de Almacenamiento)
   Maneja la subida y procesamiento de imágenes con Multer y Sharp.
   ═══════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");

// Directorio donde se guardarán las imágenes procesadas.
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// Asegurarse de que el directorio de subidas exista.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Configuración de Multer para manejar la subida de archivos en memoria.
 * Esto nos permite procesar la imagen con Sharp antes de guardarla en el disco.
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("El archivo no es una imagen."), false);
    }
  },
});

/**
 * Procesa y guarda una imagen usando Sharp.
 * @param {Buffer} buffer - El buffer de la imagen desde Multer.
 * @returns {Promise<string>} - La URL pública de la imagen guardada.
 */
async function processAndSaveImage(buffer) {
  const fileName = `winner-product-${Date.now()}.webp`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  await sharp(buffer)
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(filePath);

  // Retorna la URL pública para ser usada en el frontend.
  return `/uploads/${fileName}`;
}

module.exports = {
  uploadMiddleware: upload.single("image"), // Middleware para una sola imagen con el campo 'image'
  processAndSaveImage,
};