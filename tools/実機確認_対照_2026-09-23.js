/* 対照（2026-09-23）：本検査（実機確認_選ぶ手間_2026-09-23.js）が
   「鳴るべきときに鳴る」ことを確かめるためだけの走行。

   仕込み: 1日目の10語を⭕にし、その「正解した日」を1年前に書きかえる。
   - 「正解ずみを除く」ON  … その10語は二度と出ない（＝本検査が OK になる状態）
   - 「正解ずみを除く」OFF … 正解が古い順に並ぶので、その10語がまた先頭に来る
                              （＝本検査の「1語も重なっていない」が NG になるはずの状態）
   両方を1回の走行で比べ、OFF 側で本当に重なることを確かめる。
   ★これが重ならないなら、本検査の「重なっていない」は何も見ていないことになる。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8124;
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

  const setup = async (filterOn) => {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
    await page.click('button:has-text("すべて選ぶ")');
    await page.click('#prio-high');
    if (filterOn) await page.click('#filter-unmastered');
    await page.click('#count-chips .chip[data-count="10"]');
    // ★setCount は currentSet を空にするだけで作り直さない。
    //   ここで作らせないと day1 が [] になり、対照が成立しない（実際に一度そうなった）
    await page.click('a:has-text("別の問題に出題し直す")');
    await page.waitForTimeout(200);
    const day1 = await page.evaluate(() => currentSet.map(d => d.id));
    if (day1.length !== 10) throw new Error('仕込み失敗: day1 が ' + day1.length + '語');
    // 仕込み：対象の語を「ひととおり全部やり終えた」状態にし、
    //         1日目の10語だけ、いちばん古い正解日（1年前）にする。
    // ※ 未正解の語が1つでも残っていると、未正解（lastCorrectAt=0）が必ず先に来るので、
    //   「古い語が戻ってくる」かどうかは試せない。全部やり終えた状態が、この違いの出る場面。
    await page.evaluate(ids => {
      const m = JSON.parse(localStorage.getItem('kq_kanji_stats_v1') || '{}');
      const day = 24 * 3600 * 1000;
      getPool().forEach((d, i) => {
        const t = Date.now() - (ids.includes(d.id) ? 365 * day : 1 * day + i);
        m[d.id] = { correct: 1, wrong: 0, lastAnswered: t, lastCorrectAt: t, box: 1 };
      });
      localStorage.setItem('kq_kanji_stats_v1', JSON.stringify(m));
    }, day1);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
    const day2 = await page.evaluate(() => currentSet.map(d => d.id));
    const dup = day2.filter(id => day1.includes(id));
    return { day1, day2, dup };
  };

  const on = await setup(true);
  const off = await setup(false);

  console.log('【正解ずみを除く ON 】 1日目と2日目の重なり: ' + on.dup.length + '語');
  console.log('【正解ずみを除く OFF】 1日目と2日目の重なり: ' + off.dup.length + '語  ' +
    (off.dup.length ? '（' + off.dup.join(',') + '）' : ''));

  let ng = 0;
  const check = (n, c) => { console.log((c ? '  OK   ' : '  NG   ') + n); if (!c) ng++; };
  console.log('【ON】2日目の語数: ' + on.day2.length + ' / 【OFF】2日目の語数: ' + off.day2.length);
  check('ON のときは重ならない（＝本検査が OK になる状態を再現できた）', on.dup.length === 0);
  check('★OFF にすると、いちばん古い10語がそのまま戻ってくる＝本検査の「重なっていない」はちゃんと鳴る',
    off.dup.length === 10);
  check('ON のときは、ひととおり終わると0語になる（出す語が尽きる）', on.day2.length === 0);
  console.log('\n対照 NG 合計: ' + ng);

  await browser.close();
  server.close();
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
