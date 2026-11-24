#!/usr/bin/env python3
"""Fold the game into one self-contained HTML file.

Usage:  python3 tools/bundle.py [--release] [output.html]

Inlines assets/fonts/fonts.css and every <script src> of index.html, so the
result can be double-clicked, e-mailed or uploaded on its own. Default output
is dist/take-your-time.html (dist/ is not tracked). The fuller hand the epilogue
loads for the player's letter (assets/fonts/hand-letter.woff2) goes in as a
data: URI in place of its path.

--release leaves the test menu (src/devmenu.js) out, and writes to
dist/take-your-time-release.html unless another path is given.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    args = [a for a in sys.argv[1:] if a != "--release"]
    release = "--release" in sys.argv[1:]
    out = pathlib.Path(args[0]) if args else ROOT / "dist" / ("take-your-time-release.html" if release else "take-your-time.html")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if release:
        html, n_dev = re.subn(r'(<!-- test menu:[^\n]*-->\n)?<script src="src/devmenu\.js"></script>\n?', "", html)
        if n_dev != 1:
            sys.exit("could not find the test menu's script line to leave out")

    def css(m):
        return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "</style>"

    letter = ROOT / "assets" / "fonts" / "hand-letter.woff2"
    letter_uri = "data:font/woff2;base64," + base64.b64encode(letter.read_bytes()).decode("ascii") if letter.exists() else None

    def js(m):
        src = (ROOT / m.group(1)).read_text(encoding="utf-8")
        if letter_uri:
            src = src.replace("'assets/fonts/hand-letter.woff2'", "'" + letter_uri + "'")
        # a literal closing tag inside a script would end it early
        return "<script>\n" + src.replace("</script", "<\\/script") + "</script>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', js, html)
    if n_css != 1 or n_js == 0:
        sys.exit(f"unexpected page shape: {n_css} stylesheet(s), {n_js} script(s)")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"{out}: {out.stat().st_size / 1024:.0f} KB, {n_js} scripts inlined, test menu {'left out' if release else 'INCLUDED'}")


if __name__ == "__main__":
    main()
