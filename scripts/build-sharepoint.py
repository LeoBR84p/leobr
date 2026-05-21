#!/usr/bin/env python3
"""Build self-contained SharePoint pack from main presentation files."""

from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sharepoint" / "index.html"

HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
JS = (ROOT / "presentation.js").read_text(encoding="utf-8")

HTML = HTML.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{CSS}\n</style>")
HTML = HTML.replace('<script src="presentation.js"></script>', f"<script>\n{JS}\n</script>")
HTML = re.sub(r'src="images/', 'src="./images/', HTML)
HTML = re.sub(r'src="norma_ai\.mp4"', 'src="./norma_ai.mp4"', HTML)
HTML = re.sub(r'src="alfanumerico\.mp4"', 'src="./alfanumerico.mp4"', HTML)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML, encoding="utf-8")

for video_name in ("norma_ai.mp4", "alfanumerico.mp4"):
    video_path = ROOT / video_name
    if video_path.exists():
        shutil.copy2(video_path, OUT.parent / video_name)

print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
