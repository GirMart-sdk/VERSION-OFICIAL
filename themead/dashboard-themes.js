/* ═══════════════════════════════════════════════════════
   WINNER — dashboard-themes.js (Ritmo Neón Administrativo)
   ═══════════════════════════════════════════════════════ */
"use strict";

const DashboardThemes = {
  // Paleta Neón Winner: Verde, Azul, Rosa, Amarillo
  colors: ["#0ee80b", "#00d4ff", "#ff00e6", "#e8ff47"],
  currentIndex: 0,
  interval: null,

  /**
   * Actualiza la variable CSS global para que todos los boxes
   * cambien de color simultáneamente.
   */
  applyTheme() {
    const color = this.colors[this.currentIndex];
    document.documentElement.style.setProperty("--dash-neon", color);

    // Opcional: Actualizar el resplandor de las gráficas de Apex si existen
    if (window.charts && window.charts.main) {
      // Lógica para actualizar colores de gráficas en tiempo real si se desea
    }
  },

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.colors.length;
    this.applyTheme();
  },

  init() {
    // Aplicar primer color
    this.applyTheme();

    // Rotar cada 15 segundos para no cansar la vista pero mantener el dinamismo
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.next(), 15000);
  },
};

window.DashboardThemes = DashboardThemes;
