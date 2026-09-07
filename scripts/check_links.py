#!/usr/bin/env python3
"""Bounded, read-only checks for the portfolio's public links."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent
CV_DATA_PATH = ROOT / "data" / "cv.json"
ALLOWED_HOSTS = {"prodelaya.dev", "tests-daw.prodelaya.dev", "f2p.prodelaya.dev", "github.com"}
MAX_URLS = 20
TIMEOUT_SECONDS = 12
USER_AGENT = "Mozilla/5.0 (compatible; ProdelayaLinkCheck/1.0; +https://prodelaya.dev/)"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def normalize_url(value: str) -> str | None:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    host = parsed.hostname.lower()
    if host not in ALLOWED_HOSTS or parsed.port not in (None, 443):
        return None
    path = parsed.path or "/"
    return urlunsplit(("https", host, path, parsed.query, ""))


def public_targets(profile: dict, projects: list[dict]) -> list[str]:
    candidates = [
        profile["website"],
        profile["website"].rstrip("/") + "/cv",
        profile["website"].rstrip("/") + "/assets/cv-pablo-laya.pdf",
        profile["github"],
        profile["mugiwaraGithub"],
    ]
    for project in projects:
        candidates.extend(link["url"] for link in project.get("links", []))
    targets: list[str] = []
    for candidate in candidates:
        target = normalize_url(candidate)
        if target and target not in targets:
            targets.append(target)
    if len(targets) > MAX_URLS:
        raise ValueError(f"Demasiadas URL públicas ({len(targets)}; máximo {MAX_URLS})")
    return targets


def load_targets() -> list[str]:
    try:
        data = json.loads(CV_DATA_PATH.read_text(encoding="utf-8"))
        return public_targets(data["profile"], data["projects"])
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        raise ValueError(f"No se pudieron cargar las URL públicas: {error}") from error


def response_status(response) -> int:
    status = getattr(response, "status", None)
    return int(status if status is not None else response.getcode())


def result(url: str, status: str, attempts: int, final_url: str | None = None, detail: str | None = None) -> dict:
    payload = {"url": url, "status": status, "attempts": attempts, "finalUrl": final_url or url}
    if detail:
        payload["detail"] = detail
    return payload


def check_target(url: str, opener, sleep=time.sleep) -> dict:
    current = url
    redirects = 0
    attempts = 0
    while True:
        attempts += 1
        request = Request(current, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.1"}, method="GET")
        try:
            response = opener.open(request, timeout=TIMEOUT_SECONDS)
            try:
                code = response_status(response)
                final = normalize_url(response.geturl() if hasattr(response, "geturl") else getattr(response, "url", current))
                if not final:
                    return result(url, "indeterminate", attempts, current, "respuesta final fuera de la lista permitida")
                if 200 <= code < 300:
                    return result(url, "healthy", attempts, final)
                if code in (403, 429, 999):
                    return result(url, "indeterminate", attempts, final, f"HTTP {code}")
                if code in (404, 410):
                    return result(url, "broken", attempts, final, f"HTTP {code}")
                if 500 <= code < 600 and attempts < 2:
                    sleep(1)
                    continue
                return result(url, "unavailable", attempts, final, f"HTTP {code}")
            finally:
                response.close()
        except HTTPError as error:
            code = error.code
            location = error.headers.get("Location") if error.headers else None
            error.close()
            if 300 <= code < 400 and location and redirects < 3:
                redirected = normalize_url(urljoin(current, location))
                if not redirected:
                    return result(url, "indeterminate", attempts, current, "redirección fuera de la lista permitida")
                current = redirected
                redirects += 1
                continue
            if code in (403, 429, 999):
                return result(url, "indeterminate", attempts, current, f"HTTP {code}")
            if code in (404, 410):
                return result(url, "broken", attempts, current, f"HTTP {code}")
            if 500 <= code < 600 and attempts < 2:
                sleep(1)
                continue
            return result(url, "unavailable", attempts, current, f"HTTP {code}")
        except (URLError, TimeoutError, OSError) as error:
            if attempts < 2:
                sleep(1)
                continue
            return result(url, "unavailable", attempts, current, str(error.reason if isinstance(error, URLError) else error))


def check_targets(targets: list[str], opener=None, sleep=time.sleep) -> list[dict]:
    client = opener or build_opener(NoRedirect())
    return [check_target(target, client, sleep) for target in targets]


def summarize(results: list[dict]) -> dict[str, int]:
    return {status: sum(item["status"] == status for item in results) for status in ("healthy", "broken", "unavailable", "indeterminate")}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Comprueba enlaces públicos sin autenticación ni métodos que cambien estado.")
    parser.add_argument("--list", action="store_true", help="muestra las URL normalizadas sin hacer solicitudes")
    args = parser.parse_args(argv)
    try:
        targets = load_targets()
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2
    if args.list:
        print(json.dumps({"targets": targets, "count": len(targets)}, ensure_ascii=False))
        return 0
    results = check_targets(targets)
    summary = summarize(results)
    print(json.dumps({"results": results, "summary": summary}, ensure_ascii=False))
    print("Enlaces: " + ", ".join(f"{key}={value}" for key, value in summary.items()), file=sys.stderr)
    if summary["broken"] or summary["unavailable"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
