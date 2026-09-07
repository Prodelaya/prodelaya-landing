#!/usr/bin/env python3
"""Build the public CV HTML and text-based PDF from data/cv.json using stdlib only."""

from __future__ import annotations

import html
import json
import textwrap
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "cv.json"
HTML_PATH = ROOT / "cv.html"
PDF_PATH = ROOT / "assets" / "cv-pablo-laya.pdf"


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def contact_link(label: str, href: str) -> str:
    return f'<a href="{esc(href)}">{esc(label)}</a>'


def build_html(data: dict) -> str:
    profile = data["profile"]
    experience = "\n".join(
        f'''<article class="cv-entry">
  <div class="cv-entry-head"><h3>{esc(item["organization"])}</h3><span class="cv-date">{esc(item["dates"])}</span></div>
  <p class="cv-subtitle">{esc(item["role"])}</p>
  <ul>{"".join(f"<li>{esc(detail)}</li>" for detail in item["details"])}</ul>
</article>'''
        for item in data["experience"]
    )
    skills = "\n".join(
        f'''<article class="cv-skill-group"><h3>{esc(label)}</h3><div>{"".join(f'<span class="cv-skill-tag">{esc(skill)}</span>' for skill in value.split(", "))}</div></article>'''
        for label, value in data["skills"]
    )
    education = "\n".join(
        f'''<article class="cv-education-entry"><h3>{esc(item["title"])}</h3><p>{esc(item["organization"])} · {esc(item["dates"])}</p></article>'''
        for item in data["education"]
    )
    projects = "\n".join(
        f'''<article class="cv-project">
  <h3>{esc(item["name"])}</h3>
  <p class="cv-tech">{esc(item["tech"])}</p>
  <p>{esc(item["summary"])}</p>
</article>'''
        for item in data["projects"]
    )
    contacts = " · ".join(
        [
            esc(profile["location"]),
            contact_link(profile["email"], f'mailto:{profile["email"]}'),
            contact_link(profile["website"], f'https://{profile["website"]}'),
            contact_link(profile["github"], f'https://{profile["github"]}'),
            contact_link("LinkedIn", f'https://{profile["linkedin"]}'),
        ]
    )
    return f'''<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="CV de {esc(profile["name"])}">
  <title>CV · {esc(profile["name"])}</title>
  <link rel="stylesheet" href="cv.css">
</head>
<body class="cv-body">
  <main class="cv-page">
    <div class="cv-utility">
      <a class="cv-back" href="index.html">← Volver al portfolio</a>
      <a class="cv-download" href="assets/cv-pablo-laya.pdf" download>Descargar CV <span>PDF</span></a>
    </div>
    <header class="cv-hero">
      <p class="cv-eyebrow">Currículum</p>
      <h1>{esc(profile["name"])}</h1>
      <p class="cv-role">{esc(profile["role"])}</p>
      <p class="cv-contact">{contacts}</p>
    </header>
    <section class="cv-profile" aria-labelledby="perfil"><h2 id="perfil">Perfil</h2><p>{esc(profile["summary"])}</p></section>
    <div class="cv-layout">
      <section class="cv-experience" aria-labelledby="experiencia"><h2 id="experiencia">Experiencia profesional</h2>{experience}</section>
      <aside class="cv-sidebar">
        <section aria-labelledby="competencias"><h2 id="competencias">Competencias</h2><div class="cv-skills">{skills}</div></section>
        <section class="cv-education" aria-labelledby="formacion"><h2 id="formacion">Formación</h2>{education}</section>
      </aside>
    </div>
    <section class="cv-projects" aria-labelledby="proyectos"><h2 id="proyectos">Proyectos</h2><div class="cv-project-grid">{projects}</div></section>
  </main>
</body>
</html>
'''


def pdf_literal(value: str) -> bytes:
    raw = value.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def pdf_text(value: str, x: int, y: int, size: float, bold: bool = False) -> bytes:
    font = b"F2" if bold else b"F1"
    return b"BT /" + font + b" " + str(size).encode() + b" Tf " + str(x).encode() + b" " + str(y).encode() + b" Td (" + pdf_literal(value) + b") Tj ET\n"


def wrap(value: str, width: int = 88) -> list[str]:
    return textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False) or [""]


def build_pdf(data: dict) -> bytes:
    profile = data["profile"]
    pages: list[bytes] = []
    content = bytearray()
    y = 794

    def new_page() -> None:
        nonlocal content, y
        if content:
            pages.append(bytes(content))
        content = bytearray()
        y = 794

    def line(value: str, size: float = 10, bold: bool = False, gap: int = 13) -> None:
        nonlocal y
        if y < 52:
            new_page()
        content.extend(pdf_text(value, 48, y, size, bold))
        y -= gap

    def section(title: str) -> None:
        nonlocal y
        y -= 4
        line(title.upper(), 10, True, 14)

    line(profile["name"], 18, True, 21)
    line(profile["role"], 10, True, 14)
    line(f'{profile["location"]} · {profile["email"]}', 9, False, 12)
    line(f'{profile["website"]} · {profile["github"]}', 9, False, 12)
    line(f'LinkedIn: {unquote(profile["linkedin"])}', 9, False, 15)

    section("Perfil")
    for value in wrap(profile["summary"]):
        line(value, 10, False, 12)

    section("Experiencia profesional")
    for item in data["experience"]:
        line(f'{item["organization"]} — {item["dates"]}', 10, True, 12)
        line(item["role"], 9, False, 11)
        for detail in item["details"]:
            wrapped = wrap("• " + detail, 86)
            for value in wrapped:
                line(value, 9.5, False, 11)
        y -= 2

    section("Competencias")
    for label, value in data["skills"]:
        line(f"{label}: {value}", 9.5, False, 11)

    section("Formación")
    for item in data["education"]:
        line(f'{item["title"]} — {item["organization"]} · {item["dates"]}', 9.5, False, 11)

    section("Proyectos")
    for item in data["projects"]:
        line(f'{item["name"]} — {item["tech"]}', 9.5, True, 11)
        for value in wrap(item["summary"], 88):
            line(value, 9.5, False, 11)

    pages.append(bytes(content))
    objects: dict[int, bytes] = {}
    page_ids = []
    content_ids = []
    next_id = 3
    for page in pages:
        page_ids.append(next_id)
        content_ids.append(next_id + 1)
        next_id += 2
    font_id = next_id
    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = b"<< /Type /Pages /Kids [" + b" ".join(f"{item} 0 R".encode() for item in page_ids) + b"] /Count " + str(len(pages)).encode() + b" >>"
    for page_id, content_id, page in zip(page_ids, content_ids, pages):
        objects[page_id] = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font_id} 0 R /F2 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()
        objects[content_id] = b"<< /Length " + str(len(page)).encode() + b" >>\nstream\n" + page + b"endstream"
    objects[font_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    # F2 is Helvetica-Bold but needs its own object; alter page resources and append it.
    bold_id = font_id + 1
    objects[font_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    objects[bold_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    for page_id in page_ids:
        objects[page_id] = objects[page_id].replace(f"/F2 {font_id} 0 R".encode(), f"/F2 {bold_id} 0 R".encode())

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number in range(1, bold_id + 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode())
        output.extend(objects[number])
        output.extend(b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {bold_id + 1}\n0000000000 65535 f\n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n\n".encode())
    output.extend(f"trailer\n<< /Size {bold_id + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(output)


def main() -> None:
    try:
        data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"No se pudo leer {DATA_PATH}: {error}") from error
    HTML_PATH.write_text(build_html(data), encoding="utf-8")
    PDF_PATH.write_bytes(build_pdf(data))


if __name__ == "__main__":
    main()
