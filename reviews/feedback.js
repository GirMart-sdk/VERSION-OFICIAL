/* ═══════════════════════════════════════════════════════
   WINNER STORE — feedback.js (Gestión de Reseñas & Feedback)
   ═══════════════════════════════════════════════════════ */
"use strict";

window.openReviewModal = function () {
  let overlay = document.getElementById("reviewModalOverlay");
  let modal = document.getElementById("reviewModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "reviewModalOverlay";
    overlay.className = "modal-overlay";
    overlay.onclick = () => {
      overlay.classList.remove("open");
      modal.classList.remove("open");
    };

    modal = document.createElement("div");
    modal.id = "reviewModal";
    modal.className = "adm-modal";
    modal.style.maxWidth = "500px";
    document.body.append(overlay, modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>DEJA TU RESEÑA W<span style="color:var(--accent)">●</span>NNER</h3>
      <button class="adm-close" onclick="document.getElementById('reviewModalOverlay').click()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px; color:var(--gray-text); margin-bottom:20px;">Tu opinión es lo más importante para nosotros. Cuéntanos qué tal tu experiencia.</p>
      
      <form id="reviewForm" onsubmit="window.handleReviewSubmit(event)">
        <div style="margin-bottom:15px">
          <label style="font-size:12px; color:var(--gray-text); display:block; margin-bottom:5px;">Tu Nombre</label>
          <input type="text" id="revName" placeholder="Ej: Valentina M." required style="width:100%; padding:12px; background:var(--dark); border:1px solid var(--border); color:white; border-radius:4px; font-size:14px; box-sizing:border-box;">
        </div>

        <div style="margin-bottom:15px">
          <label style="font-size:12px; color:var(--gray-text); display:block; margin-bottom:5px;">Calificación</label>
          <div class="star-rating" style="display:flex; gap:10px; font-size:28px; color:rgba(255,255,255,0.1); cursor:pointer;">
            <span onclick="window.setRating(1)">★</span>
            <span onclick="window.setRating(2)">★</span>
            <span onclick="window.setRating(3)">★</span>
            <span onclick="window.setRating(4)">★</span>
            <span onclick="window.setRating(5)">★</span>
          </div>
          <input type="hidden" id="revRating" value="5">
        </div>

        <div style="margin-bottom:15px">
          <label style="font-size:12px; color:var(--gray-text); display:block; margin-bottom:5px;">Observación / Comentario</label>
          <textarea id="revComment" rows="3" placeholder="Cuéntanos los detalles..." required style="width:100%; padding:12px; background:var(--dark); border:1px solid var(--border); color:white; border-radius:4px; resize:none; font-size:14px; box-sizing:border-box;"></textarea>
        </div>

        <div style="margin-bottom:20px">
          <label style="font-size:12px; color:var(--gray-text); display:block; margin-bottom:5px;">Sugerencia (Opcional)</label>
          <textarea id="revSuggestion" rows="2" placeholder="¿Cómo podemos mejorar?" style="width:100%; padding:12px; background:var(--dark); border:1px solid var(--border); color:white; border-radius:4px; resize:none; font-size:14px; box-sizing:border-box;"></textarea>
        </div>

        <button type="submit" class="adm-btn" style="width:100%; height:50px; font-family:'Bebas Neue'; letter-spacing:2px; font-size:18px; cursor:pointer;">ENVIAR RESEÑA →</button>
      </form>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");

  // Aseguramos que las estrellas se pinten correctamente al abrir
  setTimeout(() => window.setRating(5), 50);
};

window.setRating = function (n) {
  const ratingInput = document.getElementById("revRating");
  if (ratingInput) ratingInput.value = n;

  const stars = document.querySelectorAll(".star-rating span");
  stars.forEach((s, i) => {
    s.style.color = i < n ? "var(--accent)" : "rgba(255,255,255,0.1)";
    s.style.textShadow = i < n ? "0 0 10px var(--accent)" : "none";
  });
};

window.handleReviewSubmit = async function (e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const name = document.getElementById("revName").value.trim();
  const rating = document.getElementById("revRating").value;
  const comment = document.getElementById("revComment").value.trim();
  const suggestion = document.getElementById("revSuggestion").value.trim();

  try {
    btn.disabled = true;
    btn.textContent = "ENVIANDO...";

    const res = await apiFetch(`${API_URL}/reviews`, {
      method: "POST",
      body: JSON.stringify({ name, rating, comment, suggestion }),
    });

    if (!res.ok) throw new Error();

    if (typeof showToast === "function")
      showToast("🙏 ¡Gracias por tu reseña, Winner!");
  } catch (err) {
    if (typeof showToast === "function")
      showToast("❌ No se pudo enviar. Intenta más tarde.");
  } finally {
    btn.disabled = false;
    btn.textContent = "ENVIAR RESEÑA →";
  }

  const overlay = document.getElementById("reviewModalOverlay");
  if (overlay) overlay.click();
};
