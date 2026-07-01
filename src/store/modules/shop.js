/* ── SHOP MODULE ── */
const ShopModule = {
  // Filtra y desplaza la vista hacia los productos
  filterByCategory(cat) {
    // Validamos que app.js ya esté cargado y las variables globales disponibles
    const isReady = typeof window.renderProducts === "function" && window.DOM;

    if (isReady) {
      // Actualizamos el filtro global
      window.activeFilter = cat;

      // Sincronizamos visualmente los botones de filtro en la barra de navegación de productos
      if (window.DOM.filterBar) {
        window.DOM.filterBar.querySelectorAll(".filter-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.filter === cat);
        });
      }

      // Ejecutamos el renderizado de productos con el nuevo filtro aplicado
      window.renderProducts(cat);

      // UX: Cerramos el menú móvil automáticamente si se navega desde él (opcional pero recomendado)
      if (
        typeof toggleMobileMenu === "function" &&
        window.DOM.navLinks &&
        window.DOM.navLinks.classList.contains("mobile-open")
      ) {
        toggleMobileMenu();
      }

      // Scroll suave hasta la sección de productos para que el usuario vea los resultados inmediatamente
      const section = document.getElementById("productos");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    } else {
      console.error(
        "Winner Store: app.js no se ha inicializado completamente.",
      );
    }
  },
};
window.filterByCategory = ShopModule.filterByCategory;