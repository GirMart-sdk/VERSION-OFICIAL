/* ── INFO MODULE ── */
const InfoModule = {
  initNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast("🎉 ¡Bienvenido a la comunidad Winner!");
        form.querySelector("input").value = "";
      });
    }
  },
};
document.addEventListener("DOMContentLoaded", () =>
  InfoModule.initNewsletter(),
);
