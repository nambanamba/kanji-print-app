/* テストプリント（①）の紙に、その紙の答えが印刷されていないかを数える。

   ★数えているもの: 実際に描かれた #print-region の .test-item のテキストに、
     その紙に載っている10語の「答え（word）」が現れるか。
   ★見ていないもの:
     - 言いかえ（「上皇が位をゆずったあとの政治」→ 院政 のように、漢字が出ていない推測）
     - 練習プリント（②）。あちらはお手本＝答えが載っているのが仕様
     - 読みだけで子どもが漢字を決められるか（別の道具: 読みだけで決まるか.js）

   ★対照つき: 直す前の版（git HEAD の index.html）にも同じ検査を当てて、
     ちゃんと鳴る（25枚・57語が出る）ことを先に確かめてから、直した版を測る。
     鳴らなければ結果を出さずに止まる。

   使い方: node tools\紙に答えが出ていないか.js
*/
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

function serve(dir, port) {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  return new Promise(res => {
    const s = http.createServer((req, rep) => {
      const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rep.writeHead(404); return rep.end('nf'); }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      rep.end(fs.readFileSync(p));
    });
    s.listen(port, '127.0.0.1', () => res(s));
  });
}

/* 1つの版を測る。回ごとに「高だけ」を10語ずつ区切り、その紙を実際に描かせて中身を読む */
async function measure(browser, port, label) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && typeof renderTestPrint === 'function');

  const result = await page.evaluate(() => {
    const out = { 枚数: 0, 露出した枚数: 0, 露出したのべ語数: 0, 明細: [] };
    const byUnit = {};
    KANJI_DATA.filter(d => d.priority === '高')
      .forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const realPrint = window.print;
    window.print = () => {};                       // 印刷ダイアログは出さない
    try {
      Object.keys(byUnit).forEach(u => {
        const items = byUnit[u];
        for (let i = 0; i < items.length; i += 10) {
          const sheet = items.slice(i, i + 10);
          currentSet = sheet;
          selectedUnits = new Set([u]);
          renderTestPrint();
          const 紙の文字 = [...document.querySelectorAll('#print-region .test-item')]
            .map(e => e.textContent).join('\n');
          const 出た = sheet.map(d => d.word).filter(w => 紙の文字.includes(w));
          out.枚数++;
          if (出た.length) {
            out.露出した枚数++;
            out.露出したのべ語数 += new Set(出た).size;
            if (out.明細.length < 15) out.明細.push(`${u} ${Math.floor(i / 10) + 1}枚目: ${[...new Set(出た)].join('・')}`);
          }
        }
      });
    } finally { window.print = realPrint; }
    return out;
  });
  await ctx.close();
  console.log(`【${label}】 紙 ${result.枚数}枚 / 答えが印刷されている紙 ${result.露出した枚数}枚 / のべ ${result.露出したのべ語数}語`);
  result.明細.forEach(m => console.log('    ・' + m));
  return result;
}

(async () => {
  // --- 直す前の版を、git から取り出して別フォルダに置く（対照用） ---
  const old = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-old-'));
  const head = execFileSync('git', ['-C', ROOT, 'show', 'HEAD:index.html'], { encoding: 'buffer' });
  fs.writeFileSync(path.join(old, 'index.html'), head);
  fs.copyFileSync(path.join(ROOT, 'kanji-data.js'), path.join(old, 'kanji-data.js'));

  const sOld = await serve(old, 8131);
  const sNew = await serve(ROOT, 8132);
  const browser = await chromium.launch({ channel: 'chrome' });

  console.log('=== 対照：直す前の版（git HEAD）で、検査が鳴るか ===');
  const before = await measure(browser, 8131, '直す前（HEAD）');
  if (before.露出した枚数 === 0) {
    console.error('\n✖ 対照が鳴りませんでした。検査が壊れている可能性があるので、結果を出さずに止めます。');
    await browser.close(); sOld.close(); sNew.close(); fs.rmSync(old, { recursive: true, force: true });
    process.exit(3);
  }
  console.log('  → 鳴りました。この検査は空振りではありません\n');

  console.log('=== 本番：いまの版 ===');
  const after = await measure(browser, 8132, 'いまの版');

  // 練習プリント（②）にはヒントが出ていること
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8132/index.html');
  await page.waitForFunction(() => typeof renderPracticePrint === 'function');
  const prac = await page.evaluate(() => {
    const sheet = KANJI_DATA.filter(d => d.unitKey === KANJI_UNITS[3].key).slice(0, 10);
    currentSet = sheet; selectedUnits = new Set([KANJI_UNITS[3].key]);
    const realPrint = window.print; window.print = () => {};
    try { renderPracticePrint(); } finally { window.print = realPrint; }
    const means = [...document.querySelectorAll('#print-region .p-mean-sub')].map(e => e.textContent.trim());
    const words = [...document.querySelectorAll('#print-region .p-sample-word')].map(e => e.textContent.trim());
    return { 意味の数: means.length, お手本の数: words.length, 一致: sheet.every((d, i) => means[i] === d.mean) };
  });
  await ctx.close();
  console.log(`\n=== 練習プリント（②） ===\n  お手本 ${prac.お手本の数}語 / 意味 ${prac.意味の数}件 / データと一致: ${prac.一致}`);

  await browser.close(); sOld.close(); sNew.close();
  fs.rmSync(old, { recursive: true, force: true });

  let ng = 0;
  const check = (n, c) => { console.log((c ? '  OK   ' : '  NG   ') + n); if (!c) ng++; };
  console.log('\n=== 判定 ===');
  check(`直す前は ${before.露出した枚数}枚で答えが漏れていた（対照が鳴った）`, before.露出した枚数 > 0);
  check('いまの版は 0枚（答えが1語も印刷されていない）', after.露出した枚数 === 0);
  check('紙の枚数は前後で同じ（出題の選び方は変えていない）', before.枚数 === after.枚数);
  check('練習プリントには10語ぶんの意味が出ている', prac.意味の数 === 10 && prac.一致);
  console.log('\nNG 合計: ' + ng);
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
