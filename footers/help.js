/* ── HELP MODULE ── */
const HelpModule = {
  async checkOrderStatus(orderId) {
    if (!orderId) return;
    try {
      const res = await apiFetch(`${API_URL}/orders/${orderId}`);
      if (!res.ok) throw new Error("Pedido no encontrado");
      const order = await res.json();
      localStorage.setItem("last_tracked_order", JSON.stringify(order));
      return order;
    } catch (err) {
      showToast("❌ No pudimos encontrar ese número de guía");
    }
  },

  async handleTrackOrderUI() {
    const input = document.getElementById("trackOrderId");
    const orderId = input.value.trim();
    if (!orderId) return showToast("⚠️ Ingresa un ID de pedido");

    showToast("🔍 Buscando pedido...");
    const order = await this.checkOrderStatus(orderId);
    if (order) {
      showToast(`📦 Pedido ${orderId}: ${order.status.toUpperCase()}`);
      if (order.trackingNumber) {
        alert(
          `Tu número de guía es: ${order.trackingNumber}\nTransportadora: ${order.shippingMethod}`,
        );
      }
    }
  },
};
window.handleTrackOrderUI = HelpModule.handleTrackOrderUI.bind(HelpModule);
