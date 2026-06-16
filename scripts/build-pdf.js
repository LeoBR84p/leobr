#!/usr/bin/env node
/*
 * Gera DECOI-apresentacao.pdf a partir da versao web interativa (index.html).
 *
 * Navega pela apresentacao usando a propria mecanica de slides (setas),
 * de modo que cada slide atinja seu estado visivel real, captura cada
 * slide em 16:9 e monta um PDF com uma pagina por slide.
 *
 * Os slides com video recebem um placeholder no lugar do video, pois o
 * Chromium headless nao decodifica o frame e o PDF e estatico.
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
const SETTLE = 3500; // tempo para a transicao + animacoes de entrada assentarem
                     // (o maior delay de animacao chega a ~3.3s nos slides Norma.AI)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
  await page.goto('file://' + path.join(REPO, 'index.html'), { waitUntil: 'networkidle0', timeout: 120000 });

  // Esconde apenas a UI de navegacao e as particulas (sem mexer nas animacoes
  // de conteudo, que serao acionadas pela navegacao real).
  await page.addStyleTag({ content: `
    #nav-controls, #btn-overview, #progress-bar, #slide-counter, #gold-particles { display: none !important; }
    .pdf-video-placeholder {
      position: absolute; inset: 0; z-index: 10;
      display: flex; align-items: center; justify-content: center; text-align: center;
      background: #0e1217; color: #d4b06a;
      font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 600; letter-spacing: .02em;
      padding: 24px;
    }
  `});

  // Substitui cada <video> por um placeholder com a mensagem indicada.
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => {
      const wrap = v.closest('.norma-ai__video-wrap') || v.parentElement;
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      v.muted = true;
      v.style.visibility = 'hidden';
      const ph = document.createElement('div');
      ph.className = 'pdf-video-placeholder';
      ph.textContent = '<vídeo não disponível nessa versão>';
      wrap.appendChild(ph);
    });
  });

  await page.evaluateHandle('document.fonts.ready');
  await sleep(SETTLE); // deixa o slide 1 assentar

  const waitImages = () => page.evaluate(async () => {
    const imgs = [...document.images].filter(i => !i.complete);
    await Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; })));
  });

  const shots = [];
  for (let n = 1; n <= TOTAL; n++) {
    if (n > 1) {
      await page.keyboard.press('ArrowRight'); // navega para o proximo slide
      await sleep(SETTLE);
    }
    await waitImages();
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
