/* ═══════════════════════════════════════════════════════
   WINNER — dashboard.js (Gráficas y KPIs)
   ═══════════════════════════════════════════════════════ */
async function renderDashboard() {
  // KPIs para el periodo actual (ej. última semana)
  const today = getTodayStr();
  const sevenDaysAgo = getPastDate(7);
  const thirtyDaysAgo = getPastDate(30);

  try {
    // Fetch summary for last 7 days (for "vs semana" KPIs)
    const weeklySummaryRes = await apiFetch(
      `${API_URL}/analytics/summary?from=${sevenDaysAgo}&to=${today}`,
    );
    const weeklySummaryData = await weeklySummaryRes.json();

    if (weeklySummaryData) {
      if ($("kpiTotalRevenue"))
        $("kpiTotalRevenue").textContent = fmt(
          weeklySummaryData.total_revenue || 0,
        );
      if ($("kpiOrders"))
        $("kpiOrders").textContent = weeklySummaryData.total_sales || 0;
      if ($("kpiAvgTicket"))
        $("kpiAvgTicket").textContent = fmt(
          weeklySummaryData.avg_sale_value || 0,
        );

      // Actualizar Conversión desde el servidor
      if ($("kpiConversion")) {
        $("kpiConversion").textContent = weeklySummaryData.conversion || "0%";
      }
      if ($("kpiConversionTrend")) {
        const trend = weeklySummaryData.conversion_trend || "estable";
        $("kpiConversionTrend").textContent = trend;
        $("kpiConversionTrend").className =
          "dash-sub-impact " + (trend.includes("↑") ? "up" : "down");
      }
    }

    const historicalSummaryRes = await apiFetch(`${API_URL}/analytics/summary`);
    const historicalSummaryData = await historicalSummaryRes.json();

    if (historicalSummaryData) {
      if ($("stVolTotal"))
        $("stVolTotal").textContent = fmt(
          historicalSummaryData.total_revenue || 0,
        );
      if ($("stTransTotal"))
        $("stTransTotal").textContent = historicalSummaryData.total_sales || 0;
    }
  } catch (e) {
    console.error("❌ Error fetching dashboard summary analytics:", e);
  }

  // Poblamos la lista de ventas recientes en el dashboard
  renderRecentSalesList();

  // Renderizar el gráfico de Top Productos
  await apiFetch(`${API_URL}/analytics/top-products`)
    .then((res) => res.json())
    .then((data) => renderProductChart(data))
    .catch(() => renderProductChart([])); // Fallback a vacío
}

let productsChartInstance = null;

function renderRecentSalesList() {
  const container = $("dashRecentSales");
  if (!container) return;

  // Usamos el log de ventas global (window.salesLog) cargado previamente
  const sLog = window.salesLog || [];
  const recent = sLog.slice(0, 5); // Mostramos las últimas 5 ventas

  if (recent.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">No hay ventas registradas</div>';
    return;
  }

  container.innerHTML = recent
    .map((s) => {
      const details =
        typeof s.payment_details === "string"
          ? JSON.parse(s.payment_details || "{}")
          : s.payment_details || {};
      const status = details.shipping_status || "PENDIENTE";

      return `
      <div class="recent-item" style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight:600; font-size: 13px;">${esc(s.client || "Mostrador")}</div>
          <div class="recent-meta" style="font-size: 11px; color: var(--gray-text);">
            ${fmtDate(s.timestamp)} • <span class="status-badge ${status === "CANCELADO" ? "s-out" : "s-ok"}" style="font-size:9px; padding:1px 5px">${status}</span>
          </div>
        </div>
        <div class="recent-amount" style="font-weight:700; color: var(--accent);">${fmt(s.total)}</div>
      </div>
    `;
    })
    .join("");
}

function renderProductChart(realData = []) {
  const el = $("chartTopProducts");
  if (!el) return;
  const ctx = el.getContext("2d");
  if (productsChartInstance) productsChartInstance.destroy();

  const labels = realData.length
    ? realData.slice(0, 5).map((p) => p.name.slice(0, 15))
    : ["Sin datos"];
  const counts = realData.length
    ? realData.slice(0, 5).map((p) => p.qty_sold)
    : [0];

  productsChartInstance = new Chart(ctx, {
    type: "bar",
    indexAxis: "y",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Unidades",
          data: counts,
          backgroundColor: "#e8ff47",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false } },
      },
    },
  });
}
window.renderDashboard = renderDashboard;
