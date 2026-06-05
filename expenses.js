/* ═══════════════════════════════════════════════════════
   WINNER — expenses.js (Gestión de Gastos Operativos)
   ═══════════════════════════════════════════════════════ */
"use strict";

/**
 * Renderiza la lista de gastos obtenida del servidor.
 */
async function renderExpenses() {
  const container = $("expensesList");
  if (!container) return;

  try {
    const res = await apiFetch(`${API_URL}/expenses`);
    const expenses = await res.json();

    let total = 0;
    container.innerHTML = expenses.length
      ? expenses
          .map((e) => {
            total += e.amount;
            return `
          <div class="dash-neon-box" style="padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; color:white">${esc(e.description)}</div>
              <div style="font-size:11px; color:var(--gray-text)">${e.category} • ${fmtDate(e.createdAt)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:900; color:var(--red)">- ${fmt(e.amount)}</div>
              <button class="btn-ghost-sm" onclick="deleteExpense('${e.id}')" style="margin-top:5px">✕</button>
            </div>
          </div>`;
          })
          .join("")
      : '<div class="ls-empty">No hay gastos registrados este mes</div>';

    if ($("totalExpensesSum")) $("totalExpensesSum").textContent = fmt(total);
  } catch (e) {
    toast("❌ Error al cargar gastos");
  }
}

/**
 * Elimina un gasto y refresca los indicadores financieros.
 */
async function deleteExpense(id) {
  if (!confirm("¿Eliminar este registro de gasto?")) return;
  try {
    const res = await apiFetch(`${API_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("✅ Gasto eliminado");
      renderExpenses();
      if (typeof renderDashboard === "function") renderDashboard();
    }
  } catch (err) {
    toast("❌ Error al intentar eliminar");
  }
}

/**
 * Envía el nuevo gasto al backend para su almacenamiento en PostgreSQL.
 */
async function saveExpense() {
  const description = $("expDesc")?.value.trim();
  const amount = parseFloat($("expAmount")?.value);
  const category = $("expCat")?.value;

  if (!description || isNaN(amount) || amount <= 0) {
    return toast("⚠️ Completa los datos correctamente");
  }

  try {
    const res = await apiFetch(`${API_URL}/expenses`, {
      method: "POST",
      body: JSON.stringify({ description, amount, category }),
    });

    if (res.ok) {
      toast("✅ Gasto registrado");
      if (typeof closeExpenseModal === "function") closeExpenseModal();
      renderExpenses();
      if (typeof renderDashboard === "function") renderDashboard();
    }
  } catch (e) {
    toast("❌ Error al guardar gasto");
  }
}

window.openExpenseModal = function () {
  $("expenseModalOverlay")?.classList.add("open");
  $("expenseModal")?.classList.add("open");
  if ($("expDesc")) $("expDesc").value = "";
  if ($("expAmount")) $("expAmount").value = "";
};

window.closeExpenseModal = function () {
  $("expenseModalOverlay")?.classList.remove("open");
  $("expenseModal")?.classList.remove("open");
};

window.renderExpenses = renderExpenses;
window.deleteExpense = deleteExpense;
window.saveExpense = saveExpense;
