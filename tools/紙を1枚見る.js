/* 指定した語を含むテストプリントを1枚描いて、画像にする（人が見るため）。
   使い方: node tools\紙を1枚見る.js <語> [--public]
     例: node tools\紙を1枚見る.js 呉 --public
   --public を付けると、ローカルではなく公開ずみの GitHub Pages を見ます。
   ⚠️ これは検査ではありません。目で見るための画像を作るだけです。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
// ⚠️ playwright はこのフォルダではなく**グローバル**に入っています。そのまま走らせると
//    「Cannot find module 'playwright'」で落ちます。NODE_PATH を付けてください（2026-09-24）:
//      PowerShell : $env:NODE_PATH="$env:APPDATA/npm/node_modules"; node <このファイル>
//      Bash       : NODE_PATH=$(npm root -g) node <このファイル>
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8143;
const 語 = process.argv[2];
const 公開 = process.argv.includes('--public');
if (!語) { console.error('語を指定してください。例: node tools\\紙を1枚見る.js 呉'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const serve = () => new Promise(r => {
  const s = http.createServer((q, p) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { p.writeHead(404); return p.end('nf'); }
    p.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    p.end(fs.readFileSync(f));
  });
  s.listen(PORT, '127.0.0.1', () => r(s));
});

(async () => {
  const server = 公開 ? null : await serve();
  const url = 公開
    ? 'https://nambanamba.github.io/kanji-print-app/index.html?cb=' + Date.now()
    : `http://127.0.0.1:${PORT}/index.html`;
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await c.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && typeof TEST_NOTES !== 'undefined');

  const info = await page.evaluate(w => {
    const d = KANJI_DATA.find(x => x.word === w);
    if (!d) return { err: `「${w}」は kanji-data.js にありません` };
    const unit = KANJI_DATA.filter(x => x.unitKey === d.unitKey);
    const sheet = [d, ...unit.filter(x => x.word !== w).slice(0, 9)];
    currentSet = sheet; selectedUnits = new Set([d.unitKey]);
    const rp = window.print; window.print = () => {};
    try { renderTestPrint(); } finally { window.print = rp; }
    return {
      単元: d.unitKey,
      行: [...document.querySelectorAll('#print-region .test-item .test-q-text')]
        .map(e => e.textContent.replace(/\s+/g, ' ').trim())
    };
  }, 語);
  if (info.err) { console.error(info.err); await b.close(); if (server) server.close(); process.exit(2); }

  console.log(`${公開 ? '公開版' : 'ローカル'} ／ ${info.単元}`);
  info.行.forEach(t => console.log('  ' + t));

  await page.emulateMedia({ media: 'print' });
  const out = path.join(__dirname, `紙_${語}_${公開 ? '公開版' : 'ローカル'}.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log('画像: ' + out);
  await b.close(); if (server) server.close();
})().catch(e => { console.error(e); process.exit(2); });
