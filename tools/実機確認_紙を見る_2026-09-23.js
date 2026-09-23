/* 紙になる中身を、目で見られる画像にする（確認ポイント 3-4：最後は必ず目で見る） */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const PORT = 8126;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rep) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rep.writeHead(404); return rep.end('nf'); }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      rep.end(fs.readFileSync(p));
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ channel: 'chrome' });
  // A4 相当（96dpi で 794x1123）でプリント表示を見る
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
  await page.click('button:has-text("クリア")');
  await page.click('#unit-grid-container .unit-btn:has-text("第4回")');
  await page.click('#prio-high');
  await page.click('#filter-unmastered');
  await page.click('#count-chips .chip[data-count="10"]');
  await page.click('a:has-text("別の問題に出題し直す")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("① テストプリントを印刷")');
  await page.waitForTimeout(400);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(200);
  const out1 = path.join(__dirname, '紙_テスト_2026-09-23.png');
  await page.screenshot({ path: out1, fullPage: true });
  console.log('テストプリント: ' + out1);
  await page.emulateMedia({ media: 'screen' });
  await page.click('button:has-text("② 練習プリントを印刷")');
  await page.waitForTimeout(400);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(200);
  const out2 = path.join(__dirname, '紙_練習_2026-09-23.png');
  await page.screenshot({ path: out2, fullPage: true });
  console.log('練習プリント: ' + out2);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(2); });
