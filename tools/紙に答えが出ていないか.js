/* テストプリント（①）の紙に、その紙の答えが印刷されていないかを数える。

   ★数えているもの: 実際に描かれた #print-region の .test-item のテキスト全部に、
     その紙に載っている10語の「答え（word）」が現れるか。
     .test-item の textContent を丸ごと見ているので、
     ★**あとで添え書き（ヒント）を足しても、自動的に走査の対象に入ります。**
     （足すときは .test-item の中に入れること。外に置くと、この検査から見えなくなります）

   ★見ていないもの:
     - 言いかえ（「上皇が位をゆずったあとの政治」→ 院政 のように、漢字が出ていない推測）
     - 練習プリント（②）。あちらはお手本＝答えが載っているのが仕様
     - 読みだけで子どもが漢字を決められるか（別の道具: 読みだけで決まるか.js）
     - 添え書きの文面そのものの良し悪し（別の道具: 添え書き案を検査する.js）

   ★入口に自己テストを置いています（確認ポイント 4-6）。
     3つ全部を先に通し、1つでも落ちたら**数字を出さずに終了コード3で止まります。**
       (a) 添え書きから答えが漏れる偽の紙  → 鳴るべき
       (b) 答えを含まない添え書きの偽の紙  → 鳴ってはいけない（鳴りすぎ防止・確認ポイント 4-3）
       (c) 直す前の版（BEFORE_FIX の版）   → 鳴るべき（25枚）

   ⚠️ (c) の比較先を `HEAD` にしてはいけません。
      2026-09-23 に実際に踏みました: 修正を HEAD にコミットした瞬間、
      「直す前の版」が修正後の版になり、対照が鳴らなくなりました。
      **直前の版をコミットで名指しして固定します。**

   使い方: node tools\紙に答えが出ていないか.js
*/
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
// ★ヒントを消す直前のコミット。HEAD にしないこと（上の⚠️参照）
const BEFORE_FIX = '47e6dff';

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

async function open(browser, port) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && typeof renderTestPrint === 'function');
  return { ctx, page };
}

/* 1つの版を測る。回ごとに「高だけ」を10語ずつ区切り、その紙を実際に描かせて中身を読む */
async function measure(page) {
  return page.evaluate(() => {
    const out = { 枚数: 0, 露出した枚数: 0, 露出したのべ語数: 0, 明細: [] };
    const byUnit = {};
    KANJI_DATA.filter(d => d.priority === '高')
      .forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const realPrint = window.print;
    window.print = () => {};
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
          const 出た = [...new Set(sheet.map(d => d.word).filter(w => 紙の文字.includes(w)))];
          out.枚数++;
          if (出た.length) {
            out.露出した枚数++;
            out.露出したのべ語数 += 出た.length;
            if (out.明細.length < 15) out.明細.push(`${u} ${Math.floor(i / 10) + 1}枚目: ${出た.join('・')}`);
          }
        }
      });
    } finally { window.print = realPrint; }
    return out;
  });
}

/* 添え書きを1枚だけ差しこんだ偽の紙を作り、この検査が拾うかを見る。
   ★仕込む中身はデータから作る。特定の語を名指ししない（確認ポイント 4-6b）。 */
async function 偽の紙(page, 漏らす) {
  return page.evaluate(漏らす => {
    const unit = KANJI_UNITS.find(u => KANJI_DATA.filter(d => d.unitKey === u.key).length >= 10).key;
    const sheet = KANJI_DATA.filter(d => d.unitKey === unit).slice(0, 10);
    currentSet = sheet; selectedUnits = new Set([unit]);
    const realPrint = window.print; window.print = () => {};
    try { renderTestPrint(); } finally { window.print = realPrint; }

    // ★index.html はまだ添え書きを持っていないので、ここで DOM に差しこんで「足した状態」を作る
    const items = [...document.querySelectorAll('#print-region .test-item')];
    items.forEach((el, i) => {
      const note = 漏らす
        ? `（${sheet[(i + 1) % sheet.length].word}に関わるもの）`  // 隣の問題の答えを書いてしまった添え書き
        : '（この回で習うもの）';                                   // 答えを含まない添え書き
      const span = document.createElement('span');
      span.className = 'test-note';
      span.textContent = note;
      el.querySelector('.test-q-text').appendChild(span);
    });

    const 紙の文字 = items.map(e => e.textContent).join('\n');
    const 出た = [...new Set(sheet.map(d => d.word).filter(w => 紙の文字.includes(w)))];
    return { 仕込んだ枚数: 1, 拾った語: 出た, 差しこんだ数: items.length };
  }, 漏らす);
}

(async () => {
  const old = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-old-'));
  const before = execFileSync('git', ['-C', ROOT, 'show', `${BEFORE_FIX}:index.html`], { encoding: 'buffer' });
  fs.writeFileSync(path.join(old, 'index.html'), before);
  fs.copyFileSync(path.join(ROOT, 'kanji-data.js'), path.join(old, 'kanji-data.js'));

  const sOld = await serve(old, 8131);
  const sNew = await serve(ROOT, 8132);
  const browser = await chromium.launch({ channel: 'chrome' });
  const stop = async code => {
    await browser.close(); sOld.close(); sNew.close();
    fs.rmSync(old, { recursive: true, force: true });
    process.exit(code);
  };

  /* ================= 入口の自己テスト ================= */
  console.log('=== 自己テスト（3つ全部通らないと、数字を出しません） ===');
  const { ctx: c1, page: p1 } = await open(browser, 8132);

  const a = await 偽の紙(p1, true);
  console.log(`  (a) 添え書きから答えが漏れる偽の紙 … 添え書きを ${a.差しこんだ数}件 差しこみ、拾った語 ${a.拾った語.length}件`);
  if (a.拾った語.length === 0) {
    console.error('  ✖ 鳴りませんでした。添え書きを足しても、この検査は捕まえられません。止めます。');
    await c1.close(); return stop(3);
  }
  console.log('      → 鳴りました（例: ' + a.拾った語.slice(0, 3).join('・') + '）');

  const b = await 偽の紙(p1, false);
  console.log(`  (b) 答えを含まない添え書きの偽の紙 … 拾った語 ${b.拾った語.length}件`);
  if (b.拾った語.length !== 0) {
    console.error('  ✖ 鳴ってはいけないものに鳴りました（鳴りすぎ）。止めます: ' + b.拾った語.join('・'));
    await c1.close(); return stop(3);
  }
  console.log('      → 鳴りませんでした（鳴りすぎていない）');
  await c1.close();

  const { ctx: c2, page: p2 } = await open(browser, 8131);
  const beforeR = await measure(p2);
  await c2.close();
  console.log(`  (c) 直す前の版（${BEFORE_FIX}） … 紙 ${beforeR.枚数}枚 / 答えが印刷されている紙 ${beforeR.露出した枚数}枚 / のべ ${beforeR.露出したのべ語数}語`);
  if (beforeR.露出した枚数 === 0) {
    console.error(`  ✖ 鳴りませんでした。${BEFORE_FIX} が本当にヒントを出す版か確かめてください。止めます。`);
    return stop(3);
  }
  console.log('      → 鳴りました');
  console.log('  自己テスト: 3つとも OK\n');

  /* ================= 本番 ================= */
  const { ctx: c3, page: p3 } = await open(browser, 8132);
  const after = await measure(p3);
  console.log('=== 本番：いまの版 ===');
  console.log(`  紙 ${after.枚数}枚 / 答えが印刷されている紙 ${after.露出した枚数}枚 / のべ ${after.露出したのべ語数}語`);
  after.明細.forEach(m => console.log('    ・' + m));

  const prac = await p3.evaluate(() => {
    const unit = KANJI_UNITS[3].key;
    const sheet = KANJI_DATA.filter(d => d.unitKey === unit).slice(0, 10);
    currentSet = sheet; selectedUnits = new Set([unit]);
    const realPrint = window.print; window.print = () => {};
    try { renderPracticePrint(); } finally { window.print = realPrint; }
    const means = [...document.querySelectorAll('#print-region .p-mean-sub')].map(e => e.textContent.trim());
    const words = [...document.querySelectorAll('#print-region .p-sample-word')].map(e => e.textContent.trim());
    return { 意味の数: means.length, お手本の数: words.length, 一致: sheet.every((d, i) => means[i] === d.mean) };
  });
  await c3.close();
  console.log(`\n=== 練習プリント（②） ===\n  お手本 ${prac.お手本の数}語 / 意味 ${prac.意味の数}件 / データと一致: ${prac.一致}`);

  let ng = 0;
  const check = (n, c) => { console.log((c ? '  OK   ' : '  NG   ') + n); if (!c) ng++; };
  console.log('\n=== 判定 ===');
  check(`直す前（${BEFORE_FIX}）は ${beforeR.露出した枚数}枚で漏れていた（対照が鳴った）`, beforeR.露出した枚数 > 0);
  check('いまの版は 0枚（答えが1語も印刷されていない）', after.露出した枚数 === 0);
  check('紙の枚数は前後で同じ（出題の選び方は変えていない）', beforeR.枚数 === after.枚数);
  check('練習プリントには10語ぶんの意味が出ている', prac.意味の数 === 10 && prac.一致);
  console.log('\nNG 合計: ' + ng);
  await stop(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
