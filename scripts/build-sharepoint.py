#!/usr/bin/env python3
"""Build self-contained SharePoint pack from main presentation files."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sharepoint" / "index.html"

HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
JS = (ROOT / "presentation.js").read_text(encoding="utf-8")

HTML = HTML.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{CSS}\n</style>")
HTML = HTML.replace('<script src="presentation.js"></script>', f"<script>\n{JS}\n</script>")
HTML = re.sub(r'src="images/', 'src="./images/', HTML)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
