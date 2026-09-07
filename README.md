# Portfolio de Pablo Laya

Landing estática y CV público en español. Los HTML, el PDF, la tarjeta social y las cabeceras se generan desde los datos públicos para poder desplegarse sin una aplicación en ejecución.

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
