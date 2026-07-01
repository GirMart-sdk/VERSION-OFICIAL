/**
 * WINNER STORE - Módulo de Control de Caja (Arqueo)
 * Integra la lógica de turnos con el panel administrativo.
 */

const CASH_STORAGE_KEY = 'winner_cash_sessions';
let currentSession = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initCashModule();
});

function initCashModule() {
    loadSession();
    updateCashUI();
    renderCashHistory();
}

function loadSession() {
    const sessions = JSON.parse(localStorage.getItem(CASH_STORAGE_KEY) || '[]');
    window.currentCashSession = sessions.find(s => s.status === 'open') || null;
    currentSession = window.currentCashSession;
}

function saveSessions(sessions) {
    localStorage.setItem(CASH_STORAGE_KEY, JSON.stringify(sessions));
}

function updateCashUI() {
    loadSession(); // Recargar para asegurar el estado más reciente
    const isOpen = !!window.currentCashSession;
    
    // Elementos Globales (Mini Badge)
    const miniBadge = document.getElementById('topSessionBadge');
    if (miniBadge) {
        miniBadge.textContent = isOpen ? 'Caja Abierta' : 'Caja Cerrada';
        miniBadge.className = `session-badge-mini ${isOpen ? 'abierta' : 'cerrada'}`;
    }

    // Elementos del Dashboard (KPI principal)
    const kpiNetCash = document.getElementById('kpiNetCash');
    if (kpiNetCash) {
        const sessionSales = calculateSalesInSession(window.currentCashSession);
        const totalNet = isOpen ? (window.currentCashSession.baseAmount + sessionSales.cash) : 0;
        kpiNetCash.textContent = fmt(totalNet);
        
        // Indicador de "CAJA ABIERTA" en el Dashboard
        const label = kpiNetCash.parentElement.querySelector(".dash-label-impact");
        if (label) {
            if (isOpen) {
                label.innerHTML = "EFECTIVO EN CAJA <span style='color:var(--green); font-size:11px; font-weight:700;'>● ACTIVA</span>";
            } else {
                label.textContent = "Efectivo Neto (Caja)";
            }
        }
    }

    // Elementos de la página de Caja
    const statusText = document.getElementById('cashStatusText');
    const statusIcon = document.getElementById('cashStatusIcon');
    const btnOpen = document.getElementById('btnOpenCash');
    const btnClose = document.getElementById('btnCloseCash');
    const details = document.getElementById('activeSessionDetails');

    if (statusText) {
        statusText.textContent = isOpen ? 'Turno en Curso' : 'Caja Cerrada';
        statusIcon.textContent = isOpen ? '🟢' : '🔒';
        btnOpen.style.display = isOpen ? 'none' : 'block';
        btnClose.style.display = isOpen ? 'block' : 'none';
        details.style.display = isOpen ? 'grid' : 'none';

        if (isOpen) {
            document.getElementById('sessionStartTime').textContent = new Date(window.currentCashSession.startTime).toLocaleTimeString();
            document.getElementById('sessionBaseAmount').textContent = formatMoney(window.currentCashSession.baseAmount);
            
            // Calcular ventas del turno reales usando la data global de ventas
            const sessionSales = calculateSalesInSession(window.currentCashSession);
            document.getElementById('sessionCashSales').textContent = formatMoney(sessionSales.cash);
            
            const totalNet = window.currentCashSession.baseAmount + sessionSales.cash;
            document.getElementById('sessionTotalNet').textContent = formatMoney(totalNet);
        }
    }
}

function openCashModal() {
    document.getElementById('cashOpenModal').classList.add('open');
    document.getElementById('cashOpenOverlay').classList.add('open');
}

function closeCashModal() {
    document.getElementById('cashOpenModal').classList.remove('open');
    document.getElementById('cashOpenOverlay').classList.remove('open');
}

function confirmOpenCash() {
    const base = parseFloat(document.getElementById('cashBaseInput').value) || 0;
    const newSession = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        endTime: null,
        baseAmount: base,
        status: 'open',
        admin: 'Admin'
    };

    const sessions = JSON.parse(localStorage.getItem(CASH_STORAGE_KEY) || '[]');
    sessions.push(newSession);
    saveSessions(sessions);
    currentSession = newSession;
    
    closeCashModal();
    updateCashUI();
    if(typeof toast === 'function') toast("Turno de caja iniciado");
    renderCashHistory();
}

function closeCashArqueo() {
    const sales = calculateSalesInSession(currentSession);
    const summaryDiv = document.getElementById('arqueoSummary');
    
    summaryDiv.innerHTML = `
        <div class="arqueo-row"><label>Monto Base:</label><span>${formatMoney(currentSession.baseAmount)}</span></div>
        <div class="arqueo-row"><label>Ventas Efectivo:</label><span>${formatMoney(sales.cash)}</span></div>
        <div class="arqueo-row"><label>Ventas Tarjeta:</label><span>${formatMoney(sales.card)}</span></div>
        <div class="arqueo-row"><label>Otros Métodos:</label><span>${formatMoney(sales.other)}</span></div>
        <div class="arqueo-row total"><label>Efectivo Total:</label><span>${formatMoney(currentSession.baseAmount + sales.cash)}</span></div>
    `;

    document.getElementById('cashCloseModal').classList.add('open');
    document.getElementById('cashCloseOverlay').classList.add('open');
}

function closeCashArqueoModal() {
    document.getElementById('cashCloseModal').classList.remove('open');
    document.getElementById('cashCloseOverlay').classList.remove('open');
}

async function confirmCloseCash() {
    const sessions = JSON.parse(localStorage.getItem(CASH_STORAGE_KEY) || '[]');
    const sessionToClose = currentSession || window.currentCashSession;
    if (!sessionToClose) return;

    const idx = sessions.findIndex(s => s.id === sessionToClose.id);
    const shouldEmail = document.getElementById('sendEmailArqueo')?.checked;
    const shouldPrint = document.getElementById('printArqueo')?.checked;
    
    if (idx !== -1) {
        sessions[idx].status = 'closed';
        sessions[idx].endTime = new Date().toISOString();
        saveSessions(sessions);

        // Enviar reporte al cerrar turno (PDF al Email) solo si está seleccionado
        if (shouldEmail && typeof handleSendDailyReport === 'function') {
            await handleSendDailyReport();
        }

        if (shouldPrint) {
            // Placeholder para la lógica de impresión térmica
            toast("🖨️ Comprobante de cierre generado.");
        }
    }

    currentSession = null;
    closeCashArqueoModal();
    updateCashUI();
    if(typeof toast === 'function') toast("Caja cerrada exitosamente");
    renderCashHistory();
}

function calculateSalesInSession(session) {
    const salesLog = window.AppStore.state.salesLog;
    if (!session || !salesLog || !Array.isArray(salesLog)) return { cash: 0, card: 0, other: 0 };
    
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();

    return salesLog.reduce((acc, sale) => {
        const saleTime = new Date(sale.timestamp || sale.createdAt).getTime();
        if (isNaN(saleTime)) return acc;
        
        // Solo sumamos ventas físicas realizadas durante el tiempo del turno
        if (saleTime >= start && saleTime <= end && sale.channel === 'fisica') {
            const method = (sale.method || sale.payment_method || "").toLowerCase();
            const amount = Number(sale.total) || 0;
            if (method.includes("efectivo")) acc.cash += amount;
            else if (method.includes("tarjeta")) acc.card += amount;
            else acc.other += amount;
        }
        return acc;
    }, { cash: 0, card: 0, other: 0 });
}

function renderCashHistory() {
    const sessions = JSON.parse(localStorage.getItem(CASH_STORAGE_KEY) || '[]').reverse();
    const body = document.getElementById('cashHistoryBody');
    if (!body) return;

    if (sessions.length === 0) {
        body.innerHTML = '<tr class="empty-row"><td colspan="7">No hay registros</td></tr>';
        return;
    }

    body.innerHTML = sessions.map(s => `
        <tr>
            <td style="font-size:11px">${new Date(s.startTime).toLocaleDateString()}</td>
            <td>${new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${s.endTime ? new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</td>
            <td>${fmt(s.baseAmount)}</td>
            <td style="color:var(--green)">${fmt(calculateSalesInSession(s).cash)}</td>
            <td style="font-weight:700; color:var(--accent)">
                ${fmt(s.baseAmount + calculateSalesInSession(s).cash)}
            </td>
            <td><span class="status-pill ${s.status}">${s.status}</span></td>
        </tr>
    `).join('');
}

function formatMoney(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

/**
 * Placeholder para la futura implementación del envío de reportes por correo.
 */
async function handleSendDailyReport() {
    // TODO: Implementar la lógica de generación de PDF y envío por correo.
    // Por ahora, solo mostramos una notificación.
    if (typeof toast === 'function') {
        toast("⚙️ Función de envío de reporte por email en desarrollo.");
    }
    console.log("Intento de envío de reporte diario.");
    return Promise.resolve();
}

window.openCashModal = openCashModal;
window.confirmOpenCash = confirmOpenCash;
window.closeCashArqueo = closeCashArqueo;
window.confirmCloseCash = confirmCloseCash;