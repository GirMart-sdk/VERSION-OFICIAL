/* ═══════════════════════════════════════════════════════
   WINNER — auth.js (Frontend Session Management)
   ═══════════════════════════════════════════════════════ */
"use strict";

/**
 * Updates the UI to show the main application after a successful login.
 */
window.showApp = function () {
  const loginScreen = document.getElementById("loginScreen");
  const adminApp = document.getElementById("mainApp");

  if (loginScreen) {
    loginScreen.style.opacity = "0";
    setTimeout(() => (loginScreen.style.display = "none"), 400);
  }

  if (adminApp) {
    adminApp.style.display = "flex";
    setTimeout(() => {
      if (typeof navigateTo === "function") navigateTo("dashboard");
    }, 100);
  }
};

window.doLogout = function (silent = false) {
  if (!silent && !confirm("¿Cerrar sesión?")) return;
  if (typeof SS !== "undefined") SS.set("session", null);
  localStorage.removeItem("w_api_key");
  window.location.reload();
};

/**
 * Inicialización del formulario de Login
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const btnTogglePass = document.getElementById("btnTogglePass");
  const loginBtn = document.querySelector(".login-btn");
  const passInput = document.getElementById("loginPass");

  // Lógica para mostrar/ocultar contraseña
  if (btnTogglePass && passInput) {
    btnTogglePass.addEventListener("click", () => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      btnTogglePass.textContent = isPass ? "🔒" : "👁";
    });
  }

  // Lógica de envío del formulario
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = document.getElementById("loginUser").value.trim();
      const pass = document.getElementById("loginPass").value.trim();

      if (!user || !pass) {
        if (loginError) {
          loginError.textContent = "⚠️ Ingresa usuario y contraseña";
          loginError.style.display = "block";
        }
        return;
      }

      try {
        // Estado de carga: Feedback visual de que "está pensando"
        if (loginBtn) {
          loginBtn.disabled = true;
          loginBtn.innerHTML = 'VERIFICANDO... <span class="store-dot"></span>';
        }

        const res = await window.apiFetch(`${window.API_URL}/auth/login`, {
          method: "POST",
          body: JSON.stringify({ user, pass }),
        });

        const data = await res.json();

        if (data.success) {
          SS.set("session", {
            token: data.token,
            user: data.user || user,
            role: data.role,
          });
          if (data.apiKey) localStorage.setItem("w_api_key", data.apiKey);
          window.AUTH_TOKEN = data.token;

          window.showApp();
        } else {
          throw new Error(data.error || "Credenciales incorrectas");
        }
      } catch (err) {
        if (loginError) {
          loginError.textContent = "❌ " + err.message;
          loginError.style.display = "block";
        }
        // Restaurar botón si falla
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML =
            'INGRESAR AL PANEL <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7" /></svg>';
        }
      }
    });
  }

  // --- Lógica de Recuperación ---
  const linkForgot = document.getElementById("linkForgot");
  const btnCancel = document.getElementById("btnCancelRecovery");
  const recoveryView = document.getElementById("recoveryView");
  const btnSendRecovery = document.getElementById("btnSendRecovery");

  if (linkForgot) {
    linkForgot.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      recoveryView.style.display = "block";
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      recoveryView.style.display = "none";
      loginForm.style.display = "block";
    });
  }

  if (btnSendRecovery) {
    btnSendRecovery.addEventListener("click", async () => {
      const email = document.getElementById("recoveryEmail").value.trim();
      if (!email) return toast("⚠️ Ingresa un correo válido");

      try {
        btnSendRecovery.disabled = true;
        const res = await window.apiFetch(
          `${window.API_URL}/auth/forgot-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );
        const data = await res.json();
        toast(
          data.success
            ? "✅ Instrucciones enviadas a tu correo"
            : "❌ " + data.error,
        );
      } catch (e) {
        toast("❌ Error al conectar con el servidor");
      } finally {
        btnSendRecovery.disabled = false;
      }
    });
  }
});
