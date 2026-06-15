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

    // 1.1 Obtener estado del Arqueo de Caja (Sesión Activa)
    const arqueoRes = await apiFetch(`${API_URL}/arqueo/status`);
    const arqueo = await arqueoRes.json();

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

      // Priorizar el saldo del Arqueo de Caja si hay una sesión abierta
      if ($("kpiNetCash")) {
        const isActive = arqueo && arqueo.active;
        const cashDisplay = isActive
          ? arqueo.calculations.theoreticalBalance
          : stats.netCash;

        $("kpiNetCash").textContent = fmt(cashDisplay || 0);

        // Indicador visual de que la caja está abierta
        const label =
          $("kpiNetCash").parentElement.querySelector(".dash-label-impact");
        if (label && isActive) {
          label.innerHTML =
            "EFECTIVO EN CAJA <span style='color:var(--green); font-size:10px;'>ACTIVA</span>";
        }
      }

      if ($("kpiConversion")) {
        $("kpiConversion").textContent = stats.conversion || "0%";
      }

      if ($("kpiConversionTrend")) {
        const trend = stats.conversion_trend || "estable";
        $("kpiConversionTrend").textContent = trend;
        // Sincronización con clases dk-trend para Glassmorphism
        $("kpiConversionTrend").className =
          "dk-trend " + (trend.includes("↑") ? "up" : "down");
      }

      // Actualizar Totales Históricos (Parte inferior)
      if ($("stVolTotal"))
        $("stVolTotal").textContent = fmt(stats.totalRevenue || 0);
      if ($("stTransTotal"))
        $("stTransTotal").textContent = stats.totalSales || 0;
    }

    // 1.2 Renderizar el Widget de Control de Caja
    renderArqueoWidget(arqueo);

    // 2. Asegurar que las ventas recientes estén cargadas para la actividad en vivo
    if (!window.salesLog || window.salesLog.length === 0) {
      await fetchSalesLog();
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
}

/**
 * Renderiza el widget de Apertura/Cierre de caja en el Dashboard
 */
function renderArqueoWidget(arqueo) {
  const container = $("arqueoWidgetContainer"); // Asegúrate de tener este ID en tu HTML
  if (!container) return;

  if (arqueo && arqueo.active) {
    // ESTADO: CAJA ABIERTA
    const calc = arqueo.calculations;
    container.innerHTML = `
      <div class="dash-neon-box" style="padding: 20px; border-color: var(--green); border-width: 2px;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
          <div>
            <span class="dash-label-impact">SESIÓN ACTIVA: <strong style="color:white">${arqueo.session.id}</strong></span>
            <div style="font-size: 24px; font-weight: 800; color: var(--white); margin: 5px 0;">${fmt(calc.theoreticalBalance)}</div>
            <span style="font-size: 11px; color: var(--gray-text)">Apertura: ${new Date(arqueo.session.openedAt).toLocaleTimeString()}</span>
          </div>
          <button class="adm-btn" onclick="handleCloseArqueo()" style="background:var(--red); border-color:var(--red); width:auto; padding: 0 20px;">
            CERRAR CAJA
          </button>
        </div>
      </div>
    `;
  } else {
    // ESTADO: CAJA CERRADA
    container.innerHTML = `
      <div class="dash-neon-box" style="padding: 20px; border-style: dashed; opacity: 0.8;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
          <div>
            <span class="dash-label-impact">CONTROL DE CAJA</span>
            <div style="font-size: 16px; color: var(--gray-text); margin-top: 5px;">La caja está cerrada actualmente.</div>
          </div>
          <button class="adm-btn" onclick="handleOpenArqueo()" style="width:auto; padding: 0 20px;">
            ABRIR CAJA
          </button>
        </div>
      </div>
    `;
  }
}

window.handleOpenArqueo = async () => {
  const base = prompt(
    "Ingrese el dinero base (Sencillo) para iniciar:",
    "100000",
  );
  if (base === null) return;

  try {
    const res = await apiFetch(`${API_URL}/arqueo/open`, {
      method: "POST",
      body: JSON.stringify({
        initialBalance: parseFloat(base) || 0,
        notes: "Apertura desde Dashboard",
      }),
    });

    if (res.ok) {
      toast("✅ Caja abierta correctamente");
      renderDashboard(); // Refrescar vista
    } else {
      const err = await res.json();
      toast("❌ Error: " + err.error);
    }
  } catch (e) {
    toast("❌ Error de conexión");
  }
};

window.handleCloseArqueo = async () => {
  const statusRes = await apiFetch(`${API_URL}/arqueo/status`);
  const arqueo = await statusRes.json();

  if (!arqueo.active) return;

  const tBalance = arqueo.calculations.theoreticalBalance;
  const real = prompt(
    `CIERRE DE CAJA\nSaldo esperado: ${fmt(tBalance)}\n\n¿Cuánto dinero físico hay en caja?:`,
    tBalance,
  );

  if (real === null) return;

  try {
    const res = await apiFetch(`${API_URL}/arqueo/close`, {
      method: "POST",
      body: JSON.stringify({
        realBalance: parseFloat(real) || 0,
        notes: "Cierre rápido desde Dashboard",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const diff = data.session.difference;
      alert(
        `✅ Caja cerrada.\nDiferencia: ${fmt(diff)} ${diff < 0 ? "(Faltante)" : diff > 0 ? "(Sobrante)" : "(Exacto)"}`,
      );
      renderDashboard();
    } else {
      toast("❌ No se pudo cerrar la caja");
    }
  } catch (e) {
    toast("❌ Error de red");
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
