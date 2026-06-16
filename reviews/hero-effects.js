/* ═══════════════════════════════════════════════════════
   WINNER STORE — hero-effects.js (Efectos Visuales Hero)
   ═══════════════════════════════════════════════════════ */
"use strict";

const HeroEffects = {
  /**
   * Inyecta los estilos CSS necesarios para los efectos dinámicos
   */
  injectStyles() {
    const styleId = "hero-dynamic-css";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .line-accent {
        animation: heroPulse 3s infinite ease-in-out;
        display: inline-block;
      }
      .neon-winner {
        animation: heroColorCycle 10s infinite linear;
        display: inline-block;
        font-weight: 900;
        letter-spacing: 4px;
      }
      @keyframes heroPulse {
        0%, 100% { filter: drop-shadow(0 0 2px var(--accent)); opacity: 1; }
        50% { filter: drop-shadow(0 0 15px var(--accent)); opacity: 0.9; }
      }
      @keyframes heroColorCycle {
        0%, 100% { color: var(--accent); text-shadow: 0 0 10px var(--accent); }
        33% { color: #00d4ff; text-shadow: 0 0 15px #00d4ff; }
        66% { color: #ff00e6; text-shadow: 0 0 15px #ff00e6; }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Agrega dinamismo extra al título, como un efecto de micro-glitch aleatorio
   */
  init() {
    this.injectStyles();

    const winnerText = document.querySelector(".neon-winner");
    if (!winnerText) return;

    // Efecto de vibración sutil ocasional (Glitch) para mayor realismo neón
    setInterval(() => {
      winnerText.style.transform = `translate(${Math.random() * 2 - 1}px, ${Math.random() * 2 - 1}px)`;
      setTimeout(() => {
        winnerText.style.transform = "translate(0, 0)";
      }, 50);
    }, 5000);
  },
};

document.addEventListener("DOMContentLoaded", () => HeroEffects.init());
