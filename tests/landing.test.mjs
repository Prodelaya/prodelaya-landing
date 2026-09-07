import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const html = read("index.html");
const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(
  (match) => match[1],
);

function publicFile(path) {
  const url = new URL(path, root);
  assert.ok(existsSync(url), `${path} debe existir`);
  return readFileSync(url, "utf8");
}

function caseHtml(id) {
  const match = html.match(
    new RegExp(`<article id="case-${id}"[\\s\\S]*?</article>`),
  );
  assert.ok(match, `falta el caso case-${id}`);
  return match[0];
}

test("presenta navegación, CV y contacto utilizables sin JavaScript", () => {
  assert.match(html, /<a class="skip-link" href="#contenido">/);
  assert.match(html, /<main id="contenido" tabindex="-1">/);
  assert.match(html, /<nav aria-label="Navegación principal">/);
  for (const href of ["#casos", "#trayectoria", "#como-trabajo", "#contacto"])
    assert.ok(hrefs.includes(href), `falta el ancla ${href}`);
  assert.match(html, /id="sobre-mi" class="anchor-alias"/);
  assert.match(html, /href="cv\.html"[^>]*>Ver CV</);
  assert.match(
    html,
    /href="assets\/cv-pablo-laya\.pdf"[^>]*download[^>]*>Descargar CV/,
  );
  assert.ok(hrefs.includes("mailto:proyectos.delaya@gmail.com"));
});

test("posiciona la landing en automatización, herramientas internas e IA aplicada", () => {
  const styles = publicFile("styles.css");
  assert.match(
    html,
    /Python · Automatización · Herramientas internas · IA aplicada/,
  );
  const normalized = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(
    normalized,
    /Construyo software para mejorar cómo trabajan los equipos\./,
  );
  assert.match(
    html,
    /<h1 id="hero-title">Construyo software para mejorar <span class="hero-title-accent">cómo trabajan los equipos\.<\/span><\/h1>/,
  );
  assert.match(
    html,
    /Problemas de trabajo antes que una lista de tecnologías\./,
  );
  assert.match(
    styles,
    /\.hero \{\s+padding-top: clamp\(4rem, 7vw, 6rem\);\s+padding-bottom: clamp\(4rem, 7vw, 6rem\);/,
  );
  assert.match(
    styles,
    /h1 \{\s+max-width: 20ch;[\s\S]*?font-size: clamp\(2\.5rem, 5\.2vw, 4\.75rem\);[\s\S]*?line-height: 1\.08;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 620px\) \{[\s\S]*?h1 \{\s+max-width: 100%;\s+font-size: clamp\(2\.25rem, 10vw, 2\.5rem\);\s+line-height: 1\.08;/,
  );
  assert.match(styles, /h1 \{[\s\S]*?color: var\(--text\);/);
  assert.match(
    styles,
    /\.hero-title-accent \{\s+color: var\(--pink-soft\);\s+\}/,
  );
  assert.doesNotMatch(
    styles,
    /@supports \(\(-webkit-background-clip: text\) or \(background-clip: text\)\) \{\s+h1/,
  );
  assert.match(
    styles,
    /@media \(max-width: 620px\) \{[\s\S]*?html \{\s+scroll-padding-top: 0;\s+\}[\s\S]*?\.section\[id\] \{\s+scroll-margin-top: 7rem;\s+\}/,
  );
  for (const title of [
    "Herramientas internas",
    "Automatización e integración",
    "Datos y trazabilidad",
    "IA aplicada",
  ])
    assert.match(html, new RegExp(`<h3>${title}</h3>`));
  assert.doesNotMatch(html, /Python · Odoo · IA aplicada/);
});

test("agrupa casos canónicos, evidencia y anclas estables", () => {
  const factual = JSON.parse(publicFile("data/cv.json"));
  const editorial = JSON.parse(publicFile("data/portfolio.json"));
  assert.deepEqual(
    factual.projects.map(({ id }) => id),
    [
      "mugi",
      "crm",
      "signature",
      "auto-reddit",
      "documents",
      "employee-operations",
      "private-data",
      "tests-daw",
      "f2p",
    ],
  );
  assert.deepEqual(editorial.primaryProjects, [
    "mugi",
    "crm",
    "signature",
    "auto-reddit",
  ]);
  assert.deepEqual(editorial.secondaryProjects, [
    "documents",
    "employee-operations",
    "private-data",
    "tests-daw",
  ]);
  assert.deepEqual(editorial.archiveProjects, ["f2p"]);
  assert.deepEqual(editorial.evidenceProjectIds, [
    "mugi",
    "crm",
    "tests-daw",
    "auto-reddit",
  ]);
  for (const id of factual.projects.map(({ id }) => id))
    assert.match(html, new RegExp(`id="case-${id}"`));
  for (const project of factual.projects.filter(({ metric }) => metric)) {
    const metricValue = project.metric.value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    assert.match(
      html,
      new RegExp(`href="#case-${project.id}"[\\s\\S]*?${metricValue}`),
    );
  }
  assert.match(
    html,
    /\+50\s*<span>usuarios acumulados<\/span>[\s\S]*?Práctica, examen, estadísticas, ranking y revisión de fallos\./i,
  );
  assert.match(
    html,
    /396\s*<span>tests pasando<\/span>[\s\S]*?Unitarios, integración operativa, CI e infraestructura\./i,
  );
  assert.match(
    html,
    /README público documenta el resultado del repositorio: 396 tests pasando y 4 skipped/i,
  );
  assert.match(html, /revisión humana/i);
  assert.match(html, /4\s*<span>proveedores implementados<\/span>/);
  assert.doesNotMatch(html, /211\s*preguntas|211\s*<span>/i);
  assert.match(html, /Adaptadores independientes y ejecuciones auditables\./);
});

test("mantiene los casos nuevos sin enlaces y el caso privado sin terminología de corpus o mercado", () => {
  const factual = JSON.parse(publicFile("data/cv.json"));
  const newCases = factual.projects.filter(({ id }) =>
    ["employee-operations", "private-data"].includes(id),
  );
  assert.equal(newCases.length, 2);
  for (const project of newCases) assert.deepEqual(project.links, []);
  assert.equal(newCases[0].privacy, "professional");
  assert.equal(newCases[0].title, "Automatización de operaciones de empleados");
  assert.equal(newCases[1].privacy, "private");
  assert.equal(newCases[1].title, "Sistemas cuantitativos y de datos");
  assert.equal(
    newCases[1].tech,
    "Python · pipelines de datos · deduplicación · trazabilidad",
  );
  assert.doesNotMatch(
    JSON.stringify(newCases[1]),
    /corpus|mercado|apuestas|capital|yield|proveedor|host|redis|asyncio/i,
  );
  for (const project of newCases)
    assert.doesNotMatch(caseHtml(project.id), /<a\b|https?:\/\//i);
});

test("destaca Mugiwara desde la configuración editorial sin desbalancear la cuadrícula", () => {
  const editorial = JSON.parse(publicFile("data/portfolio.json"));
  const styles = publicFile("styles.css");
  assert.deepEqual(editorial.featuredProjects, ["mugi"]);
  assert.match(
    caseHtml("mugi"),
    /<article id="case-mugi" class="case-card featured">/,
  );
  assert.doesNotMatch(styles, /\.case-card\.featured\s*\{[^}]*grid-row/);
});

test("publica el copy editorial acotado de los casos refinados", () => {
  const factual = JSON.parse(publicFile("data/cv.json"));
  const editorial = JSON.parse(publicFile("data/portfolio.json"));
  const project = (id) => factual.projects.find((item) => item.id === id);

  assert.match(
    editorial.hero.body,
    /Combino experiencia en operaciones y datos con desarrollo de software para conectar herramientas, automatizar procesos y reducir trabajo manual\./,
  );
  assert.equal(
    project("mugi").techGroups[1].value,
    "Linux · Docker · PostgreSQL · Redis · systemd · Tailscale",
  );
  assert.match(
    caseHtml("mugi"),
    /Diseñé la arquitectura, los roles, la memoria, los permisos y los límites de exposición; además opero los servicios, la persistencia, los health checks y la recuperación del sistema\./,
  );
  assert.match(caseHtml("mugi"), /La implementación está dirigida por IA;/);
  assert.equal(
    project("auto-reddit").category,
    "Proyecto académico y personal aplicado a un flujo real",
  );
  assert.match(
    caseHtml("employee-operations"),
    /Cuando falta un horario aplicable, el sistema utiliza una jornada de respaldo configurada, crea una actividad para revisión, conserva el historial y evita duplicar avisos al responsable\./,
  );
  assert.doesNotMatch(
    JSON.stringify(project("auto-reddit")),
    /t\.me|telegram\.me/i,
  );
});

test("limita los enlaces de los casos profesionales", () => {
  const professionalCards = [
    ...html.matchAll(
      /<article id="case-[^"]+" class="case-card professional">([\s\S]*?)<\/article>/g,
    ),
  ].map((match) => match[1]);
  assert.equal(professionalCards.length, 4);
  for (const card of professionalCards)
    assert.doesNotMatch(card, /<a\b|github\.com|<code\b/i);
  for (const href of hrefs.filter((href) => href.startsWith("https://"))) {
    const anchor = html.match(
      new RegExp(
        `<a\\b(?=[^>]*href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")[^>]*>`,
      ),
    );
    assert.match(
      anchor?.[0] ?? "",
      /target="_blank"[^>]*rel="noopener noreferrer"/,
    );
  }
});

test("solo inserta las visuales aprobadas con atributos seguros y diagrama profesional", () => {
  const manifest = JSON.parse(publicFile("data/public-assets.json"));
  const approved = manifest.assets.map(({ path }) => path).sort();
  assert.deepEqual(approved, [
    "assets/crm-pipeline.svg",
    "assets/mugiwara-panel.webp",
    "assets/tests-daw-practice.webp",
  ]);
  const images = [...html.matchAll(/<img\b([^>]+)>/g)].map((match) => match[1]);
  assert.equal(images.length, approved.length);
  for (const attributes of images) {
    const src = attributes.match(/\bsrc="([^"]+)"/)?.[1];
    assert.ok(approved.includes(src), `visual no aprobada: ${src}`);
    assert.match(attributes, /\balt="[^"]+"/);
    assert.match(attributes, /\bwidth="\d+"/);
    assert.match(attributes, /\bheight="\d+"/);
    assert.match(attributes, /\bloading="lazy"/);
    assert.match(attributes, /\bdecoding="async"/);
  }
  assert.match(caseHtml("mugi"), /assets\/mugiwara-panel\.webp/);
  assert.match(caseHtml("tests-daw"), /assets\/tests-daw-practice\.webp/);
  assert.match(caseHtml("crm"), /assets\/crm-pipeline\.svg/);
  for (const id of [
    "signature",
    "documents",
    "employee-operations",
    "private-data",
  ])
    assert.doesNotMatch(caseHtml(id), /<img\b/);
  for (const id of ["crm", "signature", "documents", "employee-operations"]) {
    const card = caseHtml(id);
    if (id === "crm") assert.match(card, /assets\/crm-pipeline\.svg/);
    else assert.doesNotMatch(card, /<img\b/);
  }
  assert.match(
    html,
    /Recorte de una captura pública del panel privado de Mugiwara\./,
  );
  assert.match(
    html,
    /Modo práctica con respuesta y explicación; recorte de una captura publicada\./,
  );
  assert.match(
    html,
    /Esquema conceptual del flujo, sin datos ni infraestructura del proyecto\./,
  );
});

test("deriva la trayectoria y el correo público desde las fuentes compartidas", () => {
  const data = JSON.parse(publicFile("data/cv.json"));
  const script = publicFile("script.js");
  for (const item of [...data.experience, ...data.education])
    assert.ok(html.includes(item.dates), item.dates);
  assert.match(html, /2026 · finalizado/);
  assert.doesNotMatch(html, /2025 · finalizado/);
  assert.match(html, /Cómo trabajo/);
  assert.match(script, /\[data-email\]|mailto:/);
  assert.doesNotMatch(script, /proyectos\.delaya@gmail\.com/);
});

test("no filtra material privado ni afirmaciones no aprobadas", () => {
  const publicDocuments = [
    html,
    publicFile("cv.html"),
    publicFile("data/cv.json"),
    publicFile("data/portfolio.json"),
    publicFile("data/public-assets.json"),
  ];
  for (const document of publicDocuments) {
    assert.doesNotMatch(
      document,
      /\+34|\bDNI\s*[:.]?\s*\d|fecha de nacimiento/i,
    );
    assert.doesNotMatch(
      document,
      /portfolio-material|\.analysis|drive\.google/i,
    );
    assert.doesNotMatch(
      document,
      /salida en septiembre de 2027|disponibilidad inmediata/i,
    );
    assert.doesNotMatch(document, /autopublicación|autopublish|NO-GO|\bOCR\b/i);
  }
  assert.doesNotMatch(html, /eIDAS|versionado avanzado|portales públicos/i);
});

test("no fuerza un ancho de 320px en cuerpos móviles más estrechos", () => {
  const styles = publicFile("styles.css");
  const cvStyles = publicFile("cv.css");
  assert.doesNotMatch(styles, /(?:^|\n)body\s*\{[^}]*\bmin-width:\s*320px;/);
  assert.doesNotMatch(
    cvStyles,
    /(?:^|\n)\.cv-body\s*\{[^}]*\bmin-width:\s*320px;/,
  );
});
