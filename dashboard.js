/* ═══════════════════════════════════════════════════════
   WINNER — dashboard.js (Gráficas y KPIs)
   ═══════════════════════════════════════════════════════ */

let charts = {}; // Para guardar instancias de ApexCharts

async function renderDashboard() {
  // KPIs para el periodo actual (ej. última semana)
  const today = getTodayStr();

  try {
    // 1. Obtener estadísticas principales (Hoy y Totales)
    const statsRes = await apiFetch(`${API_URL}/stats`);
    const stats = await statsRes.json();

    if (stats) {
      // Sincronización con IDs reales de index.html y admin-panel.html
      const revEl = $("kpiTotalRevenue") || $("kpiRevenueToday");
      if (revEl)
        revEl.textContent = fmt(stats.totalRevenue || stats.revenueToday || 0);

      const ordEl = $("kpiOrders") || $("kpiOrdersToday");
      if (ordEl) ordEl.textContent = stats.totalSales || stats.salesToday || 0;

      if ($("kpiAvgTicket"))
        $("kpiAvgTicket").textContent = fmt(stats.avgTicket || 0);

      if ($("kpiTotalDebt"))
        $("kpiTotalDebt").textContent = fmt(stats.totalDebt || 0);

      if ($("kpiConversion")) {
        const convVal = Number(stats.conversion) || 0;
        $("kpiConversion").textContent = convVal.toFixed(1) + "%";
      }

      if ($("kpiConversionTrend")) {
        const trend = stats.conversion_trend || "estable";
        $("kpiConversionTrend").textContent = trend;
        // Sincronización con clases dk-trend para Glassmorphism
        $("kpiConversionTrend").className = "dk-trend " + 
          (trend.includes("↑") ? "up" : trend.includes("↓") ? "down" : "stable");
      }

      // Actualizar Totales Históricos (Parte inferior)
      if ($("stVolTotal"))
        $("stVolTotal").textContent = fmt(stats.totalRevenue || 0);
      if ($("stTransTotal"))
        $("stTransTotal").textContent = stats.totalSales || 0;
    }

    // 2. Asegurar que las ventas recientes estén cargadas para la actividad en vivo
    if (!window.salesLog || window.salesLog.length === 0) {
      await fetchSalesLog();
    }

    // --- CÁLCULO DE MÉTRICAS EN VIVO (CLIENT-SIDE) ---
    // Esto asegura que si el backend reporta 0, el frontend sume las ventas cargadas
    if (window.salesLog && window.salesLog.length > 0) {
      const todayStr = getTodayStr();
      const todaySales = window.salesLog.filter(s => s.timestamp && s.timestamp.startsWith(todayStr));
      
      const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const todayOrders = todaySales.length;

      // Priorizar datos calculados en vivo para los KPIs principales
      const revEl = $("kpiTotalRevenue") || $("kpiRevenueToday");
      if (revEl && (todayRevenue > 0 || revEl.textContent === "$0")) {
        revEl.textContent = fmt(todayRevenue);
      }
      
      const ordEl = $("kpiOrders") || $("kpiOrdersToday");
      if (ordEl && (todayOrders > 0 || ordEl.textContent === "0")) {
        ordEl.textContent = todayOrders;
      }

      if ($("kpiAvgTicket") && todayOrders > 0) {
        $("kpiAvgTicket").textContent = fmt(Math.round(todayRevenue / todayOrders));
      }

      // --- CÁLCULO DE DEUDA TOTAL (CLIENT-SIDE) ---
      // Esto suma el saldo pendiente (Total - Pagado) de todas las ventas con estado 'partial' o 'pending'
      const totalDebtCalculated = window.salesLog.reduce((sum, s) => {
        const isUnpaid = s.payment_status === "partial" || s.payment_status === "pending";
        return isUnpaid ? sum + (Number(s.total) - (Number(s.total_paid) || 0)) : sum;
      }, 0);

      if ($("kpiTotalDebt") && (totalDebtCalculated > 0 || $("kpiTotalDebt").textContent === "$0")) {
        $("kpiTotalDebt").textContent = fmt(totalDebtCalculated);
      }

      // --- CÁLCULO DE CONVERSIÓN EN VIVO (RENDIMIENTO DIARIO) ---
      // Si el backend reporta visitas (tráfico), recalculamos la tasa real con las ventas de hoy
      if ($("kpiConversion")) {
        const visits = Number(stats.visits_today || stats.visitsToday || 0);
        if (visits > 0) {
          const liveConv = (todayOrders / visits) * 100;
          $("kpiConversion").textContent = liveConv.toFixed(1) + "%";
        } else if (todayOrders > 0) {
          // Si hay ventas pero no hay sensor de visitas, mostramos un indicador de actividad
          $("kpiConversion").textContent = "Activa"; 
        }
      }
    }

  } catch (e) {
    console.error("❌ Error fetching dashboard summary analytics:", e);
  }

  // --- NUEVOS COMPONENTES VISUALES ---
  renderSparklines();
  renderMainSalesChart();
  renderLiveActivity();
  renderHeatmap();

  // Iniciar el Ritmo Neón de colores
  if (window.DashboardThemes) window.DashboardThemes.init();

  // 3. Renderizar el gráfico de Top Productos
  apiFetch(`${API_URL}/analytics/top-products`)
    .then((res) => res.json())
    .then((data) => renderTopProductsApex(data))
    .catch(() => renderTopProductsApex([]));

    // Sincronizar KPI de caja desde el módulo local
    if (typeof updateCashUI === 'function') updateCashUI();
}

/**
 * Los controladores de Arqueo han sido movidos a cash-logic.js
 * para evitar duplicados y conflictos de estado.
 */

window.handleSendDailyReport = async () => {
  toast("⌛ Generando informe PDF y enviando...");
  try {
    // Usamos window.API_URL para asegurar la ruta correcta
    const res = await apiFetch(`${window.API_URL}/reports/send-daily`, {
      method: "POST"
    });
    // Si apiFetch no lanza excepción, es que fue exitoso
    toast("✅ Informe enviado correctamente");
  } catch (e) {
    // Mostramos el error real capturado por apiFetch
    toast("❌ " + e.message);
  }
};

function renderSparklines() {
  const commonOptions = {
    chart: {
      type: "area",
      height: 40,
      sparkline: { enabled: true },
      animations: { enabled: true },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      opacity: 0.3,
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 },
    },
    tooltip: { enabled: false },
  };

  // Sparklines de KPIs (Mockup data para animación suave)
  if ($("sparkRevenue")) {
    new ApexCharts($("sparkRevenue"), {
      ...commonOptions,
      series: [{ data: [12, 14, 10, 18, 15, 25, 21] }],
      colors: ["#e8ff47"],
    }).render();
  }
  if ($("sparkOrders")) {
    new ApexCharts($("sparkOrders"), {
      ...commonOptions,
      series: [{ data: [5, 7, 3, 8, 4, 9, 6] }],
      colors: ["#28a745"],
    }).render();
  }
  if ($("sparkTicket")) {
    new ApexCharts($("sparkTicket"), {
      ...commonOptions,
      series: [{ data: [45, 52, 38, 48, 40, 55, 50] }],
      colors: ["#2f80ed"],
    }).render();
  }
  if ($("sparkConv")) {
    new ApexCharts($("sparkConv"), {
      ...commonOptions,
      series: [{ data: [2, 3, 2.5, 4, 3, 3.5, 3.2] }],
      colors: ["#ff00e6"],
    }).render();
  }
}

function renderMainSalesChart() {
  if (!$("salesMainChart")) return;
  const options = {
    series: [
      {
        name: "Ingresos (COP)",
        type: "area",
        data: [1.2, 1.5, 1.1, 2.1, 1.8, 2.8, 3.2].map((v) => v * 1000000),
      },
      {
        name: "Pedidos",
        type: "line",
        data: [12, 18, 14, 25, 20, 32, 28],
      },
    ],
    chart: {
      height: 320,
      type: "line",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#e8ff47", "#28a745"],
    stroke: { curve: "smooth", width: [4, 3] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100],
      },
    },
    markers: { size: 4, hover: { size: 6 } },
    xaxis: {
      categories: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      { title: { text: "Ingresos" }, labels: { formatter: (val) => fmt(val) } },
      { opposite: true, title: { text: "Órdenes" } },
    ],
    grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
    theme: { mode: "dark" },
    tooltip: { theme: "dark", x: { show: true } },
  };

  if (charts.main) charts.main.destroy();
  charts.main = new ApexCharts($("salesMainChart"), options);
  charts.main.render();
}

function renderTopProductsApex(data = []) {
  const target = $("topProductsApex") || $("chartTopProducts");
  if (!target) return;
  const labels = data.length
    ? data.slice(0, 5).map((p, i) => `#${i + 1} ${p.name}`)
    : ["Sin datos"];
  const values = data.length ? data.slice(0, 5).map((p) => p.qty_sold) : [0];

  const options = {
    series: [{ data: values }],
    chart: { type: "bar", height: 200, toolbar: { show: false } },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        distributed: true,
        barHeight: "60%",
      },
    },
    colors: ["#e8ff47", "#0ee80b", "#28a745", "#3498db", "#2f80ed"],
    dataLabels: { enabled: false },
    xaxis: { categories: labels },
    grid: { show: false },
    legend: { show: false },
  };

  if (charts.top) charts.top.destroy();
  charts.top = new ApexCharts(target, options);
  charts.top.render();
}

function renderHeatmap() {
  if (!$("salesHeatmap")) return;

  // Procesar datos reales de salesLog para el Heatmap
  const sLog = window.salesLog || [];
  const hoursData = new Array(24).fill(0);

  sLog.forEach((s) => {
    const date = new Date(s.createdAt || s.timestamp);
    const hour = date.getHours();
    hoursData[hour]++;
  });

  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const series = days.map((day) => ({
    name: day,
    data: hoursData.map((val, hr) => ({
      x: `${hr}:00`,
      y: val, // Aquí podrías ponderar por día si tuvieras más data
    })),
  }));

  const options = {
    series: series,
    chart: { height: 200, type: "heatmap", toolbar: { show: false } },
    dataLabels: { enabled: false },
    colors: ["#e8ff47"],
    xaxis: {
      type: "category",
      categories: ["12am", "4am", "8am", "12pm", "4pm", "8pm", "11pm"],
    },
    tooltip: { theme: "dark" },
  };

  new ApexCharts($("salesHeatmap"), options).render();
}

function generateHeatmapData(count) {
  let i = 0;
  let series = [];
  while (i < count) {
    series.push({ x: i.toString(), y: Math.floor(Math.random() * 100) });
    i++;
  }
  return series;
}

function renderLiveActivity() {
  const container = $("dashRecentSales") || $("dashLiveActivity");
  if (!container) return;

  const sLog = window.salesLog || [];
  if (sLog.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">Esperando transacciones...</div>';
    return;
  }

  container.innerHTML = sLog
    .slice(0, 8)
    .map((s, i) => {
      const time = new Date(s.createdAt || s.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
            <div class="activity-item">
                <div class="act-icon" style="font-size: 11px; font-weight: bold; color: var(--accent);">#${i + 1}</div>
                <div class="act-body">
                    <div class="act-title"><strong>${esc(s.client || "Cliente")}</strong> realizó una compra</div>
                    <div class="act-meta">
                        <span>${fmt(s.total)}</span>
                        <span>Hace unos instantes (${time})</span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}
