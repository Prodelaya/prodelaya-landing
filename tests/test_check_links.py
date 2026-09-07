import contextlib
import importlib.util
import io
import json
import unittest
from email.message import Message
from pathlib import Path
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("check_links", ROOT / "scripts" / "check_links.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load scripts/check_links.py")
check_links = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_links)


def http_headers(**values: str) -> Message:
    headers = Message()
    for name, value in values.items():
        headers[name] = value
    return headers


class Response:
    def __init__(self, status=200, url="https://github.com/Prodelaya/example", headers=None):
        self.status = status
        self.url = url
        self.headers = headers or {}
        self.closed = False

    def getcode(self):
        return self.status

    def close(self):
        self.closed = True


class Opener:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.requests = []

    def open(self, request, timeout):
        self.requests.append((request, timeout))
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


class LinkCheckerTests(unittest.TestCase):
    def test_healthy_and_broken_statuses_close_responses(self):
        healthy = Response(200)
        broken = Response(404)
        results = check_links.check_targets(["https://github.com/Prodelaya/a", "https://github.com/Prodelaya/b"], opener=Opener([healthy, broken]), sleep=lambda _: None)
        self.assertEqual([result["status"] for result in results], ["healthy", "broken"])
        self.assertTrue(healthy.closed)
        self.assertTrue(broken.closed)

    def test_403_and_429_are_indeterminate_without_retry(self):
        for code in (403, 429):
            error = HTTPError("https://github.com/Prodelaya/a", code, "blocked", http_headers(), None)
            opener = Opener([error])
            result = check_links.check_targets(["https://github.com/Prodelaya/a"], opener=opener, sleep=lambda _: None)[0]
            self.assertEqual(result["status"], "indeterminate")
            self.assertEqual(len(opener.requests), 1)

    def test_5xx_and_network_retry_once_then_unavailable(self):
        server_error = HTTPError("https://github.com/Prodelaya/a", 503, "down", http_headers(), None)
        opener = Opener([server_error, server_error])
        result = check_links.check_targets(["https://github.com/Prodelaya/a"], opener=opener, sleep=lambda _: None)[0]
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["attempts"], 2)
        network = Opener([URLError("offline"), URLError("offline")])
        self.assertEqual(check_links.check_targets(["https://github.com/Prodelaya/a"], opener=network, sleep=lambda _: None)[0]["status"], "unavailable")
        self.assertEqual(len(network.requests), 2)

    def test_redirect_to_unexpected_host_is_not_followed(self):
        redirect = HTTPError("https://github.com/Prodelaya/a", 302, "move", http_headers(Location="https://127.0.0.1/private"), None)
        opener = Opener([redirect])
        result = check_links.check_targets(["https://github.com/Prodelaya/a"], opener=opener, sleep=lambda _: None)[0]
        self.assertEqual(result["status"], "indeterminate")
        self.assertEqual(len(opener.requests), 1)

    def test_targets_deduplicate_and_exclude_linkedin(self):
        profile = {"website": "https://prodelaya.dev", "github": "https://github.com/Prodelaya", "mugiwaraGithub": "https://github.com/Prodelaya", "linkedin": "https://linkedin.com/in/private"}
        projects = [{"links": [{"url": "https://github.com/Prodelaya/a"}, {"url": "https://github.com/Prodelaya/a"}, {"url": "https://linkedin.com/in/private"}]}]
        targets = check_links.public_targets(profile, projects)
        self.assertEqual(targets.count("https://github.com/Prodelaya/a"), 1)
        self.assertFalse(any("linkedin" in target for target in targets))
        self.assertIn("https://prodelaya.dev/cv", targets)
        self.assertIn("https://prodelaya.dev/assets/cv-pablo-laya.pdf", targets)

    def test_list_is_offline_json(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = check_links.main(["--list"])
        report = json.loads(output.getvalue())
        self.assertEqual(exit_code, 0)
        self.assertIn("targets", report)
        self.assertLessEqual(report["count"], 20)


if __name__ == "__main__":
    unittest.main()
