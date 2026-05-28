window.verifySession = () => {
  const s = LS.get("session");
  return s && s.user && s.token;
};

function doLogin(event) {
  if (event) event.preventDefault();
  const u = $("loginUser").value.trim();
  const p = $("loginPass").value;
  const btn = document.querySelector(".login-btn");

  if (!u || !p) return toast("⚠️ Usuario y contraseña requeridos");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "VERIFICANDO...";
  }

  fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: u, pass: p }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Credenciales inválidas");

      window.session = {
        user: data.user,
        role: data.role || "Admin",
        token: data.token,
      };
      window.AUTH_TOKEN = data.token;
      if (data.apiKey) localStorage.setItem("w_api_key", data.apiKey);
      LS.set("session", window.session);
      window.showApp();
    })
    .catch((e) => {
      if ($("loginError")) {
        $("loginError").textContent = e.message.includes("Failed to fetch")
          ? "❌ No hay conexión con el servidor (3000)"
          : "❌ " + e.message;
        $("loginError").style.display = "block";
      }
      toast("❌ Error de acceso");
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "INGRESAR AL PANEL";
      }
    });
}

async function doLogout(forced = false) {
  if (!forced)
    await apiFetch(`${API_URL}/logout`, { method: "POST" }).catch((e) => {});
  LS.set("session", null);
  window.AUTH_TOKEN = null;
  location.reload();
}

function showApp() {
  if ($("loginScreen")) $("loginScreen").style.display = "none";
  if ($("mainApp")) $("mainApp").style.display = "flex";

  if (window.session) {
    const nameEl = document.querySelector(".su-name");
    if (nameEl) nameEl.textContent = window.session.role;
  }
  refreshAll();
  navigateTo("dashboard");
}

function togglePass() {
  const p = $("loginPass");
  if (p) p.type = p.type === "password" ? "text" : "password";
}

window.doLogin = doLogin;
window.doLogout = doLogout;
window.showApp = showApp;
window.togglePass = togglePass;
