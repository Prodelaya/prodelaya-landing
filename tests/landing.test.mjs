import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

test("presenta navegación, CV y contacto utilizables sin JavaScript", () => {
  assert.match(html, /<a class="skip-link" href="#contenido">/);
  assert.match(html, /<nav aria-label="Navegación principal">/);
  for (const href of ["#casos", "#trayectoria", "#sobre-mi", "#contacto"]) {
    assert.ok(hrefs.includes(href), `falta el ancla ${href}`);
  }
  assert.match(html, /href="cv\.html"[^>]*>Ver CV</);
  assert.match(
    html,
    /href="assets\/cv-pablo-laya\.pdf"[^>]*download[^>]*>Descargar CV/,
  );
  assert.ok(hrefs.includes("mailto:proyectos.delaya@gmail.com"));
});

test("el héroe es personal y no conserva una vista de sistema", () => {
  assert.match(html, /Soy Pablo Laya, desarrollador de software\./);
  assert.match(
    html,
    /En Halltic trabajo en módulos de Odoo, integraciones y automatización/,
  );
  assert.doesNotMatch(
    html,
    /system-preview|preview-topbar|role-list|vista de sistema/i,
  );
  assert.doesNotMatch(html, /Software para automatizar trabajo real\./);
});

test("muestra proyectos públicos, casos profesionales y demos independientes", () => {
  assert.match(html, /Creé Mugiwara/);
  assert.match(html, /dirijo su desarrollo con ayuda de IA/);
  assert.match(html, /Firma de documentos con DNIe/);
  assert.match(html, /Firma digital para RR\. HH\./);
  assert.match(html, /AutoFirma/);
  assert.match(html, /PAdES/);
  assert.match(html, /clave privada.*dispositivo de la persona/s);

  const pairs = [
    [
      "https://github.com/Prodelaya/proyecto-daw-tests",
      "https://tests-daw.prodelaya.dev/",
    ],
    [
      "https://github.com/Prodelaya/Proyecto-DAW-Juegos-F2P",
      "https://f2p.prodelaya.dev/",
    ],
  ];
  for (const [repo, demo] of pairs) {
    assert.ok(hrefs.includes(repo));
    assert.ok(hrefs.includes(demo));
  }
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

test("separa la gestión documental del CRM en casos profesionales concretos", () => {
  const professionalCards = [
    ...html.matchAll(
      /<article class="case-card professional">([\s\S]*?)<\/article>/g,
    ),
  ].map((match) => match[1]);
  assert.equal(professionalCards.length, 3);
  for (const title of [
    "Firma de documentos con DNIe",
    "Gestión documental por proyecto",
    "Integración de fuentes con el CRM",
  ]) {
    assert.match(html, new RegExp(title));
  }
  assert.doesNotMatch(html, /HubCRM/);
});

test("incluye una trayectoria de trabajo y formación con fechas confirmadas", () => {
  assert.match(html, /<section[^>]+id="trayectoria"/);
  assert.match(html, /<ol[^>]*reversed/);
  for (const value of [
    "Halltic Tech S.L.",
    "Prácticas de desarrollo de software.",
    "julio 2026–actualidad",
    "febrero–mayo 2026",
    "Sports Stats Solutions S.L.",
    "junio 2019–octubre 2025",
    "DAW · Jobie FP",
    "2024–2026 · finalizado",
    "DAM · Jobie FP",
    "en curso",
    "Máster en Desarrollo con IA · Big School",
    "2025 · finalizado",
  ]) {
    assert.match(
      html,
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }
});

test("genera un CV público coherente desde datos sanitizados", () => {
  const data = JSON.parse(publicFile("data/cv.json"));
  const cvHtml = publicFile("cv.html");
  const cvCss = publicFile("cv.css");
  assert.equal(data.profile.email, "proyectos.delaya@gmail.com");
  assert.match(cvHtml, /Experiencia profesional/);
  assert.match(cvHtml, /Formación/);
  assert.match(cvHtml, /Competencias/);
  assert.match(cvHtml, /Proyectos/);
  assert.match(cvCss, /@media print/);
  for (const item of [...data.experience, ...data.education]) {
    assert.ok(cvHtml.includes(item.organization), item.organization);
  }
  assert.doesNotMatch(cvHtml, /título en trámite|TFM|pendiente/i);
});

test("el CV web ofrece el PDF descargable y el PDF muestra la URL de LinkedIn", () => {
  const data = JSON.parse(publicFile("data/cv.json"));
  const cvHtml = publicFile("cv.html");
  const cvCss = publicFile("cv.css");
  const pdf = new URL("assets/cv-pablo-laya.pdf", root);
  const linkedInUrl = decodeURI(data.profile.linkedin);

  assert.match(
    cvHtml,
    /<a[^>]+href="assets\/cv-pablo-laya\.pdf"[^>]+\bdownload\b[^>]*>/,
  );
  assert.match(cvHtml, /Descargar CV/);
  assert.match(cvHtml, /href="cv\.css"/);
  assert.match(cvCss, /@media print/);
  const text = execFileSync("pdftotext", ["-layout", pdf.pathname, "-"], {
    encoding: "utf8",
  });
  assert.ok(
    text.includes(linkedInUrl),
    `falta la URL de LinkedIn: ${linkedInUrl}`,
  );
});

test("el PDF del CV es un A4 textual y contiene datos públicos actuales", () => {
  const pdf = new URL("assets/cv-pablo-laya.pdf", root);
  assert.ok(existsSync(pdf), "el PDF del CV debe existir");
  assert.match(readFileSync(pdf).subarray(0, 8).toString("ascii"), /^%PDF-/);
  const info = execFileSync("pdfinfo", [pdf.pathname], { encoding: "utf8" });
  const text = execFileSync("pdftotext", ["-layout", pdf.pathname, "-"], {
    encoding: "utf8",
  });
  assert.match(info, /Pages:\s+1/);
  for (const value of [
    "Experiencia profesional",
    "Formación",
    "Competencias",
    "Sports Stats Solutions S.L.",
    "Halltic Tech S.L.",
    "Máster en Desarrollo con IA",
  ]) {
    assert.match(text, new RegExp(value, "i"));
  }
  assert.doesNotMatch(text, /título en trámite|TFM|pendiente/i);
});

test("no filtra material privado, contactos descartados ni casos internos", () => {
  const prohibited = [
    "portfolio-material",
    ".analysis",
    "Estudiante de",
    "autopublicación",
    "autopublish",
    "NO-GO",
    "chatbot",
    "RAG",
    "CV actualizado disponible bajo solicitud",
  ];
  for (const value of prohibited) {
    assert.doesNotMatch(html, new RegExp(value, "i"));
  }
  const cv = publicFile("cv.html");
  const data = publicFile("data/cv.json");
  for (const publicDocument of [html, cv, data]) {
    assert.doesNotMatch(
      publicDocument,
      /\+34|\bDNI\s*[:.]?\s*\d|fecha de nacimiento/i,
    );
    assert.doesNotMatch(
      publicDocument,
      /portfolio-material|\.analysis|drive\.google/i,
    );
  }
  assert.doesNotMatch(html, /<img\b/i);
  const professionalCards = [
    ...html.matchAll(
      /<article class="case-card professional">([\s\S]*?)<\/article>/g,
    ),
  ].map((match) => match[1]);
  assert.equal(professionalCards.length, 3);
  for (const card of professionalCards) {
    assert.doesNotMatch(card, /<a\b|github\.com|<code\b/i);
  }
  assert.deepEqual(
    hrefs.filter((href) =>
      /portfolio-material|\.analysis|drive\.google/i.test(href),
    ),
    [],
  );
});
