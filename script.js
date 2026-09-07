(() => {
  const email = "proyectos.delaya@gmail.com";
  const copyButton = document.querySelector("[data-copy-email]");
  const status = document.querySelector(".copy-status");

  if (!copyButton || !status) return;

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
