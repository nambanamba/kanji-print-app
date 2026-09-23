/* 追加の実機確認（2026-09-23）
   1) 採点したあと、画面を開いたまま「① 印刷」を押すと、同じ10語が出てしまわないか
   2) 本物の紙（PDF）を1枚作って、10語がちゃんと載っているか目で見られるようにする
   3) 「高だけ」がどれだけ絞れているか（回ごと）の実数
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8125;
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());

  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);

  // ★既定は「全単元が選ばれている」（index.html 694行）。
  //   今週の回だけにするには、いったん「クリア」してから回を1つ押す
  console.log('起動直後の単元: ' + await page.evaluate(() => document.getElementById('selected-units-count').textContent));
  // 実際の使い方に近い形：今週の回（第4回）だけを選ぶ
  await page.click('button:has-text("クリア")');
  await page.click('#unit-grid-container .unit-btn:has-text("第4回")');
  await page.click('#prio-high');
  await page.click('#filter-unmastered');
  await page.click('#count-chips .chip[data-count="10"]');
  await page.click('a:has-text("別の問題に出題し直す")');
  await page.waitForTimeout(200);

  const info = await page.evaluate(() => ({
    label: document.getElementById('selected-units-count').textContent,
    prioNote: document.getElementById('prio-note').textContent,
    progress: document.getElementById('progress-text').textContent
  }));
  console.log('第4回だけ選んだとき: ' + JSON.stringify(info));

  const day1 = await page.evaluate(() => currentSet.map(d => d.word));
  console.log('1回目の10語: ' + day1.join('・'));

  // --- (2) 紙を作って見られるようにする ---
  await page.click('button:has-text("① テストプリントを印刷")');
  await page.waitForTimeout(400);
  const printed = await page.evaluate(() =>
    [...document.querySelectorAll('#print-region .test-item .test-q-text')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  console.log('紙に載った項目数: ' + printed.length);
  printed.forEach(t => console.log('   ' + t));
  const pdf = path.join(__dirname, '実機確認_テストプリント_2026-09-23.pdf');
  await page.pdf({ path: pdf, format: 'A4', printBackground: true });
  console.log('PDF: ' + pdf);

  // --- (1) 採点したあと、開いたまま印刷すると同じ10語か ---
  await page.click('#tab-check');
  await page.click('button:has-text("すべてできた")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("採点結果を保存")');
  await page.waitForTimeout(300);
  const afterGrading = await page.evaluate(() => currentSet.map(d => d.word));
  const same = afterGrading.length === day1.length && afterGrading.every((w, i) => w === day1[i]);
  console.log('\n★採点保存の直後、画面を開いたままの currentSet: ' +
    (same ? '1回目と同じ10語のまま' : '別の語になった') + '（' + afterGrading.join('・') + '）');
  console.log('  → この状態で「① 印刷」を押すと、同じ紙が出ます。' +
    '次の10語にするには「🔄 別の問題に出題し直す」を押すか、開き直しが要ります。');

  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
  const afterReload = await page.evaluate(() => currentSet.map(d => d.word));
  console.log('  開き直したあと: ' + afterReload.join('・'));
  console.log('  1回目との重なり: ' + afterReload.filter(w => day1.includes(w)).length + '語');

  // --- (3) 回ごとの「高だけ」の実数 ---
  const per = await page.evaluate(() => KANJI_UNITS.map(u => {
    const items = KANJI_DATA.filter(d => d.unitKey === u.key);
    return { 回: u.key, 全: items.length, 高: items.filter(d => d.priority === '高').length };
  }));
  console.log('\n回ごとの「高だけ」:');
  per.forEach(p => console.log(`   ${p.回.padEnd(12)} 全${String(p.全).padStart(3)}語 → 高${String(p.高).padStart(3)}語`));

  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(2); });
