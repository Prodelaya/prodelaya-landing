#!/usr/bin/env python3
"""Export only public files; optionally preview that export on loopback.

This is a local preview, not a deployment command or a full Pages emulator.
"""
import argparse
import mimetypes
import shutil
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_FILES = (
    "index.html", "styles.css", "script.js", "cv.html", "cv.css",
    "luffy-hermes/index.html", "luffy-hermes/privacidad/index.html",
    "assets/favicon-16.png", "assets/cv-pablo-laya.pdf",
    "assets/mugiwara-panel.webp", "assets/tests-daw-practice.webp",
    "assets/crm-pipeline.svg", "assets/social-card.svg",
    "assets/social-card-1200x630.png", "robots.txt", "sitemap.xml", "_headers",
)
ROUTES = {"/" + path: path for path in PUBLIC_FILES if path != "_headers"}
ROUTES.update({"/": "index.html", "/cv": "cv.html"})
for path in ("/luffy-hermes/", "/luffy-hermes/privacidad/"):
    ROUTES[path] = path.lstrip("/") + "index.html"
REDIRECTS = {
    "/luffy-hermes": "/luffy-hermes/",
    "/luffy-hermes/index.html": "/luffy-hermes/",
    "/luffy-hermes/privacidad": "/luffy-hermes/privacidad/",
    "/luffy-hermes/privacidad/index.html": "/luffy-hermes/privacidad/",
}


def public_file(root, name):
    """Reject links in every component, even links back into the source tree."""
    root = Path(root).resolve()
    target = root / name
    if name not in PUBLIC_FILES or any(p.is_symlink() for p in (target, *target.parents) if p != root and root in p.parents):
        raise FileNotFoundError(name)
    if not target.is_file():
        raise FileNotFoundError(name)
    return target


def export_public(destination):
    sources = [(name, public_file(ROOT, name)) for name in PUBLIC_FILES]
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    for name, source in sources:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)


class PublicHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, directory, **kwargs):
        self.directory = Path(directory)
        super().__init__(*args, **kwargs)

    def do_GET(self):
        self.respond(body=True)

    def do_HEAD(self):
        self.respond(body=False)

    def respond(self, body):
        route = urlsplit(self.path).path
        if route in REDIRECTS:
            self.send_response(308)
            self.send_header("Location", REDIRECTS[route])
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        try:
            name = ROUTES[route]
            content = public_file(self.directory, name).read_bytes()
            lines = public_file(self.directory, "_headers").read_text(encoding="utf-8").splitlines()
            # Support only the universal rule emitted by our generator.
            if lines[0] != "/*" or any(line and not line.startswith("  ") for line in lines[1:]):
                raise ValueError("Unsupported preview header rules")
            headers = [line.strip().split(": ", 1) for line in lines[1:] if line]
        except (KeyError, OSError, ValueError, IndexError):
            self.send_error(404)
            return
        self.send_response(200)
        kind = mimetypes.guess_type(name)[0] or "application/octet-stream"
        self.send_header("Content-Type", kind + ("; charset=utf-8" if kind.startswith("text/") else ""))
        self.send_header("Content-Length", str(len(content)))
        for key, value in headers:
            self.send_header(key, value)
        self.end_headers()
        if body:
            self.wfile.write(content)

    def log_message(self, format, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New public-only directory; must not exist")
    parser.add_argument("--serve", action="store_true", help="Preview the new export on 127.0.0.1 only")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    export_public(args.output)
    print(f"Exported {len(PUBLIC_FILES)} allowlisted files to {args.output}", flush=True)
    if args.serve:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(PublicHandler, directory=args.output))
        print(f"Preview: http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
