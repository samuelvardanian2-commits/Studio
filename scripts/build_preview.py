#!/usr/bin/env python3
"""
Inline index.html + its CSS/JS into a single self-contained page.

Used for the shareable Artifact preview, where the host supplies the
<!doctype>/<html>/<head>/<body> skeleton — so this strips those wrappers and
emits <title> + <style> + body content + <script>. One source of truth:
edit index.html / assets, re-run this, never hand-edit dist/preview.html.

    python3 scripts/build_preview.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "assets/css/style.css").read_text(encoding="utf-8")
js = (ROOT / "assets/js/main.js").read_text(encoding="utf-8")

title = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
fonts = re.findall(r'<link href="https://fonts\.googleapis\.com[^>]*>', html)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)

# drop the local asset references — they are being inlined instead
body = re.sub(r'\s*<script src="assets/js/main\.js"></script>', "", body)

out = "\n".join(
    [f"<title>{title}</title>"]
    + fonts
    + [f"<style>\n{css}\n</style>", body.strip(), f"<script>\n{js}\n</script>", ""]
)

dest = ROOT / "dist/preview.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"wrote {dest.relative_to(ROOT)} ({len(out) / 1024:.1f} KB)")
