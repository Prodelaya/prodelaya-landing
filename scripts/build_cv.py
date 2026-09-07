#!/usr/bin/env python3
"""Generate the public landing, CV HTML and one-page PDF from public JSON data."""

from __future__ import annotations

import base64
import hashlib
import html
import json
import re
import shutil
import subprocess
import textwrap
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
CV_DATA_PATH = ROOT / "data" / "cv.json"
PORTFOLIO_DATA_PATH = ROOT / "data" / "portfolio.json"
PUBLIC_ASSETS_PATH = ROOT / "data" / "public-assets.json"
LANDING_TEMPLATE_PATH = ROOT / "templates" / "index.html.tmpl"
INDEX_PATH = ROOT / "index.html"
CV_HTML_PATH = ROOT / "cv.html"
PDF_PATH = ROOT / "assets" / "cv-pablo-laya.pdf"
SOCIAL_SVG_PATH = ROOT / "assets" / "social-card.svg"
SOCIAL_PNG_PATH = ROOT / "assets" / "social-card-1200x630.png"
ROBOTS_PATH = ROOT / "robots.txt"
SITEMAP_PATH = ROOT / "sitemap.xml"
HEADERS_PATH = ROOT / "_headers"




def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def canonical_url(profile: dict, route: str) -> str:
    return profile["website"].rstrip("/") + route


def seo_metadata(profile: dict, route: str) -> dict[str, str]:
    title = f'{profile["name"]} · {profile["role"]} — Python, {profile["specialty"]}'
    description = f'{profile["name"]}, {profile["role"]} en {profile["location"]}. Python, {profile["specialty"]}.'
    return {
        "title": title,
        "description": description,
        "canonical": canonical_url(profile, route),
        "social_image": canonical_url(profile, "/assets/social-card-1200x630.png"),
        "social_alt": f'{profile["name"]} · {profile["role"]} · {profile["location"]}',
    }


def safe_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def json_ld(profile: dict, metadata: dict[str, str], skills: list[dict]) -> str:
    person_id = canonical_url(profile, "/#person")
    person = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": person_id,
        "name": profile["name"],
        "url": profile["website"],
        "jobTitle": f'{profile["role"]} · {profile["specialty"]}',
        "sameAs": [profile["github"], profile["linkedin"]],
        "knowsAbout": [skill["value"] for skill in skills],
    }
    page = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "url": metadata["canonical"],
        "name": metadata["title"],
        "description": metadata["description"],
        "mainEntity": {"@id": person_id},
    }
    return "\n  ".join(f'<script type="application/ld+json">{safe_json(block)}</script>' for block in (person, page))


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"No se pudo leer {path}: {error}") from error


def project_map(data: dict) -> dict[str, dict]:
    projects = {project["id"]: project for project in data["projects"]}
    if len(projects) != len(data["projects"]):
        raise ValueError("Los ID de proyectos deben ser únicos")
    return projects


def projects_for(ids: list[str], projects: dict[str, dict]) -> list[dict]:
    try:
        return [projects[project_id] for project_id in ids]
    except KeyError as error:
        raise ValueError(f"Proyecto editorial desconocido: {error.args[0]}") from error


def external_link(label: str, url: str) -> str:
    return f'<a href="{esc(url)}" target="_blank" rel="noopener noreferrer">{esc(label)} <span aria-hidden="true">↗</span></a>'


def approved_visuals(asset_data: dict) -> dict[str, dict]:
        visuals: dict[str, dict] = {}
        for asset in asset_data["assets"]:
            path = asset["path"]
            if asset["kind"] not in {"screenshot", "conceptual-diagram"}:
                raise ValueError(f"Tipo de visual no aprobado: {asset['kind']}")
            if path in visuals:
                raise ValueError(f"Visual aprobado duplicado: {path}")
            visuals[path] = asset
        return visuals


def render_case(project: dict, visuals: dict[str, dict], featured: bool = False) -> str:
        classes = "case-card"
        if featured:
            classes += " featured"
        if project["privacy"] == "professional":
            classes += " professional"
        visual_html = ""
        visual = project.get("visual")
        if visual:
            asset = visuals.get(visual["path"])
            if not asset or asset["kind"] != visual["kind"] or asset["projectId"] != project["id"]:
                raise ValueError(f"Visual no aprobado para {project['id']}")
            if project["privacy"] == "professional" and visual["kind"] != "conceptual-diagram":
                raise ValueError("Los casos profesionales solo admiten diagramas conceptuales")
            if project["privacy"] != "professional" and visual["kind"] == "conceptual-diagram":
                raise ValueError("Los diagramas conceptuales son solo para casos profesionales")
            visual_html = f'''<figure class="case-visual case-visual--{esc(visual["kind"])}">
          <img src="{esc(asset["path"])}" alt="{esc(visual["alt"])}" width="{int(asset["width"])}" height="{int(asset["height"])}" loading="lazy" decoding="async">
          <figcaption>{esc(visual["caption"])}</figcaption>
        </figure>'''
        groups = project.get("techGroups")
        if groups:
            meta = f'<div class="case-meta"><span>{esc(project["category"])}</span></div>'
            tech_html = '<div class="case-tech-groups">' + "".join(f'<p><strong>{esc(group["label"])}:</strong> {esc(group["value"])}.</p>' for group in groups) + "</div>"
            if project.get("techDetail"):
                tech_html += f'<details class="case-tech-detail"><summary>Agentes y memoria</summary><p>{esc(project["techDetail"])}</p></details>'
        else:
            meta = f'<div class="case-meta"><span>{esc(project["category"])}</span><span>{esc(project["tech"])}</span></div>'
            tech_html = ""
        body = "".join(f"<p>{esc(paragraph)}</p>" for paragraph in project["landing"])
        links = "".join(external_link(link["label"], link["url"]) for link in project["links"])
        links_html = f'  <div class="case-links">{links}</div>' if links else ""
        return f'''<article id="case-{esc(project["id"])}" class="{classes}">
          {meta}
          <h3>{esc(project["title"])}</h3>
          {tech_html}
          {body}
          {visual_html}
        {links_html}
        </article>'''


def render_evidence(ids: list[str], projects: dict[str, dict]) -> str:
        items = []
        for project in projects_for(ids, projects):
            metric = project.get("metric")
            if not metric:
                raise ValueError(f"Falta evidencia canónica para {project['id']}")
            items.append(f'''<a class="evidence-item" href="#case-{esc(project["id"])}">
          <strong>{esc(metric["value"])} <span>{esc(metric["label"])}</span></strong>
          <span>{esc(metric["detail"])}</span>
        </a>''')
        return "\n".join(items)


def render_timeline(items: list[dict], kind: str) -> str:
    if kind == "experience":
        return "".join(
            f'<li><p class="timeline-date">{esc(item["dates"])}</p><h4>{esc(item["organization"])}</h4><p>{esc(item["role"])}.</p></li>'
            for item in items
        )
    return "".join(
        f'<li><p class="timeline-date">{esc(item["dates"])}</p><h4>{esc(item["title"])} · {esc(item["organization"])}</h4></li>'
        for item in items
    )


def strict_substitute(template: str, values: dict[str, str]) -> str:
    for key, value in values.items():
        template = template.replace("{{" + key + "}}", value)
    if re.search(r"\{\{[^{}]+\}\}", template):
        raise ValueError("La plantilla contiene marcadores sin resolver")
    return template


def build_index(cv_data: dict, portfolio: dict, asset_data: dict | None = None) -> str:
    profile = cv_data["profile"]
    projects = project_map(cv_data)
    visuals = approved_visuals(asset_data if asset_data is not None else load_json(PUBLIC_ASSETS_PATH))
    metadata = seo_metadata(profile, "/")
    values = {
        "name": esc(profile["name"]),
        "seo_title": esc(metadata["title"]),
        "seo_description": esc(metadata["description"]),
        "canonical_url": esc(metadata["canonical"]),
        "social_image": esc(metadata["social_image"]),
        "social_alt": esc(metadata["social_alt"]),
        "json_ld": json_ld(profile, metadata, cv_data["skills"]),
        "email": esc(profile["email"]),
        "website": esc(profile["website"]),
        "github": esc(profile["github"]),
        "linkedin": esc(profile["linkedin"]),
        "mugiwara_github": esc(profile["mugiwaraGithub"]),
        "hero_eyebrow": esc(portfolio["hero"]["eyebrow"]),
        "hero_title": f'{esc(portfolio["hero"]["titleLead"])} <span class="hero-title-accent">{esc(portfolio["hero"]["titleEmphasis"])}</span>',
        "hero_body": esc(strict_substitute(portfolio["hero"]["body"], {
            "name": profile["name"],
            "role_lower": profile["role"].lower(),
            "location": profile["location"],
        })),
        "capabilities": "".join(
            f'<article class="capability"><h3>{esc(item["title"])}</h3><p>{esc(item["body"])}</p></article>'
            for item in portfolio["capabilities"]
        ),
        "evidence": render_evidence(portfolio["evidenceProjectIds"], projects),
        "primary_projects": "\n".join(render_case(project, visuals, project["id"] in portfolio["featuredProjects"]) for project in projects_for(portfolio["primaryProjects"], projects)),
        "secondary_projects": "\n".join(render_case(project, visuals, project["id"] in portfolio["featuredProjects"]) for project in projects_for(portfolio["secondaryProjects"], projects)),
        "archive_projects": "\n".join(render_case(project, visuals, project["id"] in portfolio["featuredProjects"]) for project in projects_for(portfolio["archiveProjects"], projects)),
        "experience": render_timeline(cv_data["experience"], "experience"),
        "education": render_timeline(cv_data["education"], "education"),
        "method": "".join(f"<li>{esc(step)}</li>" for step in portfolio["method"]),
    }
    rendered = strict_substitute(LANDING_TEMPLATE_PATH.read_text(encoding="utf-8"), values)
    return "\n".join(line.rstrip() for line in rendered.splitlines()) + "\n"


def contact_link(label: str, href: str) -> str:
    return f'<a href="{esc(href)}">{esc(label)}</a>'


def build_cv_html(cv_data: dict, portfolio: dict) -> str:
    profile = cv_data["profile"]
    projects = project_map(cv_data)
    experience = "\n".join(
        f'''<article class="cv-entry"><div class="cv-entry-head"><h3>{esc(item["organization"])}</h3><span class="cv-date">{esc(item["dates"])}</span></div><p class="cv-subtitle">{esc(item["role"])}</p><ul>{"".join(f"<li>{esc(detail)}</li>" for detail in item["details"])}</ul></article>'''
        for item in cv_data["experience"]
    )
    skills = "\n".join(f'<article class="cv-skill-group"><h3>{esc(item["label"])}</h3><p>{esc(item["value"])}</p></article>' for item in cv_data["skills"])
    education = "\n".join(f'<article class="cv-education-entry"><h3>{esc(item["title"])}</h3><p>{esc(item["organization"])} · {esc(item["dates"])}</p></article>' for item in cv_data["education"])
    selected_projects = projects_for(portfolio["cvProjectIds"], projects)
    projects_html = "\n".join(f'<article class="cv-project"><h3>{esc(item["title"])}</h3><p class="cv-tech">{esc(item["tech"])}</p><p>{esc(item["cvsummary"])}</p></article>' for item in selected_projects)
    contacts = " · ".join([
        esc(profile["location"]),
        contact_link(profile["email"], f'mailto:{profile["email"]}'),
        contact_link(profile["website"].removeprefix("https://"), profile["website"]),
        contact_link(profile["github"].removeprefix("https://"), profile["github"]),
        contact_link("LinkedIn", profile["linkedin"]),
    ])
    metadata = seo_metadata(profile, "/cv")
    return f'''<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{esc(metadata["description"])}">
  <link rel="canonical" href="{esc(metadata["canonical"])}">
  <meta property="og:title" content="{esc(metadata["title"])}">
  <meta property="og:description" content="{esc(metadata["description"])}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="{esc(metadata["canonical"])}">
  <meta property="og:image" content="{esc(metadata["social_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(metadata["social_alt"])}">
  <meta property="og:locale" content="es_ES">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(metadata["title"])}">
  <meta name="twitter:description" content="{esc(metadata["description"])}">
  <meta name="twitter:image" content="{esc(metadata["social_image"])}">
  <meta name="twitter:image:alt" content="{esc(metadata["social_alt"])}">
  <title>CV · {esc(metadata["title"])}</title>
  {json_ld(profile, metadata, cv_data["skills"])}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="cv.css">
</head>
<body class="cv-body">
  <main class="cv-page">
    <div class="cv-utility"><a class="cv-back" href="index.html">← Volver al portfolio</a><a class="cv-download" href="assets/cv-pablo-laya.pdf" download>Descargar CV <span>PDF</span></a></div>
    <header class="cv-hero"><p class="cv-eyebrow">Currículum</p><h1>{esc(profile["name"])}</h1><p class="cv-role"><span>{esc(profile["role"])}</span><span>{esc(profile["specialty"])}</span></p><p class="cv-contact">{contacts}</p></header>
    <section class="cv-profile" aria-labelledby="perfil"><h2 id="perfil">Perfil</h2><p>{esc(profile["summary"])}</p></section>
    <div class="cv-content-grid">
      <section class="cv-experience" aria-labelledby="experiencia"><h2 id="experiencia">Experiencia profesional</h2>{experience}</section>
      <aside class="cv-side-column" aria-label="Competencias, idiomas y formación">
        <section class="cv-skills-section" aria-labelledby="competencias"><h2 id="competencias">Competencias</h2><div class="cv-skills">{skills}</div></section>
        <section class="cv-languages" aria-labelledby="idiomas"><h2 id="idiomas">Idiomas</h2><ul>{"".join(f"<li>{esc(language)}</li>" for language in cv_data["languages"])}</ul></section>
        <section class="cv-education" aria-labelledby="formacion"><h2 id="formacion">Formación</h2>{education}</section>
      </aside>
    </div>
    <section class="cv-projects" aria-labelledby="proyectos"><h2 id="proyectos">Proyectos seleccionados</h2>{projects_html}</section>
  </main>
</body>
</html>
'''


def pdf_literal(value: str) -> bytes:
    raw = value.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def pdf_text(value: str, x: float, y: float, size: float, bold: bool = False, color: str = "0.12 0.09 0.15") -> bytes:
    font = b"F2" if bold else b"F1"
    return f"BT /{font.decode()} {size} Tf {color} rg {x:.1f} {y:.1f} Td (".encode() + pdf_literal(value) + b") Tj ET\n"


def pdf_rule(y: float) -> bytes:
    return f"q 0.67 0.10 0.42 RG 0.8 w 48 {y:.1f} m 547 {y:.1f} l S Q\n".encode()


def wrap(value: str, width: int = 92) -> list[str]:
    return textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False) or [""]


def build_pdf(cv_data: dict, portfolio: dict) -> bytes:
    profile = cv_data["profile"]
    projects = project_map(cv_data)
    selected_projects = projects_for(portfolio["cvProjectIds"], projects)
    content = bytearray()
    annotations: list[tuple[float, float, float, float, str]] = []
    y = 800.0

    def require_room(amount: float) -> None:
        if y - amount < 42:
            raise ValueError("El CV no cabe en una sola página A4")

    def line(value: str, size: float = 10, bold: bool = False, gap: float = 12, x: float = 48, color: str = "0.12 0.09 0.15") -> None:
        nonlocal y
        require_room(gap)
        content.extend(pdf_text(value, x, y, size, bold, color))
        y -= gap

    def paragraph(value: str, size: float = 10, width: int = 98, gap: float = 11.5, prefix: str = "") -> None:
        for index, wrapped in enumerate(wrap(value, width)):
            line((prefix if index == 0 else "  ") + wrapped, size, False, gap)

    def section(title: str) -> None:
        nonlocal y
        require_room(20)
        y -= 4
        content.extend(pdf_rule(y - 4))
        line(title.upper(), 10, True, 13, color="0.42 0.06 0.27")

    def linked_line(label: str, uri: str, size: float = 9) -> None:
        nonlocal y
        x = 48.0
        line(label, size, False, 11)
        width = min(499.0, max(24.0, len(label) * size * 0.49))
        annotations.append((x, y + 8.5, min(547.0, x + width), y + 19.0, uri))

    line(profile["name"], 17, True, 20, color="0.12 0.09 0.15")
    line(profile["role"], 10.5, True, 12, color="0.42 0.06 0.27")
    line(profile["specialty"], 10.5, True, 13, color="0.42 0.06 0.27")
    line(profile["location"], 9, False, 10.5)
    linked_line(profile["email"], f'mailto:{profile["email"]}')
    linked_line(profile["website"].removeprefix("https://"), profile["website"])
    linked_line(profile["github"].removeprefix("https://"), profile["github"])
    linked_line(unquote(profile["linkedin"]).removeprefix("https://"), profile["linkedin"])

    section("Perfil")
    paragraph(profile["summary"], 10, 102, 11.5)

    section("Experiencia profesional")
    for item in cv_data["experience"]:
        line(f'{item["organization"]} — {item["dates"]}', 10, True, 12)
        line(item["role"], 10, False, 11, color="0.42 0.06 0.27")
        for detail in item["details"]:
            paragraph(detail, 10, 102, 11.5, "• ")
        y -= 1.5

    section("Competencias")
    for item in cv_data["skills"]:
        paragraph(f'{item["label"]}: {item["value"]}', 10, 106, 11.5)

    section("Idiomas")
    for language in cv_data["languages"]:
        line(language, 10, False, 11)

    section("Formación")
    for item in cv_data["education"]:
        line(f'{item["title"]} — {item["organization"]} · {item["dates"]}', 10, False, 11)

    section("Proyectos seleccionados")
    for item in selected_projects:
        line(item["title"], 10, True, 11.5)
        if item.get("cvtech"):
            line(item["cvtech"], 10, False, 11, color="0.42 0.06 0.27")
        paragraph(item["cvsummary"], 10, 103, 11.5)

    objects: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        2: b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        4: b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + bytes(content) + b"endstream",
        5: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        6: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    }
    annotation_ids = list(range(7, 7 + len(annotations)))
    objects[3] = b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R /Annots [" + b" ".join(f"{number} 0 R".encode() for number in annotation_ids) + b"] >>"
    for number, (left, bottom, right, top, uri) in zip(annotation_ids, annotations):
        objects[number] = f"<< /Type /Annot /Subtype /Link /Rect [{left:.1f} {bottom:.1f} {right:.1f} {top:.1f}] /Border [0 0 0] /A << /S /URI /URI (".encode() + pdf_literal(uri) + b") >> >>"

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number in range(1, max(objects) + 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode())
        output.extend(objects[number])
        output.extend(b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f\n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n\n".encode())
    output.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(output)


def build_social_svg(profile: dict) -> str:
    text = lambda value: esc(value)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">{text(profile["name"])} · perfil profesional</title>
  <desc id="desc">{text(profile["role"])} especializado en {text(profile["specialty"])} en {text(profile["location"])}.</desc>
  <rect width="1200" height="630" fill="#251122"/>
  <rect x="0" y="0" width="24" height="630" fill="#e34a74"/>
  <circle cx="1040" cy="118" r="180" fill="#8c1d55" opacity=".55"/>
  <path d="M76 432H1124" stroke="#f05a7e" stroke-width="4"/>
  <g fill="#fff" font-family="Arial, sans-serif">
    <text x="76" y="124" font-size="30" letter-spacing="4" fill="#f5a0b8">PRODELAYA.DEV</text>
    <text x="76" y="250" font-size="70" font-weight="700">{text(profile["name"])}</text>
    <text x="76" y="326" font-size="38" font-weight="700" fill="#f5a0b8">{text(profile["role"])}</text>
    <text x="76" y="380" font-size="28">{text(profile["specialty"])}</text>
    <text x="76" y="506" font-size="28" fill="#f5a0b8">{text(profile["location"])}</text>
  </g>
</svg>
'''


def build_social_png(svg: str) -> bytes:
    converter = shutil.which("rsvg-convert")
    if not converter:
        raise ValueError("Falta rsvg-convert: es necesario para generar assets/social-card-1200x630.png")
    try:
        result = subprocess.run(
            [converter, "--width", "1200", "--height", "630", "--format", "png"],
            input=svg.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
        )
    except subprocess.CalledProcessError as error:
        raise ValueError(f"rsvg-convert no pudo generar la tarjeta social: {error.stderr.decode('utf-8', 'replace').strip()}") from error
    png = result.stdout
    if png[:8] != b"\x89PNG\r\n\x1a\n" or len(png) < 24 or int.from_bytes(png[16:20], "big") != 1200 or int.from_bytes(png[20:24], "big") != 630:
        raise ValueError("rsvg-convert no devolvió un PNG de 1200x630 válido")
    return png


def csp_hashes(*documents: str) -> list[str]:
    hashes = []
    for document in documents:
        for body in re.findall(r'<script type="application/ld\+json">(.*?)</script>', document, flags=re.DOTALL):
            digest = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode("ascii")
            hashes.append(f"'sha256-{digest}'")
    return hashes


def build_headers(index: str, cv_html: str) -> str:
    hashes = " ".join(csp_hashes(index, cv_html))
    csp = " ".join([
        "default-src 'self';",
        f"script-src 'self' {hashes};",
        "style-src 'self' https://fonts.googleapis.com;",
        "font-src 'self' https://fonts.gstatic.com;",
        "img-src 'self' data:;",
        "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ])
    return "\n".join([
        "/*",
        "  X-Content-Type-Options: nosniff",
        "  Referrer-Policy: strict-origin-when-cross-origin",
        "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
        f"  Content-Security-Policy: {csp}",
        "",
    ])


def build_robots(profile: dict) -> str:
    return f"User-agent: *\nAllow: /\nSitemap: {canonical_url(profile, '/sitemap.xml')}\n"


def build_sitemap(profile: dict) -> str:
    urls = [canonical_url(profile, "/"), canonical_url(profile, "/cv")]
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + "".join(f"  <url><loc>{esc(url)}</loc></url>\n" for url in urls) + "</urlset>\n"


def main() -> None:
    cv_data = load_json(CV_DATA_PATH)
    portfolio = load_json(PORTFOLIO_DATA_PATH)
    asset_data = load_json(PUBLIC_ASSETS_PATH)
    try:
        index = build_index(cv_data, portfolio, asset_data)
        cv_html = build_cv_html(cv_data, portfolio)
        pdf = build_pdf(cv_data, portfolio)
        social_svg = build_social_svg(cv_data["profile"])
        social_png = build_social_png(social_svg)
        headers = build_headers(index, cv_html)
        robots = build_robots(cv_data["profile"])
        sitemap = build_sitemap(cv_data["profile"])
    except (KeyError, TypeError, ValueError) as error:
        raise SystemExit(f"No se pudo generar contenido público: {error}") from error
    INDEX_PATH.write_text(index, encoding="utf-8")
    CV_HTML_PATH.write_text(cv_html, encoding="utf-8")
    PDF_PATH.write_bytes(pdf)
    SOCIAL_SVG_PATH.write_text(social_svg, encoding="utf-8")
    SOCIAL_PNG_PATH.write_bytes(social_png)
    HEADERS_PATH.write_text(headers, encoding="utf-8")
    ROBOTS_PATH.write_text(robots, encoding="utf-8")
    SITEMAP_PATH.write_text(sitemap, encoding="utf-8")


if __name__ == "__main__":
    main()
