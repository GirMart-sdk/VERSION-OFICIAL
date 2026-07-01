/* ═══════════════════════════════════════════════════════
   WINNER — featured.js (Lógica de Productos Destacados)
   ═══════════════════════════════════════════════════════ */
"use strict";

const FeaturedModule = {
  /**
   * Analiza el catálogo global y selecciona los mejores productos
   * Basado en: Mayor Margen, Ofertas y Estatus Premium/Limitado
   */
  getFeaturedItems(allProducts, limit = 2) {
    return [...allProducts]
      .map((p) => {
        let score = 0;

        // 0. Validación de Stock: Si no hay unidades, no puede ser destacado (puntuación mínima)
        const ts =
          typeof window.totalStock === "function" ? window.totalStock(p) : 0;
        if (ts <= 0) return { ...p, score: -100 };

        // 1. Margen de Venta (Rentabilidad Real)
        const margin = (p.price || 0) - (p.cost || 0);
        const marginPercent = p.price > 0 ? margin / p.price : 0;

        if (margin > 50000)
          score += 15; // Margen alto absoluto
        else if (margin > 30000) score += 5;

        if (marginPercent > 0.5) score += 10; // Bonus si la rentabilidad supera el 50%

        // 2. Atractivo Visual (Ofertas Reales)
        if (p.oldPrice && p.oldPrice > p.price) {
          score += 12;
          const discount = (p.oldPrice - p.price) / p.oldPrice;
          if (discount >= 0.25) score += 8; // Bonus por descuentos agresivos (>25%)
        }

        // 3. Estatus de Marca (Premium y Ediciones Limitadas)
        const badge = (p.badge || "").toLowerCase();
        if (
          badge.includes("premium") ||
          badge.includes("limitada") ||
          badge.includes("exclusivo")
        ) {
          score += 25; // Prioridad máxima por ser la imagen de la tienda
        } else if (badge.includes("nuevo")) {
          score += 5;
        }

        return { ...p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  render() {
    const container = document.getElementById("featuredGrid");
    if (!container || !window.PRODUCTS || window.PRODUCTS.length === 0) return;

    const featured = this.getFeaturedItems(window.PRODUCTS);

    container.innerHTML = featured
      .map((p) => {
        const sizes = window.getSizesForCategory
          ? window.getSizesForCategory(p.cat || p.category)
          : ["S", "M", "L"];

        return `
        <div class="featured-item reveal visible">
          <img src="${window.esc(p.image || p.img)}" alt="${window.esc(p.name)}" class="featured-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'">
          <div class="featured-overlay"></div>
          <div class="featured-content">
            <div class="featured-tag">✦ ${window.esc(p.badge || "Destacado")}</div>
            <div class="featured-name">${window.esc(p.name).toUpperCase()}</div>
            <div class="featured-desc">${window.esc(p.description || "Diseño exclusivo Winner Streetwear.")}</div>
            
            <div class="size-selector" data-product="${p.id}" style="display: flex; gap: 5px; margin-bottom: 15px">
              ${sizes
                .slice(0, 3)
                .map(
                  (sz, idx) => `
                <button class="size-btn ${idx === 1 ? "active" : ""}" data-size="${sz}" 
                  style="width: 35px; height: 35px; border-radius: 4px; font-weight: bold; font-size: 12px; 
                  background: ${idx === 1 ? "var(--accent)" : "var(--dark)"}; 
                  color: ${idx === 1 ? "#000" : "var(--text)"}; 
                  border: 1px solid var(--border); cursor: pointer;"
                  onclick="this.parentElement.querySelectorAll('.size-btn').forEach(b=>{b.classList.remove('active'); b.style.background='var(--dark)'; b.style.color='var(--text)'}); this.classList.add('active'); this.style.background='var(--accent)'; this.style.color='#000';">
                  ${sz}
                </button>
              `,
                )
                .join("")}
            </div>

            <div style="margin-bottom: 15px;">
               <span style="font-family: 'Bebas Neue'; font-size: 24px; color: var(--accent);">${window.fmt ? window.fmt(p.price) : p.price}</span>
               ${p.oldPrice ? `<span style="text-decoration: line-through; color: var(--gray-text); font-size: 14px; margin-left: 10px;">${window.fmt(p.oldPrice)}</span>` : ""}
            </div>

            <button class="featured-cta" onclick="window.addToCart('${p.id}')">
              Agregar al carrito →
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  },
};

window.FeaturedModule = FeaturedModule;
