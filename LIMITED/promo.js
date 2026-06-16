/* ═══════════════════════════════════════════════════════
   WINNER — promo.js (Lógica de Liquidación Inteligente)
   ═══════════════════════════════════════════════════════ */
"use strict";

const PromoModule = {
  themes: [
    {
      bg: "#0a0a0a",
      text: "#ffffff",
      accent: "#e8ff47",
      label: "OFERTA ESPECIAL",
    },
    {
      bg: "#cbb212",
      text: "#000000",
      accent: "#000000",
      label: "DROP RELÁMPAGO",
    },
    {
      bg: "#ffffff",
      text: "#000000",
      accent: "#bc0000",
      label: "ÚLTIMAS UNIDADES",
    },
    { bg: "#1b596d", text: "#ffffff", accent: "#ffffff", label: "LIQUIDACIÓN" },
  ],
  currentThemeIdx: 0,
  rotationInterval: null,

  /**
   * Selecciona el producto "Quiet" (Baja rotación) con mejor margen.
   */
  selectPromoProduct(products) {
    if (!products || products.length === 0) return null;

    return [...products]
      .filter((p) => (window.totalStock ? window.totalStock(p) : 0) > 0) // Que tenga al menos una unidad disponible
      .map((p) => {
        const margin = (p.price || 0) - (p.cost || 0);
        const marginPercent = p.price > 0 ? margin / p.price : 0;
        const stock = window.totalStock ? window.totalStock(p) : 0;

        // Puntuación: Mucho stock + Buen margen - Si ya es oferta
        let score = stock * 1.5 + marginPercent * 100;
        if (p.oldPrice) score -= 50; // Priorizar productos que NO están en oferta aún

        return { ...p, score, marginPercent };
      })
      .sort((a, b) => b.score - a.score)[0];
  },

  render() {
    const banner = document.getElementById("promoBannerContainer");
    if (!banner || !window.PRODUCTS) return;

    const product = this.selectPromoProduct(window.PRODUCTS);
    if (!product) return;

    // Decidir descuento basado en margen (15% si el margen es bajo, 20% si es alto)
    const discountPercent = product.marginPercent > 0.4 ? 20 : 15;
    const promoCode = `WINNER${discountPercent}`;

    const theme = this.themes[this.currentThemeIdx];

    banner.innerHTML = `
      <div class="promo-banner" style="background: ${theme.bg}; color: ${theme.text}; border-top: 1px solid ${theme.accent}33;">
        <div class="promo-bg-text" style="color: ${theme.text}08;">WINNER</div>
        <div class="promo-left">
          <div class="promo-label" style="background: ${theme.accent}; color: ${theme.bg}">${theme.label}</div>
          <div class="promo-title" style="color: ${theme.text}">${discountPercent}% OFF EN<br><em>${window.esc(product.name).toUpperCase()}</em></div>
          <div class="promo-desc promo-desc-left" style="color: ${theme.text}aa;">
            ${window.esc(product.description || "Streetwear exclusivo con estilo urbano premium.")}
          </div>
        </div>
        <div class="promo-center">
          <img src="${window.esc(product.image || product.img)}" alt="Promo" class="promo-image" onerror="this.src='https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900'">
        </div>
        <div class="promo-right">
          <div class="promo-code" id="promoCode" onclick="copyCode()" style="border-color: ${theme.accent}; color: ${theme.accent};">
            ${promoCode}
          </div>
          <div class="promo-desc" style="color: ${theme.text}aa;">
            Clic para copiar. Aprovecha el stock limitado.
          </div>
        </div>
      </div>
    `;
  },

  rotateColors() {
    this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
    this.render();
  },

  init() {
    this.render();
    // Cambiar colores cada 10 segundos para mantener el impacto visual
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    this.rotationInterval = setInterval(() => this.rotateColors(), 10000);
  },
};

window.PromoModule = PromoModule;
