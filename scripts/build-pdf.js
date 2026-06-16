#!/usr/bin/env node
/*
 * Gera DECOI-apresentacao.pdf a partir da versao web interativa (index.html).
 *
 * Renderiza cada slide num navegador headless (Chromium via puppeteer),
 * congela animacoes/videos, captura cada slide em 16:9 e monta um PDF
 * com uma pagina por slide.
 *
 * Uso:
 *   npm install puppeteer
 *   node scripts/build-pdf.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const OUT = path.join(REPO, 'DECOI-apresentacao.pdf');
const TOTAL = 15;
const W = 1280, H = 720, SCALE = 2;

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
  await page.goto('file://' + path.join(REPO, 'index.html'), { waitUntil: 'networkidle0', timeout: 120000 });

  // Esconde a UI de navegacao + particulas e congela transicoes.
  await page.addStyleTag({ content: `
    #nav-controls, #btn-overview, #progress-bar, #slide-counter, #gold-particles { display: none !important; }
    *, *::before, *::after { transition: none !important; animation: none !important; }
    .slide .kw, .slide .orgmap-dir, .slide .orgmap-unit, .slide .orgmap-legend,
    .slide .orgmap-top, .slide .slide__content, .slide [data-delay] {
      opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important;
    }
  `});

  const shots = [];
  for (let n = 1; n <= TOTAL; n++) {
    await page.evaluate((target) => {
      document.querySelectorAll('.slide').forEach((s, i) => {
        const on = (i + 1) === target;
        s.classList.toggle('active', on);
        s.classList.remove('exit-left', 'exit-right');
        s.style.opacity = on ? '1' : '';
        s.style.transform = 'none';
        s.style.filter = 'none';
        s.style.visibility = on ? 'visible' : '';
      });
    }, n);

    await page.evaluate(async () => {
      document.querySelectorAll('video').forEach(v => { try { v.pause(); v.currentTime = 0.1; } catch (e) {} });
      const imgs = [...document.images].filter(i => !i.complete);
      await Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; })));
    });
    await new Promise(r => setTimeout(r, 600));

    const file = path.join(REPO, `.slide-${String(n).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
    shots.push(file);
    console.log('slide capturado:', n);
  }

  // Monta os screenshots num PDF, um slide por pagina (16:9).
  const pagesHtml = shots.map(f => {
    const b64 = fs.readFileSync(f).toString('base64');
    return `<div class="pg"><img src="data:image/png;base64,${b64}"></div>`;
  }).join('');
  const doc = `<!doctype html><html><head><style>
    @page { size: ${W}px ${H}px; margin: 0; }
    html,body { margin:0; padding:0; }
    .pg { width:${W}px; height:${H}px; page-break-after: always; overflow:hidden; }
    .pg:last-child { page-break-after: auto; }
    img { width:${W}px; height:${H}px; display:block; }
  </style></head><body>${pagesHtml}</body></html>`;

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(doc, { waitUntil: 'load', timeout: 120000 });
  await pdfPage.evaluateHandle('document.fonts.ready');
  await pdfPage.pdf({ path: OUT, width: `${W}px`, height: `${H}px`, printBackground: true });

  await browser.close();
  shots.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
  console.log('PDF gerado em', OUT);
})();
