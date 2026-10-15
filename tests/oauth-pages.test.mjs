import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const routes = ["/luffy-hermes/", "/luffy-hermes/privacidad/"];

test("genera dos páginas con rutas canónicas, navegación y contacto OAuth", () => {
  for (const route of routes) {
    assert.ok(existsSync(new URL(`${route.slice(1)}index.html`, root)), route);
    const html = read(`${route.slice(1)}index.html`);
    assert.ok(html.includes(`<link rel="canonical" href="https://prodelaya.dev${route}">`));
    assert.match(html, /<html lang="es">/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /<h1[^>]*>[^<]*Luffy Hermes/);
    assert.match(html, /href="\/cv.css"/);
    assert.match(html, /href="mailto:asistentes.mugiwara@gmail.com"/);
    assert.match(html, /href="\/#case-mugi"/);
    assert.ok(html.includes(`href="${routes.find((other) => other !== route)}"`));
    assert.doesNotMatch(html, /{{|<script|<form|https:\/\/fonts\.|style=|\bon\w+=/i);
    assert.doesNotMatch(html, /client[_-]?(?:id|secret)|historyId|PubSub|SHADOW|\/srv\/|\.apps\.googleusercontent|laya\.bolivar|proyectos\.delaya|hotmail/i);
  }
  const home = read("luffy-hermes/index.html");
  assert.match(home, /aplicación personal/i);
  assert.match(home, /No ofrece registro público/i);
  assert.match(home, /Gmail/);
  assert.match(home, /Calendar/);
  const privacy = read("luffy-hermes/privacidad/index.html");
  for (const topic of ["Conexiones con Google y finalidades", "Seguimiento de novedades de correo", "Asistentes, memoria y destinatarios", "Almacenamiento, acceso y conservación", "Revocar acceso y solicitar eliminación", "Esta web informativa"])
    assert.ok(privacy.includes(topic), topic);
  for (const html of [home, privacy]) {
    assert.match(html, /Pablo Laya Bolívar/);
    assert.match(html, /China/);
    assert.match(html, /Testing/);
    assert.doesNotMatch(html, /Borrador|no aprobado|revisión local|noindex|PRIVADO|B\.4|\/home\/agentops/i);
  }
  assert.match(privacy, /no está acreditada una exclusión efectiva/i);
  assert.match(privacy, /nunca ha activado esa compartición voluntaria/);
  assert.match(privacy, /revisa personalmente este buzón/);
  assert.match(privacy, /no se ofrece atención continua ni respuesta automática/);
  assert.match(privacy, /href="https:\/\/myaccount\.google\.com\/connections"/);
  assert.match(read("index.html").match(/<article id="case-mugi"[\s\S]*?<\/article>/)?.[0] ?? "", /href="\/luffy-hermes\/"/);
});
