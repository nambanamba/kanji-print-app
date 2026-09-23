/* 添え書きが、本当に紙に出ているかを確かめる。
   ★「紙に答えが出ていないか.js が0枚」だけでは足りません。
     何も足していなくても0枚になるので、「足したものが効いているか」は別に見ます
     （確認ポイント 0-3：「書いた」を「効いている」の証拠にしない）。

   見るもの
     1. TEST_NOTES の語が出る紙で、添え書きが .test-item の中に出ているか
     2. 表に無い語には付いていないか（付けすぎていないか）
     3. 租・庸・調 が同じ紙に並んだとき、3つとも違う添え書きが出るか

   見ていないもの
     - 添え書きの文面の良し悪し（tools\添え書き案を検査する.js）
     - 紙に答えが漏れていないか（tools\紙に答えが出ていないか.js）
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8141;
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
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && typeof TEST_NOTES !== 'undefined');

  const r = await page.evaluate(() => {
    const realPrint = window.print; window.print = () => {};
    const out = { 表の語数: Object.keys(TEST_NOTES).length, 出た: [], 出なかった: [], 余計に付いた: [], 外に出た: 0 };
    try {
      // 表にある語を1つずつ、その語を含む紙にして描かせる
      Object.keys(TEST_NOTES).forEach(word => {
        const d = KANJI_DATA.find(x => x.word === word);
        if (!d) { out.出なかった.push(word + '（データに無い）'); return; }
        // その語を含む10語の紙を作る（同じ単元から）
        const unit = KANJI_DATA.filter(x => x.unitKey === d.unitKey);
        const sheet = [d, ...unit.filter(x => x.word !== word).slice(0, 9)];
        currentSet = sheet; selectedUnits = new Set([d.unitKey]);
        renderTestPrint();
        // ★.test-item の中にあることを確かめる（外に出ていたら検査から外れる）
        const inItem = [...document.querySelectorAll('#print-region .test-item .test-note')];
        const all = [...document.querySelectorAll('#print-region .test-note')];
        out.外に出た += all.length - inItem.length;
        const txt = inItem.map(e => e.textContent).join('');
        if (txt.includes(TEST_NOTES[word])) out.出た.push(`${word} →（${TEST_NOTES[word]}）`);
        else out.出なかった.push(word);
        // 表に無い語に付いていないか
        sheet.forEach((it, i) => {
          const el = document.querySelectorAll('#print-region .test-item')[i].querySelector('.test-note');
          if (el && !TEST_NOTES[it.word]) out.余計に付いた.push(`${it.word}「${el.textContent}」`);
        });
      });

      // 租・庸・調 が並ぶ紙（第3回）
      const 三 = ['租', '庸', '調'].map(w => KANJI_DATA.find(x => x.word === w));
      const 他 = KANJI_DATA.filter(x => x.unitKey === '第3回' && !['租', '庸', '調'].includes(x.word)).slice(0, 7);
      currentSet = [...三, ...他]; selectedUnits = new Set(['第3回']);
      renderTestPrint();
      out.三つの紙 = [...document.querySelectorAll('#print-region .test-item .test-q-text')]
        .slice(0, 3).map(e => e.textContent.replace(/\s+/g, ' ').trim());
    } finally { window.print = realPrint; }
    return out;
  });

  console.log(`TEST_NOTES の語数: ${r.表の語数}`);
  console.log(`\n=== 紙に出た添え書き: ${r.出た.length} / ${r.表の語数} ===`);
  r.出た.forEach(x => console.log('  ' + x));
  if (r.出なかった.length) { console.log('\n★出なかった:'); r.出なかった.forEach(x => console.log('  ' + x)); }
  if (r.余計に付いた.length) { console.log('\n★表に無い語に付いた:'); r.余計に付いた.forEach(x => console.log('  ' + x)); }

  console.log('\n=== 租・庸・調 が同じ紙に並んだとき ===');
  r.三つの紙.forEach(t => console.log('  ' + t));

  let ng = 0;
  const check = (n, c) => { console.log((c ? '  OK   ' : '  NG   ') + n); if (!c) ng++; };
  console.log('\n=== 判定 ===');
  check(`表の${r.表の語数}語すべてに添え書きが出た`, r.出た.length === r.表の語数);
  check('表に無い語には付いていない', r.余計に付いた.length === 0);
  check('★添え書きはすべて .test-item の中にある（走査から外れていない）', r.外に出た === 0);
  check('租・庸・調 が3つとも違う添え書きで出る',
    new Set(r.三つの紙.map(t => (t.match(/（(.+?)）/) || [])[1])).size === 3);
  console.log('\nNG 合計: ' + ng);

  await browser.close(); server.close();
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
