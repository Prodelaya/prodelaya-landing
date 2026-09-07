import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFixtureOutputsMatchPublished,
  fixturePath,
  readFixture,
  runBuild,
  withBuildFixture,
} from "./helpers/build-fixture.mjs";

const root = new URL("../", import.meta.url);
const read = (value) => readFileSync(new URL(value, root), "utf8");
const inlineScripts = (document) =>
  [
    ...document.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => match[1]);
const cspHashes = (document) =>
  inlineScripts(document).map(
    (body) => `sha256-${createHash("sha256").update(body).digest("base64")}`,
  );

test("genera metadatos SEO, JSON-LD y una tarjeta social pública", () => {
  withBuildFixture((fixture) => {
    runBuild(fixture);
    assertFixtureOutputsMatchPublished(fixture);
    const profile = JSON.parse(read("data/cv.json")).profile;
    const index = readFixture(fixture, "index.html");
    const cv = readFixture(fixture, "cv.html");
    for (const [document, canonical] of [
      [index, "https://prodelaya.dev/"],
      [cv, "https://prodelaya.dev/cv"],
    ]) {
      assert.match(
        document,
        new RegExp(`<link rel="canonical" href="${canonical}">`),
      );
      assert.match(
        document,
        /Python.*herramientas internas.*IA aplicada.*Madrid/is,
      );
      assert.match(
        document,
        /<meta property="og:image" content="https:\/\/prodelaya\.dev\/assets\/social-card-1200x630\.png">/,
      );
      assert.match(
        document,
        /<meta name="twitter:card" content="summary_large_image">/,
      );
      const blocks = inlineScripts(document).map(JSON.parse);
      assert.ok(
        blocks.some(
          (block) => block["@type"] === "Person" && block.name === profile.name,
        ),
      );
      assert.ok(blocks.some((block) => block["@type"] === "ProfilePage"));
    }
    const svg = readFixture(fixture, "assets/social-card.svg");
    assert.match(svg, /<svg[^>]+width="1200"[^>]+height="630"/);
    assert.doesNotMatch(
      svg,
      /<(?:script|image|foreignObject)\b|\b(?:href|src)=/i,
    );
    const png = readFileSync(
      fixturePath(fixture, "assets/social-card-1200x630.png"),
    );
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  });
});

test("emite cabeceras estáticas con hashes CSP de los JSON-LD exactos", () => {
  withBuildFixture((fixture) => {
    runBuild(fixture);
    assertFixtureOutputsMatchPublished(fixture);
    const headers = readFixture(fixture, "_headers");
    assert.equal((headers.match(/^\/\*$/gm) ?? []).length, 1);
    const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1] ?? "";
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/i);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(
      headers,
      /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/,
    );
    assert.ok(headers.split("\n").every((line) => line.length < 2000));
    for (const hash of [
      ...cspHashes(readFixture(fixture, "index.html")),
      ...cspHashes(readFixture(fixture, "cv.html")),
    ])
      assert.ok(headers.includes(hash), `falta ${hash}`);
  });
});

test("publica robots y sitemap solo con las rutas canónicas", () => {
  withBuildFixture((fixture) => {
    runBuild(fixture);
    assertFixtureOutputsMatchPublished(fixture);
    assert.match(
      readFixture(fixture, "robots.txt"),
      /Sitemap: https:\/\/prodelaya\.dev\/sitemap\.xml/,
    );
    assert.deepEqual(
      [
        ...readFixture(fixture, "sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g),
      ].map((match) => match[1]),
      ["https://prodelaya.dev/", "https://prodelaya.dev/cv"],
    );
  });
});

test("la lista del comprobador de enlaces es un contrato offline", () => {
  const output = execFileSync(
    "python3",
    ["-I", "-B", "scripts/check_links.py", "--list"],
    { cwd: new URL(".", root), encoding: "utf8" },
  );
  const report = JSON.parse(output);
  assert.ok(Array.isArray(report.targets));
  assert.ok(report.count <= 20);
  assert.ok(
    report.targets.every((target) =>
      /^https:\/\/(?:prodelaya\.dev|tests-daw\.prodelaya\.dev|f2p\.prodelaya\.dev|github\.com)\//.test(
        target,
      ),
    ),
  );
  assert.ok(report.targets.every((target) => !/linkedin/i.test(target)));
});
