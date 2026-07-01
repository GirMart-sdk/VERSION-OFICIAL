/* ═══════════════════════════════════════════════════════
   WINNER STORE — storage-core.js (Gestión de Archivos Local)
   ═══════════════════════════════════════════════════════ */
"use strict";

const LocalUploader = {
  /**
   * Sube un archivo directamente al servidor local mediante el API del backend.
   * @param {File} file - El objeto File capturado del input.
   * @returns {Promise<string|null>} - La URL pública del archivo subido.
   */
  async upload(file) {
    if (!file) return null;

    try {
      // Convertir archivo a Base64 para envío seguro vía JSON
      const base64 = await this.toBase64(file);

      const res = await apiFetch(`${API_URL}/storage/upload`, {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          base64Data: base64,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error en el servidor de archivos");
      }

      const { publicUrl } = await res.json();

      console.log("✅ Imagen guardada en servidor local:", publicUrl);
      return publicUrl;
    } catch (err) {
      console.error("❌ Error en LocalUploader:", err.message);
      if (window.toast) {
        window.toast(`❌ Error de subida: ${err.message}`);
      }
      return null;
    }
  },

  toBase64: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    }),
};

window.LocalUploader = LocalUploader;
