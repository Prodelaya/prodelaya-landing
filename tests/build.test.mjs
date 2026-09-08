import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFixtureOutputsMatchPublished,
  fixturePath,
  readFixture,
  runBuild,
  withBuildFixture,
} from "./helpers/build-fixture.mjs";

const root = new URL("../", import.meta.url);
const path = (value) => new URL(value, root).pathname;
const read = (value) => readFileSync(path(value), "utf8");
const sha256 = (value) =>
  createHash("sha256")
    .update(readFileSync(path(value)))
    .digest("hex");

test("resuelve los datos compartidos del perfil en ambos HTML sin escribir JSON", () => {
  const program = String.raw`
import copy
import json
import runpy
from pathlib import Path

module = runpy.run_path("scripts/build_cv.py")
cv_data = json.loads(Path("data/cv.json").read_text(encoding="utf-8"))
portfolio = json.loads(Path("data/portfolio.json").read_text(encoding="utf-8"))
changed = copy.deepcopy(cv_data)
changed["profile"].update({
    "name": "Ada & Co",
    "role": "Ingeniera de datos",
    "location": "València & Remota",
    "email": "ada@example.test",
})
print(json.dumps({
    "index": module["build_index"](changed, portfolio),
    "cv": module["build_cv_html"](changed, portfolio),
}))
`;
  withBuildFixture((fixture) => {
    const output = execFileSync("python3", ["-I", "-B", "-c", program], {
      cwd: fixture,
      encoding: "utf8",
    });
    const generated = JSON.parse(output);

    for (const document of [generated.index, generated.cv]) {
      assert.match(document, /Ada &amp; Co/);
      assert.match(document, /ada@example\.test/);
      assert.match(document, /València &amp; Remota/);
      assert.doesNotMatch(document, /Pablo Laya|Madrid, España/);
    }
    assert.match(
      generated.index,
      /Soy Ada &amp; Co, ingeniera de datos en València &amp; Remota\./,
    );
  });
});

test("genera landing y CV desde contenido compartido, sin marcadores pendientes", () => {
  assert.ok(
    existsSync(path("data/portfolio.json")),
    "falta el contenido editorial",
  );
  assert.ok(
    existsSync(path("templates/index.html.tmpl")),
    "falta la plantilla de landing",
  );
  withBuildFixture((fixture) => {
    runBuild(fixture);
    assertFixtureOutputsMatchPublished(fixture);
    const index = readFixture(fixture, "index.html");
    const cv = readFixture(fixture, "cv.html");
    const factual = JSON.parse(read("data/cv.json"));
    const editorial = JSON.parse(read("data/portfolio.json"));

    assert.equal(factual.profile.role, "Desarrollador de software");
    assert.equal(
      factual.profile.specialty,
      "Automatización, herramientas internas e IA aplicada",
    );
    assert.match(
      factual.profile.summary,
      /experiencia previa en operaciones y datos/i,
    );
    assert.doesNotMatch(factual.profile.summary, /junior|senior|seis años/i);
    assert.equal(factual.education[0].dates, "2026 · finalizado");
    assert.equal(factual.education[1].dates, "2024–2026 · finalizado");
    assert.deepEqual(factual.languages, [
      "Español nativo",
      "Inglés: B2 lectura y escritura; B1 oral (autoevaluación)",
    ]);
    assert.deepEqual(
      editorial.capabilities.map(({ title }) => title),
      [
        "Herramientas internas",
        "Automatización e integración",
        "Datos y trazabilidad",
        "IA aplicada",
      ],
    );
    assert.equal(editorial.method.length, 6);
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
    assert.deepEqual(editorial.cvProjectIds, [
      "auto-reddit",
      "mugi",
      "tests-daw",
    ]);
    assert.deepEqual(editorial.evidenceProjectIds, [
      "mugi",
      "crm",
      "tests-daw",
      "auto-reddit",
    ]);
    assert.doesNotMatch(
      cv,
      /Automatización de operaciones de empleados|Sistemas cuantitativos y de datos/,
    );
    for (const output of [index, cv]) assert.doesNotMatch(output, /{{[^}]+}}/);
    const normalizedIndex = index.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.match(
      normalizedIndex,
      /Construyo software para mejorar cómo trabajan los equipos\./,
    );
    assert.match(index, /Hechos concretos, con contexto\./);
    assert.match(
      index,
      /href="#case-tests-daw"[\s\S]*?\+50\s*<span>usuarios acumulados<\/span>/,
    );
    assert.match(index, /Cómo trabajo/);
    assert.match(index, /2026 · finalizado/);
    assert.doesNotMatch(index, /2025 · finalizado/);
    assert.doesNotMatch(index, /Soy Pablo Laya, desarrollador de software\./);
    assert.match(
      cv,
      /<div class="cv-content-grid">[\s\S]*<section class="cv-experience"[\s\S]*<aside class="cv-side-column"/,
    );
    const normalizedCvCss = read("cv.css").replace(/\s+/g, " ");
    assert.match(
      normalizedCvCss,
      /\.cv-content-grid \{ display: grid; grid-template-columns: minmax\(0, 1\.6fr\) minmax\(15rem, 1fr\);/,
    );
    assert.match(
      normalizedCvCss,
      /@media \(max-width: 700px\) \{[\s\S]*\.cv-content-grid, \.cv-projects \{ grid-template-columns: 1fr;/,
    );
    assert.match(
      normalizedCvCss,
      /@media print \{[\s\S]*\.cv-content-grid, \.cv-projects \{ display: block;/,
    );
  });
});

test("el PDF de una página conserva enlaces URI reales y contenido ajustado", () => {
  withBuildFixture((fixture) => {
    runBuild(fixture);
    assertFixtureOutputsMatchPublished(fixture);
    const pdfPath = fixturePath(fixture, "assets/cv-pablo-laya.pdf");
    const pdf = readFileSync(pdfPath);
    const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
    });
    const source = pdf.toString("latin1");

    assert.match(info, /Pages:\s+1/);
    assert.match(info, /Page size:\s+595 x 842 pts \(A4\)/);
    assert.match(text, /Desarrollador de software/);
        assert.match(text, /Automatización, herramientas internas e IA aplicada/);
        assert.match(text, /Español nativo/);
        assert.match(text, /autoevaluación/i);
        assert.match(
          text.replace(/\s+/g, " "),
          /Arquitectura y operación en Linux de una plataforma multiagente, desarrollada mediante un flujo intensivo de IA bajo criterios y controles propios\./,
        );
        assert.doesNotMatch(
          text,
          /implementación (?:está )?dirigida por IA/i,
        );
        for (const uri of [
      "mailto:proyectos.delaya@gmail.com",
      "https://prodelaya.dev",
      "https://github.com/Prodelaya",
      "https://linkedin.com/in/pablo-laya-bol%C3%ADvar",
    ]) {
      assert.match(
        source,
        new RegExp(
          `/Subtype /Link[\\s\\S]*?/S /URI /URI \\(${uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
        ),
      );
    }
    const linkRects = [
      ...source.matchAll(/\/Rect \[([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)\]/g),
    ];
    assert.equal(linkRects.length, 4);
    for (const match of linkRects) {
      const [left, bottom, right, top] = match.slice(1).map(Number);
      assert.ok(
        left >= 0 &&
          right <= 595 &&
          bottom >= 0 &&
          top <= 842 &&
          right > left &&
          top > bottom,
      );
    }
    assert.doesNotMatch(source, /\/JavaScript|\/Launch/);
    const fontSizeFor = (value) =>
      Number(
        source.match(
          new RegExp(
            `/F[12] ([\\d.]+) Tf [\\d. ]+ rg [\\d.]+ [\\d.]+ Td \\(${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\) Tj`,
          ),
        )?.[1],
      );
    for (const bodyText of [
      "Desarrollador de software",
      "Español nativo",
      "Linux · Next.js · FastAPI · Tailscale",
    ])
      assert.ok(
        fontSizeFor(bodyText) >= 10,
        `${bodyText} debe usar al menos 10 pt`,
      );
    assert.equal(fontSizeFor("proyectos.delaya@gmail.com"), 9);
    assert.doesNotMatch(
      text,
      /Linux · Hermes · Telegram · Engram · Honcho · Vault/,
    );
  });
});

test("coloca cada regla del PDF bajo su encabezado, sin tocar el siguiente texto", () => {
  withBuildFixture((fixture) => {
    runBuild(fixture);
    const content = readFixture(fixture, "assets/cv-pablo-laya.pdf", "latin1");
    const sectionPattern =
      /q 0\.67 0\.10 0\.42 RG 0\.8 w 48 ([\d.]+) m 547 \1 l S Q\nBT \/F2 10 Tf 0\.42 0\.06 0\.27 rg 48\.0 ([\d.]+) Td \(([^)]+)\) Tj ET\n/g;
    const sections = [...content.matchAll(sectionPattern)];
    assert.deepEqual(
      sections.map((match) => match[3]),
      [
        "PERFIL",
        "EXPERIENCIA PROFESIONAL",
        "COMPETENCIAS",
        "IDIOMAS",
        "FORMACIÓN",
        "PROYECTOS SELECCIONADOS",
      ],
    );
    for (const section of sections) {
      const ruleY = Number(section[1]);
      const headingY = Number(section[2]);
      const next = content
        .slice(section.index + section[0].length)
        .match(/BT \/F[12] [\d.]+ Tf [\d. ]+ rg 48\.0 ([\d.]+) Td \(/);
      assert.ok(
        ruleY <= headingY - 3 && ruleY >= headingY - 5,
        `${section[3]}: la regla debe quedar 3–5 pt bajo la línea base`,
      );
      assert.ok(
        next && ruleY - Number(next[1]) >= 8,
        `${section[3]}: falta separación entre la regla y el texto siguiente`,
      );
    }
  });
});

test("la evidencia se deriva de los hechos canónicos de cada proyecto", () => {
  const program = String.raw`
import copy
import json
import runpy
from pathlib import Path
module = runpy.run_path("scripts/build_cv.py")
cv = json.loads(Path("data/cv.json").read_text(encoding="utf-8"))
portfolio = json.loads(Path("data/portfolio.json").read_text(encoding="utf-8"))
assets = json.loads(Path("data/public-assets.json").read_text(encoding="utf-8"))
changed = copy.deepcopy(cv)
next(project for project in changed["projects"] if project["id"] == "tests-daw")["metric"]["value"] = "+51"
print(module["build_index"](changed, portfolio, assets))
`;
  withBuildFixture((fixture) => {
    const generated = execFileSync("python3", ["-I", "-B", "-c", program], {
      cwd: fixture,
      encoding: "utf8",
    });
    assert.match(generated, /\+51\s*<span>usuarios acumulados<\/span>/);
    assert.doesNotMatch(generated, /\+50\s*<span>usuarios acumulados<\/span>/);
  });
});

test("escapa el énfasis editorial del titular antes de insertar el marcado", () => {
  const program = String.raw`
import copy
import json
import runpy
from pathlib import Path
module = runpy.run_path("scripts/build_cv.py")
cv = json.loads(Path("data/cv.json").read_text(encoding="utf-8"))
portfolio = json.loads(Path("data/portfolio.json").read_text(encoding="utf-8"))
assets = json.loads(Path("data/public-assets.json").read_text(encoding="utf-8"))
changed = copy.deepcopy(portfolio)
changed["hero"]["titleLead"] = "Construyo <software"
changed["hero"]["titleEmphasis"] = "cómo & trabajan"
print(module["build_index"](cv, changed, assets))
`;
  withBuildFixture((fixture) => {
    const generated = execFileSync("python3", ["-I", "-B", "-c", program], {
      cwd: fixture,
      encoding: "utf8",
    });
    assert.match(
      generated,
      /<h1 id="hero-title">Construyo &lt;software <span class="hero-title-accent">cómo &amp; trabajan<\/span><\/h1>/,
    );
    assert.doesNotMatch(generated, /Construyo <software|cómo & trabajan/);
  });
});

test("el manifiesto público comprueba dimensiones, huellas y SVG autocontenido", () => {
  const manifest = JSON.parse(read("data/public-assets.json"));
  assert.deepEqual(
    manifest.assets.map(({ path: assetPath }) => assetPath),
    [
      "assets/mugiwara-panel.webp",
      "assets/tests-daw-practice.webp",
      "assets/crm-pipeline.svg",
    ],
  );
  for (const asset of manifest.assets) {
    assert.ok(existsSync(path(asset.path)), `${asset.path} debe existir`);
    assert.equal(
      sha256(asset.path),
      asset.sha256,
      `${asset.path} debe conservar su SHA-256`,
    );
    const dimensions = execFileSync(
      "magick",
      ["identify", "-format", "%w %h", path(asset.path)],
      { encoding: "utf8" },
    ).trim();
    assert.equal(dimensions, `${asset.width} ${asset.height}`);
  }
  for (const asset of manifest.assets.filter(
    ({ kind }) => kind === "screenshot",
  )) {
    assert.match(asset.sourceUrl, /^https:\/\/raw\.githubusercontent\.com\//);
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
    assert.match(
      asset.transform,
      /Crop .*resize to 1200px wide.*metadata stripped/i,
    );
  }
  const svg = read("assets/crm-pipeline.svg");
  assert.match(svg, /<title[\s>]/i);
  assert.match(svg, /<desc[\s>]/i);
  assert.doesNotMatch(svg, /<(?:script|image|use|foreignObject)\b/i);
  assert.doesNotMatch(svg, /\b(?:href|src)=/i);
  assert.doesNotMatch(svg, /@font-face|url\(/i);
});

test("la generación es determinista y no altera los resultados publicados", () => {
  const generated = [
    "index.html",
    "cv.html",
    "assets/cv-pablo-laya.pdf",
    "assets/social-card.svg",
    "assets/social-card-1200x630.png",
    "_headers",
    "robots.txt",
    "sitemap.xml",
  ];
  withBuildFixture((fixture) => {
    runBuild(fixture);
    const first = generated.map((value) =>
      createHash("sha256")
        .update(readFileSync(fixturePath(fixture, value)))
        .digest("hex"),
    );
    assertFixtureOutputsMatchPublished(fixture);
    runBuild(fixture);
    assert.deepEqual(
      generated.map((value) =>
        createHash("sha256")
          .update(readFileSync(fixturePath(fixture, value)))
          .digest("hex"),
      ),
      first,
    );
    assertFixtureOutputsMatchPublished(fixture);
  });
});
