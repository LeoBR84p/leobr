#!/usr/bin/env python3
"""Build a single fully self-contained decoi-standalone.html.

- Inlines styles.css and presentation.js.
- Embeds every slide image as a base64 data URI.
- Replaces the <video> elements with a "vídeo não disponível" placeholder
  (videos are intentionally NOT embedded to keep the file lightweight).

This script only WRITES decoi-standalone.html at the repo root. It never
touches index.html / styles.css / presentation.js or the Pages workflow,
so the existing presentation and the GitHub Pages deploy stay unchanged.
"""

from pathlib import Path
import base64
import mimetypes
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "decoi-standalone.html"

HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
JS = (ROOT / "presentation.js").read_text(encoding="utf-8")

GOOGLE_FONTS_URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Inter:wght@300;400;500;600;700;800;900"
    "&family=Playfair+Display:wght@400;600;700&display=swap"
)
# Subsets kept for the offline build (enough for Portuguese accents).
FONT_SUBSETS = {"latin", "latin-ext"}
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": BROWSER_UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def build_inline_fonts() -> str | None:
    """Return @font-face CSS with woff2 embedded as data URIs, or None on failure."""
    try:
        css = _get(GOOGLE_FONTS_URL).decode("utf-8")
    except Exception as exc:  # network unavailable → caller keeps the <link>
        print(f"  ! could not fetch Google Fonts CSS ({exc}); keeping <link>")
        return None

    blocks = re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face\s*\{.*?\})", css, re.DOTALL)
    out, kept, embedded = [], 0, 0
    for subset, block in blocks:
        if subset not in FONT_SUBSETS:
            continue
        kept += 1

        def embed_woff2(m: re.Match) -> str:
            nonlocal embedded
            data = _get(m.group(1))
            b64 = base64.b64encode(data).decode("ascii")
            embedded += 1
            return f"url(data:font/woff2;base64,{b64}) format('woff2')"

        try:
            block = re.sub(
                r"url\((https://[^)]+\.woff2)\)\s*format\('woff2'\)",
                embed_woff2,
                block,
            )
        except Exception as exc:
            print(f"  ! failed to embed a woff2 ({exc}); keeping <link>")
            return None
        out.append(block)

    if not out:
        return None
    print(f"  fonts: kept {kept} @font-face blocks, embedded {embedded} woff2 files")
    return "\n".join(out)


# Styling for the video placeholder (appended to the inlined CSS only).
PLACEHOLDER_CSS = """
/* ── Standalone build: substituto para vídeos não embutidos ── */
.norma-ai__video--placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 40%, #0b1626 0%, #050a14 70%);
    color: rgba(184, 148, 79, 0.85);
    text-align: center;
    padding: 2rem;
    box-sizing: border-box;
}
.norma-ai__video--placeholder svg { opacity: 0.65; }
.norma-ai__video--placeholder span {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(220, 210, 190, 0.9);
    max-width: 22ch;
}
"""

PLACEHOLDER_HTML = (
    '<div class="norma-ai__video norma-ai__video--placeholder" role="img" '
    'aria-label="Vídeo não disponível nesta versão">'
    '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="1.5" aria-hidden="true">'
    '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'
    '<line x1="2" y1="2" x2="22" y2="22"/></svg>'
    '<span>Vídeo não disponível nesta versão</span></div>'
)

# 0) Embed Google Fonts (latin/latin-ext) as @font-face data URIs when possible.
font_css = build_inline_fonts()
if font_css:
    # Drop the preconnect hints (no longer needed once fonts are inlined).
    HTML = re.sub(
        r'\s*<link rel="preconnect" href="https://fonts\.g[^"]*"[^>]*>', "", HTML
    )
    HTML = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">',
        lambda m: f"<style>\n{font_css}\n</style>",
        HTML,
    )

# 1) Inline CSS (+ placeholder rules) and JS, dropping the cache-busting query.
# (function replacements avoid re.sub interpreting backslashes in CSS/JS)
HTML = re.sub(
    r'<link rel="stylesheet" href="styles\.css[^"]*">',
    lambda m: f"<style>\n{CSS}\n{PLACEHOLDER_CSS}\n</style>",
    HTML,
)
HTML = re.sub(
    r'<script src="presentation\.js[^"]*"></script>',
    lambda m: f"<script>\n{JS}\n</script>",
    HTML,
)

# 2) Replace <video> elements FIRST (their src also lives under images/).
HTML = re.sub(r"<video\b[^>]*>\s*</video>", lambda m: PLACEHOLDER_HTML, HTML)

# 3) Embed every remaining images/ reference as a base64 data URI.
def embed_image(match: re.Match) -> str:
    rel = urllib.parse.unquote(match.group(1))
    path = ROOT / rel
    if not path.exists():
        print(f"  ! missing image, left as-is: {rel}")
        return match.group(0)
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f'src="data:{mime};base64,{b64}"'

HTML, n_imgs = re.subn(r'src="(images/[^"]+)"', embed_image, HTML)

OUT.write_text(HTML, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB) — {n_imgs} images embedded")
