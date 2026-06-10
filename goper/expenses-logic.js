/* ═══════════════════════════════════════════════════════
   WINNER — expenses-logic.js (Gestión de Gastos Operativos)
   ═══════════════════════════════════════════════════════ */
"use strict";

let expCharts = { weekly: null, category: null };

window.openExpenseModal = function (id = null) {
  const modal = document.getElementById("expenseModal");
  const overlay = document.getElementById("expenseModalOverlay");

  // Limpiar campos para nuevo gasto
  document.getElementById("expenseId").value = id || "";
  document.getElementById("expenseDate").value = getTodayStr();
  document.getElementById("expenseConcept").value = "";
  document.getElementById("expenseDetail").value = "";
  document.getElementById("expenseAmount").value = "";

  if (modal && overlay) {
    modal.classList.add("open");
    overlay.classList.add("open");
  }
};

window.closeExpenseModal = function () {
  const modal = document.getElementById("expenseModal");
  const overlay = document.getElementById("expenseModalOverlay");
  if (modal && overlay) {
    modal.classList.remove("open");
    overlay.classList.remove("open");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar selector de mes con el mes actual
  const monthInput = document.getElementById("expenseMonth");
  if (monthInput && !monthInput.value) {
    monthInput.value = new Date().toISOString().slice(0, 7);
    monthInput.addEventListener("change", () => window.initExpensesTab());
  }

  const saveBtn = document.getElementById("saveExpenseBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const data = {
        date: document.getElementById("expenseDate").value,
        category: document.getElementById("expenseCategory").value,
        concept: document.getElementById("expenseConcept").value,
        detail: document.getElementById("expenseDetail").value,
        amount: parseFloat(document.getElementById("expenseAmount").value),
      };

      if (!data.category || !data.concept || isNaN(data.amount)) {
        return toast("⚠️ Por favor completa los campos obligatorios");
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";

        const res = await apiFetch(`${API_URL}/expenses`, {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (res.ok) {
          toast("✅ Gasto registrado correctamente");
          closeExpenseModal();
          if (typeof initExpensesTab === "function") initExpensesTab();
        } else {
          const err = await res.json();
          throw new Error(err.error || "Error al guardar");
        }
      } catch (err) {
        toast("❌ " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar Gasto";
      }
    });
  }
});

window.initExpensesTab = async function () {
  console.log("Cargando datos de gastos...");
  const month = document.getElementById("expenseMonth")?.value;
  if (!month) return;

  try {
    // Peticiones paralelas para optimizar velocidad
    const [summary, weekly, category, list] = await Promise.all([
      apiFetch(`${API_URL}/expenses/summary?month=${month}`).then((r) =>
        r.json(),
      ),
      apiFetch(`${API_URL}/expenses/weekly?month=${month}`).then((r) =>
        r.json(),
      ),
      apiFetch(`${API_URL}/expenses/by-category?month=${month}`).then((r) =>
        r.json(),
      ),
      apiFetch(`${API_URL}/expenses?month=${month}`).then((r) => r.json()),
    ]);

    renderExpensesKPIs(summary, month);
    renderExpensesCharts(weekly, category);
    renderExpensesTables(list);
  } catch (e) {
    console.error("Error loading expenses:", e);
    toast("❌ Error al conectar con el módulo de gastos");
  }
};

function renderExpensesKPIs(data, monthStr) {
  if ($("expTotalMonth"))
    $("expTotalMonth").innerText = fmt(data.total_month || 0);
  if ($("expTotalWeek"))
    $("expTotalWeek").innerText = fmt(data.total_week || 0);
  if ($("expAvgWeekly"))
    $("expAvgWeekly").innerText = fmt(data.avg_weekly || 0);
  if ($("expTopCategory"))
    $("expTopCategory").innerText = data.top_category || "---";

  const [year, month] = monthStr.split("-");
  const dateObj = new Date(year, month - 1);
  const monthName = dateObj
    .toLocaleString("es-CO", { month: "long" })
    .toUpperCase();

  if ($("expMonthLabel")) $("expMonthLabel").innerText = `TOTAL ${monthName}`;
  if ($("expTopPercent")) {
    const pct = data.total_month
      ? ((data.top_amount / data.total_month) * 100).toFixed(0)
      : 0;
    $("expTopPercent").innerText = `${pct}% del total mensual`;
  }
}

function renderExpensesCharts(weekly, category) {
  // 1. Gráfica Semanal (Barras)
  const ctxW = $("expensesWeeklyChart")?.getContext("2d");
  if (ctxW) {
    if (expCharts.weekly) expCharts.weekly.destroy();
    expCharts.weekly = new Chart(ctxW, {
      type: "bar",
      data: {
        labels: weekly.map((d) => `Semana ${d.week_number}`),
        datasets: [
          {
            label: "Gastos $",
            data: weekly.map((d) => d.total),
            backgroundColor: "#d1cfcb",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
    });
  }

  // 2. Gráfica de Categorías (Doughnut)
  const ctxC = $("expensesCategoryChart")?.getContext("2d");
  if (ctxC) {
    if (expCharts.category) expCharts.category.destroy();
    expCharts.category = new Chart(ctxC, {
      type: "doughnut",
      data: {
        labels: category.map((d) => d.category),
        datasets: [
          {
            data: category.map((d) => d.total),
            backgroundColor: [
              "#d1cfcb",
              "#3498db",
              "#2ecc71",
              "#f1c40f",
              "#e67e22",
              "#e74c3c",
              "#9b59b6",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#fff", font: { size: 10 } },
          },
        },
      },
    });
  }
}

function renderExpensesTables(list) {
  const container = $("expensesWeeklyTables");
  if (!container) return;

  if (!list.length) {
    container.innerHTML =
      '<div class="ls-empty">No hay gastos registrados en este mes</div>';
    return;
  }

  // Agrupar por semanas para la vista de tabla
  const expensesByDate = list.sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  container.innerHTML = `
    <div class="transactions-group">
      <div class="table-wrap" style="border:none">
        <table class="data-table">
          <thead>
            <tr>
              <th>FECHA</th>
              <th>CATEGORÍA</th>
              <th>CONCEPTO</th>
              <th>VALOR</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${expensesByDate
              .map(
                (e) => `
              <tr class="activity-item">
                <td style="font-size:11px; color:var(--gray-text)">${new Date(e.date).toLocaleDateString()}</td>
                <td><span class="status-badge s-fisica" style="font-size:9px;">${e.category.toUpperCase()}</span></td>
                <td>
                  <div style="font-weight:600; color:white;">${esc(e.concept)}</div>
                  <div style="font-size:10px; color:var(--gray-text)">${esc(e.detail || "")}</div>
                </td>
                <td style="color:var(--accent); font-weight:700;">${fmt(e.amount)}</td>
                <td style="text-align:right;">
                  <button class="action-btn del" onclick="deleteExpense('${e.id}')">✕</button>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

window.deleteExpense = async function (id) {
  if (!confirm("¿Eliminar este registro de gasto?")) return;
  try {
    const res = await apiFetch(`${API_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("✅ Gasto eliminado");
      window.initExpensesTab();
    }
  } catch (e) {
    toast("❌ Error al eliminar");
  }
};
