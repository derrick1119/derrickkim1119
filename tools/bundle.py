#!/usr/bin/env python3
"""Fold the game into one self-contained HTML file.

Usage:  python3 tools/bundle.py [output.html]

Inlines assets/fonts/fonts.css and every <script src> of index.html, so the
result can be double-clicked, e-mailed or uploaded on its own. Default output
is dist/take-your-time.html (dist/ is not tracked).
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "take-your-time.html"
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def css(m):
        return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "</style>"

    def js(m):
        src = (ROOT / m.group(1)).read_text(encoding="utf-8")
        # a literal closing tag inside a script would end it early
        return "<script>\n" + src.replace("</script", "<\\/script") + "</script>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', js, html)
    if n_css != 1 or n_js == 0:
        sys.exit(f"unexpected page shape: {n_css} stylesheet(s), {n_js} script(s)")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"{out}: {out.stat().st_size / 1024:.0f} KB, {n_js} scripts inlined")


if __name__ == "__main__":
    main()
