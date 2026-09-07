import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(
  (match) => match[1],
);

const roleNames = [
  "Luffy",
  "Franky",
  "Robin",
  "Sanji",
  "Zoro",
  "Chopper",
  "Nami",
  "Jinbe",
  "Usopp",
  "Brook",
];

test("presenta una estructura navegable y contacto utilizable sin JavaScript", () => {
  assert.match(html, /<a class="skip-link" href="#contenido">/);
  assert.match(html, /<header[\s>]/);
  assert.match(html, /<nav aria-label="Navegación principal">/);
  assert.deepEqual(
    ["#casos", "#capacidades", "#sobre-mi", "#contacto"].map((href) =>
      hrefs.includes(href),
    ),
    [true, true, true, true],
  );
  assert.match(html, /<main id="contenido">/);
  assert.ok(hrefs.includes("mailto:proyectos.delaya@gmail.com"));
});

test("publica los casos y enlaces públicos aprobados", () => {
  assert.match(html, /Software para automatizar trabajo real\./);
  const expectedPublicHrefs = [
    "https://github.com/asistentes-mugiwara/mugiwara-control-panel",
    "https://github.com/asistentes-mugiwara/mugiwara-no-hermes",
    "https://github.com/Prodelaya/auto-reddit",
    "https://github.com/Prodelaya/proyecto-daw-tests",
    "https://github.com/Prodelaya/Proyecto-DAW-Juegos-F2P",
    "https://github.com/Prodelaya",
    "https://github.com/asistentes-mugiwara",
    "https://www.linkedin.com/in/pablo-laya-bol%C3%ADvar/",
  ];

  assert.deepEqual(
    expectedPublicHrefs.map((href) => hrefs.includes(href)),
    Array(expectedPublicHrefs.length).fill(true),
  );
  assert.match(
    html,
    /Concebí y diseñé Mugiwara y dirigí su implementación asistida por IA/,
  );
});

test("describe Mugiwara como recreación sintética con diez roles", () => {
  assert.match(html, /Recreación ilustrativa · datos ficticios/);
  assert.match(html, /10 perfiles/);
  for (const name of roleNames) {
    assert.match(html, new RegExp(`<strong>${name}</strong>`));
  }
  assert.match(html, /El panel es de lectura/);
  assert.match(html, /no muestra Honcho en vivo/);
});

test("no filtra material privado ni conserva afirmaciones descartadas", () => {
  const prohibited = [
    "portfolio-material",
    ".analysis",
    "assets/cv-pablo-laya.pdf",
    "Estudiante de",
    "© 2025",
    "2025 Pablo Laya",
    "autopublicación",
    "autopublish",
    "NO-GO",
    "chatbot",
    "RAG",
  ];

  for (const value of prohibited) {
    assert.doesNotMatch(
      html,
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }

  assert.deepEqual(
    hrefs.filter((href) =>
      /portfolio-material|\.analysis|drive\.google|cv-pablo/i.test(href),
    ),
    [],
  );
  assert.doesNotMatch(html, /\b(?:181|396|250|512)\b/);
});
