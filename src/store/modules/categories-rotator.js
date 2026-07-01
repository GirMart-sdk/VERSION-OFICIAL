/* ═══════════════════════════════════════════════════════
   WINNER STORE — categories-rotator.js (Dinamismo de Categorías)
   ═══════════════════════════════════════════════════════ */
"use strict";

const CategoryRotator = {
  // Configuración de las categorías: Array de objetos que define el orden y contenido.
  // El primer elemento (índice 0) siempre se renderizará como el "Destacado" (grande) en el grid.
  items: [
    {
      name: "MUJER",
      count: "48 productos",
      img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=80",
      filter: "mujer",
    },
    {
      name: "HOMBRE",
      count: "36 productos",
      img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500&q=80",
      filter: "hombre",
    },
    {
      name: "OUTERWEAR",
      count: "22 productos",
      img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80",
      filter: "hombre",
    },
    {
      name: "ACCESORIOS",
      count: "31 productos",
      img: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=500&q=80",
      filter: "accesorios",
    },
    {
      name: "CALZADO",
      count: "18 productos",
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
      filter: "all",
    },
  ],

  /**
   * Renderiza el grid de categorías basado en la configuración actual del array
   */
  render() {
    const grid = document.querySelector(".cat-grid");
    if (!grid) return;

    // Generamos el contenido HTML dinámicamente basado en la configuración
    grid.innerHTML = this.items
      .map(
        (cat) => `
      <div class="cat-card reveal visible" onclick="filterByCategory('${cat.filter}')">
        <img src="${cat.img}" alt="${cat.name}" class="cat-img">
        <div class="cat-overlay"></div>
        <div class="cat-info">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-count">${cat.count}</div>
        </div>
        <div class="cat-arrow">→</div>
      </div>
    `,
      )
      .join("");
  },

  /**
   * Ejecuta la rotación desplazando el primer elemento al final
   */
  rotate() {
    const first = this.items.shift();
    this.items.push(first);
    this.render();
  },

  init() {
    // Renderizado inicial basado en el orden inicial
    this.render();

    // Configuramos un intervalo de rotación automática para añadir dinamismo visual
    setInterval(() => {
      this.rotate();
    }, 20000); // 20 segundos
  },
};

// Inicialización automática al cargar el documento
document.addEventListener("DOMContentLoaded", () => CategoryRotator.init());
