"""Exercise a public-only export and real HTTP preview, never the repo root."""
import functools
import http.client
import importlib.util
import tempfile
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("public_site", ROOT / "scripts/public_site.py")
assert spec is not None and spec.loader is not None
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if key in attrs:
                self.links.append(attrs[key])


class PublicSiteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.export = Path(self.temp.name) / "public"
        site.export_public(self.export)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(site.PublicHandler, directory=self.export))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def request(self, path, method="GET"):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_exact_export_and_no_overwrite(self):
        paths = {p.relative_to(self.export).as_posix() for p in self.export.rglob("*") if p.is_file()}
        self.assertEqual(paths, set(site.PUBLIC_FILES))
        with self.assertRaises(FileExistsError):
            site.export_public(self.export)

    def test_public_assets_routes_headers_and_head(self):
        for path in site.PUBLIC_FILES:
            if path == "_headers":
                continue
            with self.subTest(path=path):
                status, headers, content = self.request("/" + path)
                # Directory index aliases redirect to the canonical route.
                if path.startswith("luffy-hermes/"):
                    self.assertEqual(status, 308)
                    status, headers, content = self.request(headers["Location"])
                self.assertEqual(status, 200)
                self.assertEqual(content, (self.export / path).read_bytes())
                self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
                csp = headers["Content-Security-Policy"]
                self.assertIn("frame-ancestors 'none'", csp)
                self.assertNotIn("unsafe-inline", csp)
        for route in ("/", "/cv", "/luffy-hermes/", "/luffy-hermes/privacidad/"):
            self.assertEqual(self.request(route)[0], 200)
            self.assertEqual(self.request(route, "HEAD")[2], b"")
        for route in ("/luffy-hermes", "/luffy-hermes/privacidad"):
            self.assertEqual(self.request(route)[1]["Location"], route + "/")

    def test_private_paths_unknown_routes_and_symlinks_are_denied(self):
        (self.export / "private.txt").write_text("NOT PUBLIC", encoding="utf-8")
        for path in ("/private.txt", "/data/cv.json", "/scripts/build_cv.py", "/templates/", "/tests/", "/portfolio-material/", "/.git/config", "/odd/tasks/", "/_headers", "/assets/", "/missing", "/../data/cv.json", "/%2e%2e/data/cv.json", "/luffy-hermes/%2e%2e/data/cv.json"):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
        target = self.export / "luffy-hermes/index.html"
        target.unlink()
        target.symlink_to(ROOT / "data/cv.json")
        self.assertEqual(self.request("/luffy-hermes/")[0], 404)

    def test_local_links_assets_and_fragment_targets_resolve(self):
        for route in ("/", "/cv", "/luffy-hermes/", "/luffy-hermes/privacidad/"):
            parser = Links()
            parser.feed(self.request(route)[2].decode())
            for link in parser.links:
                url = urlsplit(urljoin("http://localhost" + route, link))
                if url.netloc != "localhost" or url.scheme != "http":
                    continue
                with self.subTest(route=route, link=link):
                    status, _, body = self.request(url.path)
                    self.assertEqual(status, 200)
                    if url.fragment:
                        target = Links()
                        target.feed(body.decode())
                        self.assertIn(url.fragment, target.ids)


if __name__ == "__main__":
    unittest.main()
