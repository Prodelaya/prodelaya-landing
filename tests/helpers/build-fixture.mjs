import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const generatorInputs = [
  "scripts/build_cv.py",
  "data/cv.json",
  "data/portfolio.json",
  "data/public-assets.json",
  "templates/index.html.tmpl",
];
const publishedOutputs = [
  "index.html",
  "cv.html",
  "assets/cv-pablo-laya.pdf",
  "assets/social-card.svg",
  "assets/social-card-1200x630.png",
  "robots.txt",
  "sitemap.xml",
  "_headers",
];

function inside(root, candidate) {
  const path = relative(root, candidate);
  return (
    path &&
    !path.startsWith("..") &&
    !path.includes(`..${process.platform === "win32" ? "\\" : "/"}`)
  );
}

function sourcePath(path) {
  const resolved = resolve(sourceRoot, path);
  assert.ok(inside(sourceRoot, resolved), `entrada fuera de la raíz: ${path}`);
  return resolved;
}

function snapshotPublishedOutputs() {
  return Object.fromEntries(
    publishedOutputs.map((path) => {
      const source = sourcePath(path);
      assert.ok(existsSync(source), `falta resultado publicado: ${path}`);
      const stat = statSync(source);
      return [
        path,
        {
          hash: createHash("sha256").update(readFileSync(source)).digest("hex"),
          mtimeMs: stat.mtimeMs,
        },
      ];
    }),
  );
}

function assertPublishedOutputsUnchanged(before) {
  assert.deepEqual(
    snapshotPublishedOutputs(),
    before,
    "la generación de prueba no debe modificar resultados publicados",
  );
}

function copyGeneratorInput(fixtureRoot, path) {
  assert.ok(
    generatorInputs.includes(path),
    `entrada no incluida en la lista blanca: ${path}`,
  );
  const source = sourcePath(path);
  const target = resolve(fixtureRoot, path);
  assert.ok(inside(fixtureRoot, target), `destino fuera del fixture: ${path}`);
  const sourceStat = lstatSync(source);
  assert.ok(
    sourceStat.isFile() && !sourceStat.isSymbolicLink(),
    `la entrada debe ser un archivo regular: ${path}`,
  );
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

export function fixturePath(fixtureRoot, path) {
  const target = resolve(fixtureRoot, path);
  assert.ok(inside(fixtureRoot, target), `ruta fuera del fixture: ${path}`);
  return target;
}

export function readFixture(fixtureRoot, path, encoding = "utf8") {
  return readFileSync(fixturePath(fixtureRoot, path), encoding);
}

export function runBuild(fixtureRoot) {
  execFileSync("python3", ["-I", "-B", "scripts/build_cv.py"], {
    cwd: fixtureRoot,
    stdio: "pipe",
  });
}

export function assertFixtureOutputsMatchPublished(fixtureRoot) {
  for (const path of publishedOutputs) {
    assert.deepEqual(
      readFileSync(fixturePath(fixtureRoot, path)),
      readFileSync(sourcePath(path)),
      `${path} no coincide con el resultado publicado`,
    );
  }
}

export function withBuildFixture(run) {
  const before = snapshotPublishedOutputs();
  const fixtureRoot = mkdtempSync(join(tmpdir(), "prodelaya-build-"));
  try {
    for (const path of generatorInputs) copyGeneratorInput(fixtureRoot, path);
    mkdirSync(fixturePath(fixtureRoot, "assets"), { recursive: true });
    return run(fixtureRoot);
  } finally {
    assertPublishedOutputsUnchanged(before);
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}
