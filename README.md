# Portfolio de Pablo Laya

Landing estática y CV público en español. Incluye proyectos propios, una trayectoria resumida y un CV web/PDF preparado para lectura automática y humana.

## Vista local segura

Sirve únicamente esta lista de archivos públicos; no publiques la raíz del repositorio ni `portfolio-material/`:

- `index.html`
- `styles.css`
- `script.js`
- `cv.html`
- `cv.css`
- `assets/favicon-16.png`
- `assets/cv-pablo-laya.pdf`

## Actualizar el CV

`data/cv.json` es la fuente pública sanitizada del CV. El generador usa solo la biblioteca estándar de Python y escribe exclusivamente `cv.html` y `assets/cv-pablo-laya.pdf`:

```bash
python3 -I -B scripts/build_cv.py
```

El PDF usa texto seleccionable y una estructura convencional de una columna para facilitar su lectura por sistemas ATS; no garantiza el resultado de ningún sistema de selección concreto.

## Verificación

```bash
python3 -I -B scripts/build_cv.py
node --test tests/landing.test.mjs
node --check script.js
pdfinfo assets/cv-pablo-laya.pdf
pdftotext -layout assets/cv-pablo-laya.pdf -
```

Las pruebas comprueban contenido público, enlaces, privacidad y el PDF textual. No sustituyen una revisión visual ni una auditoría completa de accesibilidad.

## Publicación

El despliegue debe excluir por completo `portfolio-material/` y cualquier material de trabajo privado. No hay backend ni dependencias de ejecución.
