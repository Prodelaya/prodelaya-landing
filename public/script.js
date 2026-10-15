(() => {
  const copyButton = document.querySelector("[data-copy-email]");
  const status = document.querySelector(".copy-status");
  const emailSource = document.querySelector(
    "[data-email], a[href^='mailto:']",
  );
  const email =
    emailSource?.dataset.email ?? emailSource?.href.replace(/^mailto:/, "");

  if (!copyButton || !status || !email) return;

  copyButton.hidden = false;

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      status.textContent = "Correo copiado al portapapeles.";
    } catch {
      status.textContent =
        "No se pudo copiar. Puedes usar el enlace de correo.";
    }
  });
})();
