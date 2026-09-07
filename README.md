# Portfolio de Pablo Laya

Landing estática en español para presentar proyectos de automatización, integraciones, herramientas internas e IA aplicada con revisión humana.

## Vista local segura

El repositorio contiene material privado que no pertenece al sitio. Para revisar la landing, prepara **fuera del repositorio** una carpeta temporal que incluya solo:

- `index.html`
- `styles.css`
- `script.js`
- los recursos públicos aprobados que use la página

Sirve esa carpeta temporal con un servidor HTTP estático. No sirvas la raíz de este repositorio ni publiques `portfolio-material/`.

## Verificación

No requiere instalación ni proceso de compilación. Con Node disponible:

```bash
node --test tests/landing.test.mjs
node --check script.js
```

Las pruebas comprueban invariantes estáticos de contenido, enlaces y privacidad; no sustituyen una revisión visual en navegador ni una auditoría de accesibilidad.

## Publicación

La entrega pública solo necesita los archivos estáticos listados arriba y los recursos públicos aprobados. No incluye backend ni dependencias de ejecución.
