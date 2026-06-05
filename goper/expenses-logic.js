/* ═══════════════════════════════════════════════════════
   WINNER — goper/expenses-logic.js (Gestión de Gastos Operativos)
   ═══════════════════════════════════════════════════════ */
"use strict";

let currentExpenseMonth = "";
let expensesData = [];
let weeklyChart, categoryChart;
let editingExpenseId = null;

async function initExpensesTab() {
  // Establecer el mes actual por defecto
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  currentExpenseMonth = `${year}-${month}`;
  if ($("expenseMonth")) $("expenseMonth").value = currentExpenseMonth;

  await loadExpenses();

  // Event Listeners
  $("expenseMonth")?.addEventListener("change", loadExpenses);
  $("refreshExpenses")?.addEventListener("click", loadExpenses);
  $("addExpenseBtn")?.addEventListener("click", () => openExpenseModal());
  $("saveExpenseBtn")?.addEventListener("click", saveExpense);
}

async function loadExpenses() {
  const month = $("expenseMonth")?.value || currentExpenseMonth;
  currentExpenseMonth = month;

  try {
    // Cargar lista de gastos
    const res = await apiFetch(`${API_URL}/expenses?month=${month}`);
    expensesData = await res.json();

    // Cargar resumen
    const summaryRes = await apiFetch(
      `${API_URL}/expenses/summary?month=${month}`,
    );
    const summary = await summaryRes.json();

    // Actualizar KPIs
    if ($("expTotalMonth"))
      $("expTotalMonth").innerText = fmt(summary.total_month || 0);
    if ($("expMonthLabel"))
      $("expMonthLabel").innerText = new Date(month + "-01").toLocaleDateString(
        "es-CO",
        { year: "numeric", month: "long" },
      );
    if ($("expTotalWeek"))
      $("expTotalWeek").innerText = fmt(summary.total_week || 0);
    if ($("expWeekLabel"))
      $("expWeekLabel").innerText = `Semana actual (${getCurrentWeekRange()})`;
    if ($("expTopCategory"))
      $("expTopCategory").innerText = summary.top_category || "-";
    const topPercent =
      summary.top_amount && summary.total_month
        ? ((summary.top_amount / summary.total_month) * 100).toFixed(1)
        : 0;
    if ($("expTopPercent")) $("expTopPercent").innerText = `${topPercent}%`;
    if ($("expAvgWeekly"))
      $("expAvgWeekly").innerText = fmt(summary.avg_weekly || 0);

    // Cargar datos para gráficos
    await loadWeeklyChart(month);
    await loadCategoryChart(month);

    // Renderizar tablas semanales
    renderWeeklyTables(expensesData, month);
  } catch (err) {
    console.error("Error loading expenses:", err);
    toast("❌ Error al cargar gastos");
  }
}

function getCurrentWeekRange() {
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay())); // Domingo
  const end = new Date(now.setDate(now.getDate() - now.getDay() + 6)); // Sábado
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
}

async function loadWeeklyChart(month) {
  const res = await apiFetch(`${API_URL}/expenses/weekly?month=${month}`);
  const data = await res.json();
  const labels = data.map((w) => `Semana ${w.week_number}`);
  const totals = data.map((w) => w.total);

  const ctx = $("expensesWeeklyChart")?.getContext("2d");
  if (!ctx) return;

  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Gastos ($)",
          data: totals,
          backgroundColor: "#e8ff47",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmt(v) } } },
    },
  });
}

async function loadCategoryChart(month) {
  const res = await apiFetch(`${API_URL}/expenses/by-category?month=${month}`);
  const data = await res.json();
  const labels = data.map((c) => c.category);
  const values = data.map((c) => c.total);
  const percentages = data.map((c) => c.percentage);

  const ctx = $("expensesCategoryChart")?.getContext("2d");
  if (!ctx) return;

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#e8ff47",
            "#3498db",
            "#e74c3c",
            "#2ecc71",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
            "#e67e22",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${fmt(ctx.raw)} (${percentages[ctx.dataIndex]}%)`,
          },
        },
        legend: { position: "bottom", labels: { color: "#ccc" } },
      },
    },
  });
}

function renderWeeklyTables(expenses, month) {
  const weeks = {};
  expenses.forEach((exp) => {
    const weekNum = getWeekNumber(new Date(exp.date));
    if (!weeks[weekNum]) weeks[weekNum] = [];
    weeks[weekNum].push(exp);
  });

  const container = $("expensesWeeklyTables");
  if (!container) return;

  const sortedWeeks = Object.keys(weeks).sort((a, b) => a - b);
  if (sortedWeeks.length === 0) {
    container.innerHTML =
      '<div class="ls-empty">No hay gastos registrados en este mes</div>';
    return;
  }

  container.innerHTML = sortedWeeks
    .map((weekNum) => {
      const weekExpenses = weeks[weekNum];
      const totalWeek = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
      const weekStart = getStartOfWeek(weekNum, month);
      const weekEnd = getEndOfWeek(weekNum, month);
      return `
      <div class="week-table">
        <div class="week-header">
          <span class="week-title">Semana ${weekNum} (${weekStart} - ${weekEnd})</span>
          <span class="week-total">Total: ${fmt(totalWeek)}</span>
        </div>
        <table class="expense-table">
          <thead>
            <tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Detalle</th><th>Valor</th><th></th></tr>
          </thead>
          <tbody>
            ${weekExpenses
              .map(
                (exp) => `
              <tr>
                <td>${exp.date.split("T")[0]}</td>
                <td>${exp.category}</td>
                <td>${esc(exp.concept)}</td>
                <td>${esc(exp.detail || "")}</td>
                <td class="expense-amount">- ${fmt(exp.amount)}</td>
                <td class="expense-actions">
                  <button onclick="editExpense('${exp.id}')" title="Editar">✎</button>
                  <button class="delete" onclick="deleteExpense('${exp.id}')" title="Eliminar">✕</button>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    })
    .join("");
}

// Helper: número de semana (ISO)
function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getStartOfWeek(weekNum, monthYear) {
  const year = parseInt(monthYear.split("-")[0]);
  const d = new Date(year, 0, 1 + (weekNum - 1) * 7);
  d.setDate(d.getDate() - (d.getDay() || 7) + 1); // Lunes de la semana
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getEndOfWeek(weekNum, monthYear) {
  const year = parseInt(monthYear.split("-")[0]);
  const d = new Date(year, 0, 1 + (weekNum - 1) * 7);
  d.setDate(d.getDate() - (d.getDay() || 7) + 7); // Domingo de la semana
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function openExpenseModal(expense = null) {
  if (expense) {
    editingExpenseId = expense.id;
    if ($("expenseModalTitle"))
      $("expenseModalTitle").innerText = "Editar Gasto";
    if ($("expenseDate")) $("expenseDate").value = expense.date.split("T")[0];
    if ($("expenseCategory")) $("expenseCategory").value = expense.category;
    if ($("expenseConcept")) $("expenseConcept").value = expense.concept;
    if ($("expenseDetail")) $("expenseDetail").value = expense.detail || "";
    if ($("expenseAmount")) $("expenseAmount").value = expense.amount;
  } else {
    editingExpenseId = null;
    if ($("expenseModalTitle"))
      $("expenseModalTitle").innerText = "Nuevo Gasto";
    if ($("expenseDate"))
      $("expenseDate").value = new Date().toISOString().split("T")[0];
    if ($("expenseCategory")) $("expenseCategory").value = "";
    if ($("expenseConcept")) $("expenseConcept").value = "";
    if ($("expenseDetail")) $("expenseDetail").value = "";
    if ($("expenseAmount")) $("expenseAmount").value = "";
  }
  $("expenseModalOverlay")?.classList.add("open");
  $("expenseModal")?.classList.add("open");
}

function closeExpenseModal() {
  $("expenseModalOverlay")?.classList.remove("open");
  $("expenseModal")?.classList.remove("open");
  editingExpenseId = null;
}

async function saveExpense() {
  const date = $("expenseDate")?.value;
  const category = $("expenseCategory")?.value;
  const concept = $("expenseConcept")?.value.trim();
  const detail = $("expenseDetail")?.value.trim();
  const amount = parseFloat($("expenseAmount")?.value);

  if (!date || !category || !concept || !amount || amount <= 0) {
    toast("⚠️ Completa todos los campos obligatorios");
    return;
  }

  const expenseData = { date, category, concept, detail, amount };

  const method = editingExpenseId ? "PUT" : "POST";
  const url = editingExpenseId
    ? `${API_URL}/expenses/${editingExpenseId}`
    : `${API_URL}/expenses`;

  try {
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    });
    if (res.ok) {
      closeExpenseModal();
      loadExpenses();
      toast(editingExpenseId ? "✅ Gasto actualizado" : "✅ Gasto registrado");
    } else {
      const err = await res.json();
      toast("❌ Error: " + (err.error || "No se pudo guardar el gasto"));
    }
  } catch (err) {
    console.error(err);
    toast("❌ Error de conexión al guardar gasto");
  }
}

async function editExpense(id) {
  const expense = expensesData.find((e) => e.id === id);
  if (expense) openExpenseModal(expense);
}

async function deleteExpense(id) {
  if (!confirm("¿Eliminar este gasto permanentemente?")) return;
  try {
    const res = await apiFetch(`${API_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      loadExpenses();
      toast("✅ Gasto eliminado");
    } else {
      const err = await res.json();
      toast("❌ Error: " + (err.error || "No se pudo eliminar el gasto"));
    }
  } catch (err) {
    console.error(err);
    toast("❌ Error de conexión al eliminar gasto");
  }
}

window.initExpensesTab = initExpensesTab;
window.loadExpenses = loadExpenses;
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.saveExpense = saveExpense;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
