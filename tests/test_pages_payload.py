"""Keep Git-integrated Pages deployments on the exact prebuilt public payload."""
import importlib.util
import tomllib
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("public_site", ROOT / "scripts/public_site.py")
assert spec is not None and spec.loader is not None
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class PagesPayloadTests(unittest.TestCase):
    def test_shared_output_without_runtime_or_environment_overrides(self):
        config = ROOT / "wrangler.toml"
        self.assertTrue(config.is_file(), "Pages must select an explicit public output")
        self.assertEqual(tomllib.loads(config.read_text(encoding="utf-8")), {
            "name": "prodelaya-landing",
            "pages_build_output_dir": "./public",
        })

    def test_prebuilt_payload_exact_allowlist_and_bytes(self):
        output = ROOT / "public"
        self.assertTrue(output.is_dir(), "Git builds must not require a dashboard build command")
        self.assertFalse(output.is_symlink())
        entries = list(output.rglob("*"))
        self.assertFalse(any(path.is_symlink() for path in entries))
        files = {path.relative_to(output).as_posix() for path in entries if path.is_file()}
        self.assertEqual(files, set(site.PUBLIC_FILES))
        for name in site.PUBLIC_FILES:
            with self.subTest(path=name):
                self.assertEqual((output / name).read_bytes(), site.public_file(ROOT, name).read_bytes())


if __name__ == "__main__":
    unittest.main()
