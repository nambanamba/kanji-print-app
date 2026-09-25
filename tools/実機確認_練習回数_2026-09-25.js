/* 「練習した回数」の画面を、スマホ幅（390px）で実際にクリックして確かめる（確認ポイント 3-4）。
   ⚠️ これは「人が見るための画像＋クリックの記録」です。合否を決める検査は
      tools/練習した回数を検査する.js のほうです。

   使い方: node tools/実機確認_練習回数_2026-09-25.js [--public]
     --public で公開ずみの GitHub Pages を見ます（0-4「直した」と「届いた」は別）。
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
// ⚠️ playwright はこのフォルダではなく**グローバル**に入っています。そのまま走らせると
//    「Cannot find module 'playwright'」で落ちます。NODE_PATH を付けてください（2026-09-24）:
//      PowerShell : $env:NODE_PATH="$env:APPDATA/npm/node_modules"; node <このファイル>
//      Bash       : NODE_PATH=$(npm root -g) node <このファイル>
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8191;
const 公開 = process.argv.includes('--public');
const 公開URL = 'https://nambanamba.github.io/kanji-print-app/index.html';
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

const 記録 = [];
const 言う = t => { 記録.push(t); console.log(t); };
const 名 = 公開 ? '公開版' : 'ローカル';

(async () => {
  const server = 公開 ? null : await serve();
  const url = 公開 ? 公開URL + '?cb=' + Date.now() : `http://127.0.0.1:${PORT}/index.html`;
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await c.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  言う(`見ているもの: ${公開 ? '★公開版 ' + 公開URL : 'ローカル'}`);

  // ★届いているかの門。届いていなければ、以降の確認は意味がないのでここで止める
  const 届いた = await page.evaluate(() => ({
    fn: typeof countPracticeSheet === 'function' && typeof practiceCountOf === 'function',
    key: typeof PRACTICE_KEY !== 'undefined' ? PRACTICE_KEY : null
  }));
  言う(`     数える仕組みが届いているか: 関数=${届いた.fn} / キー=${届いた.key}`);
  if (!届いた.fn || 届いた.key !== 'kanji_app_practice_count_v1') {
    言う('     ✖ 届いていません。ここで止めます（公開直後ならしばらく待って、もう一度）。');
    await b.close(); if (server) server.close(); process.exit(1);
  }

  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  // 印刷ダイアログで止まらないように。⚠️ 潰すのは window.print だけ（本体の関数はそのまま）
  await page.evaluate(() => { window.print = () => {}; });

  // --- ① まだ0回のとき、一覧に「練習 N回」が出ていないこと ---
  await page.click('#tab-history');
  await page.waitForTimeout(200);
  const 回 = await page.evaluate(() => document.getElementById('list-unit-select').value);
  // ⚠️ 説明は .hist-note ではなく <details class="hist-guide"> の中にあります。
  //    2026-09-25 に説明を1つにまとめてたたんだとき、ここが .hist-note を見たままで
  //    「(無し)」と出し、★何も確かめていないのに素通りしていました（確認ポイント 4-6d）。
  //    ★「見つからなければ (無し) と書く」ではなく「★見つからなければ鳴る」形にしてあります
  const 前 = await page.evaluate(() => {
    const g = document.querySelector('#history-list-container .hist-guide');
    return {
      バッジ: document.querySelectorAll('#history-list-container .word-practiced').length,
      説明あり: !!g,
      たたまれている: g ? !g.open : null,
      たたんだ高さ: g ? Math.round(g.getBoundingClientRect().height) : null,
      案内: g ? g.textContent.replace(/\s+/g, ' ').trim() : null
    };
  });
  言う(`【①】まだ0回のとき（回: ${回}）→ 「練習 N回」のバッジ ${前.バッジ}個（0 であるべき）`);
  言う(`     説明のブロックがある: ${前.説明あり} / たたまれている: ${前.たたまれている} / 高さ ${前.たたんだ高さ}px`);
  if (!前.説明あり || !前.案内.includes('練習 N回')) {
    言う('     ✖ 「練習 N回」の説明が見つかりません。ここで止めます（検査が空振りしないように）。');
    await b.close(); if (server) server.close(); process.exit(1);
  }
  if (前.バッジ !== 0) { 言う('     ✖ まだ0回なのにバッジが出ています'); }
  言う(`     まだ数えていないときの文: ${前.案内.includes('まだ1回も数えていません') ? 'OK「まだ1回も数えていません…」が出ている' : '✖ 見当たらない'}`);

  // --- ② ①テストプリントを押す → 増えないこと ---
  await page.click('#tab-home');
  await page.waitForTimeout(200);
  await page.evaluate(() => { selectedUnits = new Set([document.getElementById('list-unit-select').value]); currentSet = []; generateDailySet(false); });
  const 出す語 = await page.evaluate(() => currentSet.map(d => d.word));
  await page.click('text=① テストプリントを印刷');
  await page.waitForTimeout(300);
  const テスト後 = await page.evaluate(() => localStorage.getItem('kanji_app_practice_count_v1'));
  言う(`【②】① テストプリントを押した → 保存: ${テスト後 === null ? 'まだ無し（増えていない）' : テスト後}`);

  // --- ③ ②練習プリントを押す → 出した語が1回ずつ増える ---
  await page.click('text=② 練習プリントを印刷');
  await page.waitForTimeout(300);
  const 練習後 = await page.evaluate(() => {
    const o = JSON.parse(localStorage.getItem('kanji_app_practice_count_v1'));
    return { 語数: Object.keys(o.counts).length, 最大: Math.max(...Object.values(o.counts)), since: o.since, 指紋: o.done.sigs.length };
  });
  言う(`【③】② 練習プリントを押した → 数えた語 ${練習後.語数}語（出した ${出す語.length}語と同じであるべき） / いちばん多い語 ${練習後.最大}回 / 数え始めた日 ${練習後.since}`);

  // --- ④ 同じ紙を2回 刷り直す → 増えないこと ---
  await page.click('text=② 練習プリントを印刷');
  await page.waitForTimeout(250);
  await page.click('text=② 練習プリントを印刷');
  await page.waitForTimeout(250);
  const 刷り直し後 = await page.evaluate(() => {
    const o = JSON.parse(localStorage.getItem('kanji_app_practice_count_v1'));
    return { 最大: Math.max(...Object.values(o.counts)), 指紋: o.done.sigs.length };
  });
  言う(`【④】同じ紙をさらに2回 刷り直した → いちばん多い語 ${刷り直し後.最大}回（1 のままであるべき） / その日の指紋 ${刷り直し後.指紋}個`);

  // --- ⑤ 一覧に「練習 1回」が出ること。0回の語には出ないこと ---
  await page.click('#tab-history');
  await page.waitForTimeout(300);
  const 後 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#history-list-container .word-row')];
    const バッジ = rows.filter(r => r.querySelector('.word-practiced'));
    return {
      行: rows.length,
      バッジ数: バッジ.length,
      例: バッジ.slice(0, 3).map(r => ({
        語: r.querySelector('.word-main').textContent.replace(/おすすめ|練習 \d+回/g, '').trim(),
        印: r.querySelector('.word-practiced').textContent.trim()
      })),
      バッジ無し: rows.filter(r => !r.querySelector('.word-practiced')).length,
      案内: (document.querySelector('#history-list-container .hist-guide') || {}).textContent || ''
    };
  });
  言う(`【⑤】一覧: ${後.行}行のうち バッジあり ${後.バッジ数}行 / バッジ無し ${後.バッジ無し}行（0回の語には出ない）`);
  後.例.forEach(x => 言う(`     ${x.語} … ${x.印}`));
  const 日付あり = /\d{4}-\d{2}-\d{2} から数えています/.test(後.案内.replace(/\s+/g, ' '));
  言う(`     「◯◯ から数えています」が説明に入った: ${日付あり}（true であるべき）`);
  if (!日付あり) 言う('     ✖ 数え始めた日が出ていません');
  await page.screenshot({ path: path.join(__dirname, 名 + '_練習回数_一覧_390px.png') });

  // --- ⑤b 説明を開いたら、4つの印の説明が全部読めること ---
  await page.evaluate(() => { document.querySelector('.hist-guide').open = true; });
  await page.waitForTimeout(200);
  const 開いた = await page.evaluate(() => {
    const g = document.querySelector('.hist-guide');
    const t = g.textContent.replace(/\s+/g, ' ');
    return { 高さ: Math.round(g.getBoundingClientRect().height),
             そろっている: ['チェック', '最優先', 'おすすめ', '練習 N回'].filter(k => t.includes(k)) };
  });
  言う(`【⑤b】説明を開いた → 高さ ${開いた.高さ}px / 書いてある印: ${開いた.そろっている.join('・')}（4つそろうべき）`);
  await page.screenshot({ path: path.join(__dirname, 名 + '_練習回数_説明を開く_390px.png') });
  await page.evaluate(() => { document.querySelector('.hist-guide').open = false; });
  await page.waitForTimeout(150);

  // --- ⑥ 390px ではみ出していないか ---
  const はみ出し = await page.evaluate(() => {
    const w = document.documentElement.clientWidth, 悪い = [];
    document.querySelectorAll('#screen-history .word-row, #screen-history .word-practiced, #screen-history .hist-note').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.right > w + 1 || r.left < -1) 悪い.push(`${e.className}: left=${Math.round(r.left)} right=${Math.round(r.right)} (幅 ${w})`);
    });
    return 悪い;
  });
  言う(`【⑥】390px で画面からはみ出している要素: ${はみ出し.length}件`);
  はみ出し.slice(0, 6).forEach(x => 言う(`     ✖ ${x}`));

  // --- ⑦ 紙には出ていないこと（目でも見られるように1枚描く）---
  const 紙 = await page.evaluate(() => {
    const rp = window.print; window.print = () => {};
    try { renderPracticePrint(); } finally { window.print = rp; }
    const t = document.getElementById('print-region').textContent;
    return { 練習の字: t.includes('練習 1回'), から数えて: t.includes('から数えています') };
  });
  言う(`【⑦】練習プリントの紙に「練習 1回」が出ているか: ${紙.練習の字}（false であるべき） / 「から数えています」: ${紙.から数えて}（false であるべき）`);

  fs.writeFileSync(path.join(__dirname, '実機確認_練習回数_' + 名 + '_2026-09-25_結果.txt'), 記録.join('\n') + '\n', 'utf8');
  console.log('\n→ 画像と結果テキストを tools/ に書きました。');
  await b.close(); if (server) server.close();
})();
