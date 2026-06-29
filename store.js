/* ═══════════════════════════════════════════════════════
   WINNER — store.js (Gestor de Estado Central)
   ═══════════════════════════════════════════════════════ */
"use strict";

/**
 * AppStore: Un gestor de estado simple inspirado en Pub/Sub.
 * - state: Contiene todos los datos de la aplicación.
 * - commit: La única forma de modificar el estado, a través de mutaciones.
 * - subscribe: Permite que cualquier parte de la UI "escuche" los cambios.
 */
const AppStore = {
  state: {
    inventory: [],
    salesLog: [],
    allSalesData: [],
    pos: {
      cart: [],
      activeCategory: "all",
    },
    // ... aquí irían otros estados globales
  },

  // Un array de funciones (callbacks) que se ejecutarán cuando el estado cambie.
  listeners: [],

  /**
   * Permite que una función se suscriba a los cambios del estado.
   * @param {Function} callback La función que se ejecutará al cambiar el estado.
   */
  subscribe(callback) {
    this.listeners.push(callback);
  },

  /**
   * Notifica a todos los suscriptores que el estado ha cambiado.
   */
  notify() {
    // Pasamos una copia del estado para evitar mutaciones accidentales.
    this.listeners.forEach((callback) => callback(JSON.parse(JSON.stringify(this.state))));
  },

  /**
   * Ejecuta una mutación para cambiar el estado de forma controlada.
   * @param {string} mutationName El nombre de la mutación a ejecutar.
   * @param {*} payload Los datos necesarios para realizar el cambio.
   */
  commit(mutationName, payload) {
    const mutation = this.mutations[mutationName];
    if (mutation) {
      mutation(this.state, payload);
      this.notify(); // Notificar a todos los suscriptores después del cambio.
    } else {
      console.error(`Error: Mutación "${mutationName}" no encontrada.`);
    }
  },

  // ═══════════════════════════════════════════════════════
  //  MUTACIONES: Las únicas funciones que pueden alterar el estado.
  // ═══════════════════════════════════════════════════════
  mutations: {
    SET_INVENTORY(state, inventory) {
      state.inventory = inventory;
    },

    SET_SALES_LOG(state, sales) {
      state.salesLog = sales;
      state.allSalesData = sales;
    },

    ADD_TO_POS_CART(state, { product, size }) {
      const availableStock = product.stock[size] || product.stock.qty || 0;
      const currentInCart = state.pos.cart
        .filter((i) => String(i.id) === String(product.id) && i.size === size)
        .reduce((a, b) => a + b.qty, 0);

      if (currentInCart + 1 > availableStock) {
        toast(`❌ Stock insuficiente para ${product.name} (${size})`);
        return; // Detenemos la mutación
      }

      const existing = state.pos.cart.find(
        (i) => String(i.id) === String(product.id) && i.size === size
      );

      if (existing) {
        existing.qty++;
      } else {
        state.pos.cart.push({
          id: product.id,
          sku: product.sku || "",
          name: product.name,
          price: product.price,
          size,
          qty: 1,
        });
      }
      toast(`✓ ${product.name} (${size}) agregado`);
    },

    UPDATE_POS_CART_QTY(state, { index, delta }) {
      if (state.pos.cart[index]) {
        state.pos.cart[index].qty += delta;
        if (state.pos.cart[index].qty <= 0) {
          state.pos.cart.splice(index, 1);
        }
      }
    },

    REMOVE_FROM_POS_CART(state, index) {
      state.pos.cart.splice(index, 1);
    },

    CLEAR_POS_CART(state) {
      state.pos.cart = [];
    },
  },
};

window.AppStore = AppStore;