# Portfolio de Pablo Laya

Portfolio estático y CV público en español de Pablo Laya, orientado a automatización, herramientas internas, datos e IA aplicada. Los HTML, el PDF, la tarjeta social y las cabeceras se generan desde los datos públicos para poder desplegarse sin una aplicación en ejecución.

## Actualizar y generar

1. Edita `data/cv.json` para identidad, URLs, experiencia, formación, competencias y proyectos canónicos.
2. Edita `data/portfolio.json` solo para orden y redacción editorial de la landing.
3. Genera los resultados públicos:

```bash
python3 -I -B scripts/build_cv.py
```

El generador necesita Python 3 y `rsvg-convert` para rasterizar la tarjeta social PNG; no instala nada y falla con un mensaje claro si falta el conversor. Regenera `index.html`, `cv.html`, `assets/cv-pablo-laya.pdf`, `assets/social-card.svg`, `assets/social-card-1200x630.png`, `robots.txt`, `sitemap.xml` y `_headers`. No edites esos resultados a mano. El PDF sigue siendo un A4 de una página, con texto seleccionable y enlaces URI.

## Archivos que se pueden publicar

Para despliegue o vista previa sirve solamente esta lista pública:

- `index.html`, `styles.css`, `script.js`, `cv.html`, `cv.css`
- `assets/favicon-16.png`, `assets/cv-pablo-laya.pdf`
- Las tres visuales de casos: `assets/mugiwara-panel.webp`, `assets/tests-daw-practice.webp`, `assets/crm-pipeline.svg`
- `assets/social-card.svg`, `assets/social-card-1200x630.png`
- `robots.txt`, `sitemap.xml`, `_headers`

No se debe servir la raíz completa. `portfolio-material/` entero es privado y queda excluido; `data/`, `scripts/`, `templates/` y `tests/` tampoco son necesarios para servir el sitio. `data/public-assets.json` mantiene la lista blanca de las tres visuales de casos; la tarjeta social no es una visual de caso.

## URLs y cabeceras de producción

La canonical de la landing es `https://prodelaya.dev/` y la del CV es `https://prodelaya.dev/cv`. Se conserva `cv.html` y enlaces locales a ese archivo para previsualización, pero el hosting debe ofrecer la ruta limpia `/cv`. `_headers` contiene CSP con hashes de los JSON-LD generados y cabeceras de seguridad para hosting estático; solo tiene efecto al desplegarse en un proveedor que admita ese archivo.

`www.prodelaya.dev` requiere una regla de redirección de dominio en la zona de Cloudflare, fuera de este repositorio: condición `http.host eq "www.prodelaya.dev"`, destino `https://prodelaya.dev/$1` preservando ruta y consulta. No se incluye `_redirects`, porque las redirecciones por ruta de Pages no resuelven de forma segura ese caso de dominio.

## Luffy Hermes: páginas informativas

Fuentes: `templates/luffy-hermes.html.tmpl` y `templates/luffy-hermes-privacidad.html.tmpl`; enlace del caso Mugiwara en `data/portfolio.json`. El mismo generador produce `luffy-hermes/index.html` y `luffy-hermes/privacidad/index.html`, con canonical `https://prodelaya.dev/luffy-hermes/` y `https://prodelaya.dev/luffy-hermes/privacidad/`. El sitemap contiene esas rutas. En Pages, los directorios con `index.html` conservan la barra final.

Las páginas describen una aplicación personal sin registro público ni conexión de cuentas desde esta web. No declaran aprobación de Google ni cumplimiento certificado, ni cambian el modo OAuth Testing. La información de privacidad distingue las capacidades compartidas de la aplicación del seguimiento de Gmail de solo lectura, y explica el tratamiento externo, memoria, conservación por capas y contacto manual.

La lista de publicación anterior se amplía únicamente con:
- `luffy-hermes/index.html`
- `luffy-hermes/privacidad/index.html`

`scripts/public_site.py` mantiene la allowlist ejecutable completa. Exporta a un directorio nuevo; no copia la raíz, fuentes ni documentos privados. También ofrece vista previa local restringida, con las rutas canónicas y las cabeceras universales de `_headers` (no es un emulador completo de Pages ni un comando de despliegue):

```bash
python3 -I -B scripts/build_cv.py
python3 -I -B scripts/public_site.py --output .git/oauth-preparation/public-preview --serve --port 8000
```

La vista previa escucha solo en `127.0.0.1`; se detiene con Ctrl+C. El directorio de salida debe ser nuevo. No uses `python -m http.server` en la raíz del repositorio. El despliegue debe tomar solo el directorio exportado, incluido `_headers`, nunca la raíz. Este script no configura el hosting ni activa un despliegue; la configuración source/build/output de Pages y el commit desplegado deben verificarse por separado.

### Publicación automática GitHub → Cloudflare Pages

`wrangler.toml` fija `pages_build_output_dir = "./public"` para el proyecto existente `prodelaya-landing`. La salida se hereda en producción y previews, sin overrides de entorno. `public/` está versionado y contiene exclusivamente los 17 archivos de `PUBLIC_FILES`, copiados byte a byte con `scripts/public_site.py`; no necesita generar PDF/PNG ni ejecutar un build remoto. Fuentes, README, datos, tests y configuración quedan fuera del payload.

Después de actualizar los resultados públicos, exporta a un directorio nuevo y reemplaza únicamente la copia anterior de `public/` con esa exportación revisada. Para la primera exportación (cuando `public/` no existe):

```bash
python3 -I -B scripts/public_site.py --output public
python3 -I -B -m unittest discover -s tests -p 'test_pages_payload.py' -v
```

Las pruebas exigen la allowlist exacta, ausencia de symlinks y paridad binaria con los resultados públicos originales. Incluye la copia actualizada de `public/` en el mismo commit que sus fuentes. No copies la raíz ni informes/caches/material privado.

[Cloudflare documenta](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) la adopción de Wrangler mediante un nuevo despliegue de Git integration (build system V2 o posterior). Este archivo selecciona la salida; NO configura el build command ni los controles de ramas del panel. El payload preconstruido evita depender de un nuevo comando en ese panel. No se añaden Functions, bindings, variables, fechas de compatibilidad ni servicios. Comprueba el check de Pages del SHA, la URL de preview y después ambas canonical de producción: un 200 de fallback no acredita publicación. El merge normal a la rama de producción activa la integración existente; no hace falta un despliegue manual. Los despliegues históricos de otras revisiones no se reescriben.

Las dos páginas nuevas reutilizan `cv.css` sin modificarlo, no cargan fuentes externas ni scripts y no requieren relajar la CSP. La allowlist del fixture incluye sus plantillas y resultados para comprobar regeneración sin escribir en el checkout. Las pruebas HTTP verifican assets, fragmentos, redirects, cabeceras, rutas desconocidas, ausencia de listado y rechazo de enlaces simbólicos.

## Enlaces públicos

```bash
python3 -I -B scripts/check_links.py --list
python3 -I -B scripts/check_links.py
```

`--list` es offline y muestra las URL normalizadas. La comprobación normal usa solo GET sin autenticación, con límite de URL, tiempo de espera y un reintento acotado para red/5xx. Un `403`, `429` o `999` queda como bloqueado o indeterminado: no significa que el enlace esté roto ni se intenta eludir su protección.

El workflow `link-check.yml` se ejecuta semanalmente y de forma manual en la rama predeterminada. La comprobación local normal solo hace GET sin autenticación a la lista pública; no ejecuta workflows remotos ni despliegues.

## Verificación

```bash
python3 -I -B scripts/build_cv.py
node --test tests/*.test.mjs
python3 -I -B -m unittest discover -s tests -p 'test_*.py'
node --check script.js
pdfinfo assets/cv-pablo-laya.pdf
pdftotext -layout assets/cv-pablo-laya.pdf -
```

Las pruebas del PDF requieren Poppler (`pdfinfo` y `pdftotext`). Las pruebas que ejecutan el generador usan un directorio temporal único bajo `TMPDIR` (o el temporal del sistema), copian solo sus entradas públicas permitidas y comparan sus resultados con los publicados; no escriben en el checkout. Cubren determinismo, metadatos SEO, JSON-LD, hashes CSP, tarjeta social y el comprobador de enlaces con mocks; no sustituyen una revisión visual ni un despliegue real.
