/* 「練習した回数」の画面を、スマホ幅（390px）で実際にクリックして確かめる（確認ポイント 3-4）。

   ★★2026-09-25b に、この道具の中身を作り直しました。
      「通らないから緩めた」のではなく、★**仕様が変わったので揃えた**ほうです。
        前（〜2b43d78）: ② 練習プリントを刷ると数が増える     ← それを確かめていた
        いま           : ★刷っても増えない。③一覧の「⭕ できた／△ できなかった」で入れる
      ユーザーの言葉:「印刷しても練習してないかもしれないので、正解、練習した記録を入れられるようにしてほしい」

      ★同じ日にもう1つ変わりました: 「△ できなかった」を押したら**前に付いていた ⭕ を外す**
        （ユーザーの判断。今日書けなかった語は、また紙に出す）。
        ⚠️ 外すのは正解の記録だけ。★練習回数は消しません。【④b】で見ています。

      ⚠️ 作り直す前の版をそのまま走らせたら、入口の門が「届いていません」で止めてくれました。
         ★画面を変えたら、その画面を見ている検査を必ず走らせること（4-6h・自分で 09-25 に見つけた型）。

   ★★2026-09-26 に【⑩】を足しました（入力を ②「今日の採点」に一本化）。
      ユーザーの言葉:「★できた、練習したは、同じ画面で入力したいです」
        ②の「保存」で … その紙の語ぜんぶに練習+1／⭕ を押した語に今日の正解／
                         ★押していない語は「できなかった」として ⭕ が外れる
      ⚠️ 【⑩】に入る前に localStorage を空にして開き直します。
         ★【①】〜【⑨】の数を引き継いだまま読むと、数を読み違えます
         （09-25b に Math.max(全語) で実際に踏みました）。
      ③は残します（あとから直すところ）。【⑩】でその案内が画面に出ているかも見ます。

   ⚠️ これは「人が見るための画像＋クリックの記録」です。合否を決める検査は
      tools/練習した回数を検査する.js のほうです。

   使い方: node tools/実機確認_練習回数_2026-09-25.js [--public]
     --public で公開ずみの GitHub Pages を見ます（0-4「直した」と「届いた」は別）。

   ⚠️ playwright はグローバルです。NODE_PATH=$(npm root -g) を付けてください（2026-09-24）。
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
const KEY = 'kanji_app_practice_count_v1';
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
let NG = 0;
const 見る = (ラベル, ok, 詳) => { if (!ok) NG++; 言う(`     ${ok ? 'OK ' : '✖ '} ${ラベル}　（${詳}）`); };

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

  // ★届いているかの門。届いていなければ、以降は意味がないので止める
  const 届いた = await page.evaluate(() => ({
    手で入れる: typeof markPracticed === 'function' && typeof undoPractice === 'function' && typeof addPractice === 'function',
    // ★2026-09-26: ②の保存で数える仕組み。届いていなければ【⑩】は意味がない
    採点で数える: typeof countScoringSheet === 'function',
    自動が残っている: typeof countPracticeSheet !== 'undefined',
    key: typeof PRACTICE_KEY !== 'undefined' ? PRACTICE_KEY : null
  }));
  言う(`     手で入れる仕組みが届いているか: ${届いた.手で入れる} / ★②の保存で数える仕組み: ${届いた.採点で数える} / ★刷ったら数える仕組みが残っていないか: ${!届いた.自動が残っている} / キー=${届いた.key}`);
  if (!届いた.手で入れる || !届いた.採点で数える || 届いた.自動が残っている || 届いた.key !== KEY) {
    言う('     ✖ 届いていません（または古い仕組みが残っています）。ここで止めます。');
    await b.close(); if (server) server.close(); process.exit(1);
  }

  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  await page.evaluate(() => { window.print = () => {}; });   // ⚠️ 潰すのは window.print だけ

  const 回 = await page.evaluate(() => { switchTab('history'); return document.getElementById('list-unit-select').value; });
  await page.waitForTimeout(250);

  // --- ① まだ0回 ---
  const 前 = await page.evaluate(() => {
    const g = document.querySelector('#history-list-container .hist-guide');
    return { バッジ: document.querySelectorAll('#history-list-container .word-practiced').length,
             説明あり: !!g, たたまれている: g ? !g.open : null, 高さ: g ? Math.round(g.getBoundingClientRect().height) : null,
             文: g ? g.textContent.replace(/\s+/g, ' ').trim() : '' };
  });
  言う(`【①】まだ0回のとき（回: ${回}）`);
  見る('「練習 N回」のバッジが出ていない', 前.バッジ === 0, `${前.バッジ}個`);
  見る('説明がたたまれている', 前.説明あり && 前.たたまれている, `高さ ${前.高さ}px`);
  見る('★「刷っても増えません」と書いてある', 前.文.includes('刷っても増えません'), 前.文.includes('刷っても増えません') ? 'ある' : '無い');

  // --- ② ★刷っても増えないこと ---
  await page.evaluate(() => { switchTab('home'); selectedUnits = new Set([document.getElementById('list-unit-select').value]); currentSet = []; generateDailySet(false); });
  await page.waitForTimeout(200);
  await page.click('text=① テストプリントを印刷'); await page.waitForTimeout(250);
  await page.click('text=② 練習プリントを印刷'); await page.waitForTimeout(250);
  await page.click('text=② 練習プリントを印刷'); await page.waitForTimeout(250);
  const 刷ったあと = await page.evaluate(k => localStorage.getItem(k), KEY);
  言う('【②】★① テスト印刷1回・② 練習印刷2回 を、本物のボタンで押した');
  見る('★刷っても数が入らない', 刷ったあと === null, 刷ったあと === null ? '保存はまだ空（増えていない）' : `保存: ${刷ったあと}`);

  // --- ③ 「⭕ できた」で 練習+1 と 正解が同時に入る ---
  await page.evaluate(() => switchTab('history'));
  await page.waitForTimeout(250);
  const 行1 = page.locator('#history-list-container .word-row').first();
  await 行1.locator('button', { hasText: 'できた' }).first().click();
  await page.waitForTimeout(300);
  const できた = await page.evaluate(k => {
    const o = JSON.parse(localStorage.getItem(k));
    const r = document.querySelector('#history-list-container .word-row');
    return { 回数: Math.max(...Object.values(o.counts)), 語数: Object.keys(o.counts).length, since: o.since,
             バッジ: (r.querySelector('.word-practiced') || {}).textContent || '(無し)',
             正解の表示: (r.querySelector('.word-done') || {}).textContent || '(無し)',
             正解にするボタン: !![...r.querySelectorAll('button')].find(x => x.textContent.includes('正解にする')) };
  }, KEY);
  言う('【③】1語めの「⭕ できた」を押した');
  見る('練習が1回になった', できた.回数 === 1 && できた.語数 === 1, `${できた.語数}語 / ${できた.回数}回 / バッジ「${できた.バッジ}」`);
  見る('★同時に正解も入った（1回の操作で両方）', できた.正解の表示.includes('に正解'), できた.正解の表示);
  見る('★「正解にする」ボタンが残っていない（残ると2回数えられる）', !できた.正解にするボタン, できた.正解にするボタン ? '残っている' : '無い');

  // --- ④ 「△ できなかった」は 練習+1 だけ ---
  const 行2 = page.locator('#history-list-container .word-row').nth(1);
  await 行2.locator('button', { hasText: 'できなかった' }).first().click();
  await page.waitForTimeout(300);
  const できなかった = await page.evaluate(k => {
    const o = JSON.parse(localStorage.getItem(k));
    const r = document.querySelectorAll('#history-list-container .word-row')[1];
    return { 語数: Object.keys(o.counts).length,
             バッジ: (r.querySelector('.word-practiced') || {}).textContent || '(無し)',
             正解の表示: (r.querySelector('.word-done') || {}).textContent || '(無し)' };
  }, KEY);
  言う('【④】2語めの「△ できなかった」を押した（この語には ⭕ が付いていない）');
  見る('練習だけ1回ふえた', できなかった.語数 === 2 && できなかった.バッジ.includes('1回'), `${できなかった.語数}語 / バッジ「${できなかった.バッジ}」`);
  見る('★正解は入っていない', できなかった.正解の表示 === '(無し)', できなかった.正解の表示);

  // --- ④b ★⭕ が付いている語に「できなかった」→ ⭕ が外れ、練習は消えない（09-25b の決まり） ---
  const 行3 = page.locator('#history-list-container .word-row').nth(2);
  await 行3.locator('button', { hasText: 'できた' }).first().click();
  await page.waitForTimeout(300);
  const 三_できた = await page.evaluate(() => {
    const r = document.querySelectorAll('#history-list-container .word-row')[2];
    return { 正解: (r.querySelector('.word-done') || {}).textContent || '(無し)',
             バッジ: (r.querySelector('.word-practiced') || {}).textContent || '(無し)' };
  });
  await 行3.locator('button', { hasText: 'できなかった' }).first().click();
  await page.waitForTimeout(300);
  const 三_できなかった = await page.evaluate(() => {
    const r = document.querySelectorAll('#history-list-container .word-row')[2];
    return { 正解: (r.querySelector('.word-done') || {}).textContent || '(無し)',
             バッジ: (r.querySelector('.word-practiced') || {}).textContent || '(無し)' };
  });
  言う('【④b】3語めに「⭕ できた」→ そのあと「△ できなかった」を押した');
  言う(`        できた後 : 正解「${三_できた.正解}」/ ${三_できた.バッジ}`);
  言う(`        できなかった後: 正解「${三_できなかった.正解}」/ ${三_できなかった.バッジ}`);
  見る('★⭕ が外れた（また紙に出るようになる・09-25b の決まり）', 三_できなかった.正解 === '(無し)', 三_できなかった.正解);
  見る('★★練習回数は消えず 2回になった（外すのは正解だけ）', 三_できなかった.バッジ.includes('2回'), 三_できなかった.バッジ);

  await page.screenshot({ path: path.join(__dirname, 名 + '_練習回数_行_390px.png') });

  // --- ⑤ 戻せること ---
  /* ⚠️ ここは「その行の数」を見ること。
     ★2026-09-25b に Math.max(全語の数) で見ていて、④b を足した瞬間に落ちました。
       （3語めが2回になったので、1語めを見ているつもりが 2 を読んでいた）
       ★期待値を 2 に緩めるのではなく、★★行ごとに読む形に直しました。
       他の行が何回になっても、見たい行だけを正しく見ます。 */
  const 行の様子 = n => page.evaluate(i => {
    const r = document.querySelectorAll('#history-list-container .word-row')[i];
    const 文 = sel => { const e = r.querySelector(sel); return e ? e.textContent.trim() : '(無し)'; };
    return { バッジ: 文('.word-practiced'),
             正解: 文('.word-done'),
             減らすボタン: !![...r.querySelectorAll('button')].find(x => x.textContent.includes('練習を1回減らす')) };
  }, n);

  await 行2.locator('button', { hasText: '練習を1回減らす' }).first().click();
  await page.waitForTimeout(300);
  const 減2 = await 行の様子(1), 減1 = await 行の様子(0), 減3 = await 行の様子(2);
  言う('【⑤】2語めの「↩ 練習を1回減らす」を押した');
  見る('2語めが0回に戻り、バッジも消えた', 減2.バッジ === '(無し)', `2語めのバッジ ${減2.バッジ}`);
  見る('0回になったら「減らす」ボタンも消える（負にならない）', !減2.減らすボタン, 減2.減らすボタン ? '残っている' : '消えた');
  見る('★ほかの行の数は動いていない', 減1.バッジ.includes('1回') && 減3.バッジ.includes('2回'), `1語め ${減1.バッジ} / 3語め ${減3.バッジ}`);

  await 行1.locator('button', { hasText: '正解を取り消す' }).first().click();
  await page.waitForTimeout(300);
  const 取1 = await 行の様子(0);
  言う('【⑥】1語めの「↩ 正解を取り消す」を押した');
  見る('★正解だけ外れ、練習は減らない（別々に戻せる）', 取1.正解 === '(無し)' && 取1.バッジ.includes('1回'), `正解 ${取1.正解} / ${取1.バッジ}`);

  // --- ⑦ 説明を開いたら読めること ---
  await page.evaluate(() => { document.querySelector('.hist-guide').open = true; });
  await page.waitForTimeout(200);
  const 開いた = await page.evaluate(() => {
    const t = document.querySelector('.hist-guide').textContent.replace(/\s+/g, ' ');
    return { 高さ: Math.round(document.querySelector('.hist-guide').getBoundingClientRect().height),
             そろい: ['できた', 'できなかった', '練習を1回減らす', '正解を取り消す', '刷っても増えません',
                       'また紙に出るようになります', '練習 N回はふえません'].filter(k => t.includes(k)) };
  });
  言う('【⑦】説明を開いた');
  // ★「できなかった」と「正解を取り消す」のちがいが書いてあるか（09-25b・司令塔の条件）も見る
  見る('必要なことが全部書いてある', 開いた.そろい.length === 7, `${開いた.そろい.length}/7：${開いた.そろい.join('・')}（高さ ${開いた.高さ}px）`);
  await page.screenshot({ path: path.join(__dirname, 名 + '_練習回数_説明を開く_390px.png') });
  await page.evaluate(() => { document.querySelector('.hist-guide').open = false; });
  await page.waitForTimeout(150);

  /* --- ⑦b ★消したボタンの名前が、画面に残っていないか ---
     ⚠️ 2026-09-25b に実際にやりました。案内文に「できた語は日付を入れて『⭕ 正解にする』」が
        残ったまま公開し、司令塔が公開版で見つけました。
     ★なぜ【⑦】がすり抜けたか: 【⑦】は「必要な言葉が**あるか**」しか見ていません。
        ★「あるか」だけを見る検査は、消し忘れを永久に見つけられません。網を広げても同じです。
        → ここで「★**無いはずのものが無いか**」を見ます（4-3b の逆向き）。
     ⚠️ ボタンを消したら、この一覧に1行足すこと。 */
  // ⚠️ 2026-09-26 に1つ足しました。②の説明を書き直したので、前の文が残っていたら鳴ります
  const 消した文言 = ['⭕ 正解にする', '何も押さずにそのままで大丈夫'];
  const 残り = await page.evaluate(ws => {
    const 出 = [];
    ['home', 'check', 'history'].forEach(t => {
      try { switchTab(t); } catch(e) { return; }
      const el = document.getElementById('screen-' + t);
      if (!el) return;
      const txt = el.textContent.replace(/\s+/g, ' ');
      ws.forEach(w => { if (txt.includes(w)) 出.push(t + ' タブ: ' + w); });
    });
    switchTab('history');
    return 出;
  }, 消した文言);
  言う('【⑦b】★消したボタンの名前が画面に残っていないか（①②③の3タブ）');
  見る('残っていない', 残り.length === 0, 残り.length === 0 ? `0件（見た文言: ${消した文言.join('・')}）` : 残り.join(' / '));
  await page.waitForTimeout(200);

  // --- ⑧ 390px ではみ出していないか ---
  const はみ出し = await page.evaluate(() => {
    const w = document.documentElement.clientWidth, 悪い = [];
    document.querySelectorAll('#screen-history .word-row, #screen-history .word-ops button, #screen-history .word-practiced').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.right > w + 1 || r.left < -1) 悪い.push(`${e.className}: left=${Math.round(r.left)} right=${Math.round(r.right)} (幅 ${w})`);
    });
    return 悪い;
  });
  言う('【⑧】390px で画面からはみ出している要素');
  見る('はみ出し 0件', はみ出し.length === 0, `${はみ出し.length}件`);
  はみ出し.slice(0, 6).forEach(x => 言う(`        ✖ ${x}`));
  await page.screenshot({ path: path.join(__dirname, 名 + '_練習回数_一覧_390px.png') });

  // --- ⑨ 紙に出ていないこと ---
  const 紙 = await page.evaluate(() => {
    const rp = window.print; window.print = () => {};
    try { renderPracticePrint(); } finally { window.print = rp; }
    const t = document.getElementById('print-region').textContent;
    return ['練習 1回', 'から数えています', 'できなかった', '刷っても増えません'].filter(k => t.includes(k));
  });
  言う('【⑨】練習プリントの紙に、画面の文言が出ていないか');
  見る('紙には出ていない', 紙.length === 0, 紙.length === 0 ? '0件' : 紙.join('・'));

  /* --- ⑩ ★② 今日の採点：保存で「練習」と「正解」の両方が入る（2026-09-26 一本化）---
     ⚠️ ここで localStorage を空にして開き直します。★上の【①】〜【⑨】の数を引き継いだまま
        読むと、数を読み違えます（09-25b に Math.max(全語) で実際に踏みました）。
     ★仕込み: ①その紙に無い語に練習3回と古い ⭕（保存で動いてはいけない）
              ②その紙の4語めに古い ⭕（押さないので保存で外れるべき） */
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  await page.evaluate(() => { window.print = () => {}; });
  const 仕込み = await page.evaluate(() => {
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];
    selectedUnits = new Set([u.回]); listUnitKey = u.回;
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = []; generateDailySet(false);
    const 紙 = currentSet.map(d => d.id);
    const 外 = u.list.find(d => 紙.indexOf(d.id) < 0);
    for (let i = 0; i < 3; i++) addPractice(外, +1);
    setCorrectOn(外.id, '2026-01-05');
    setCorrectOn(currentSet[3].id, '2026-01-05');
    switchTab('check');
    return { 回: u.回, 紙: 紙.length, 外の語: 外.word, 外のid: 外.id, 四語めid: currentSet[3].id, ids: 紙 };
  });
  await page.waitForTimeout(250);
  言う(`【⑩】★② 今日の採点で「保存」を押した（回: ${仕込み.回} / 紙に ${仕込み.紙}語）`);
  const 行C = n => page.locator('#check-list-container .check-item').nth(n);
  const 最初 = await page.evaluate(() => ({
    押された行: document.querySelectorAll('#check-list-container .check-item.is-correct').length,
    前の記録: (document.querySelectorAll('#check-list-container .check-item')[3].querySelector('.word-done') || {}).textContent || '(無し)',
    // ★たたんである中も読む（textContent は open でなくても中身を返す）
    説明: document.querySelector('#screen-check .check-guide').textContent.replace(/\s+/g, ' '),
    説明の高さ: Math.round(document.querySelector('#screen-check .check-guide').getBoundingClientRect().height),
    // ★390px で、説明の下に第1問が見えているか（09-25 に③で踏んだ型）
    第一問が見えている: (() => {
      const r = document.querySelector('#check-list-container .check-item');
      return !!r && r.getBoundingClientRect().top < window.innerHeight;
    })()
  }));
  見る('開いた時点で押された行が無い（今日の採点は白紙から）', 最初.押された行 === 0, `${最初.押された行}行`);
  見る('★先に ⭕ が付いていた語は「前に ⭕」として見えている', 最初.前の記録.includes('に正解'), 最初.前の記録);
  // ★説明が、いまの動きのとおりに書いてあるか（失敗条件5：説明と食いちがう）
  const 説明の要点 = ['練習 1回', '⭕ を押していない語', '外れます', '保存を押すまで', '2回押しても'];
  const そろい10 = 説明の要点.filter(k => 最初.説明.includes(k));
  見る('★②の説明が、いまの動きのとおりに書いてある', そろい10.length === 説明の要点.length,
       `${そろい10.length}/${説明の要点.length}：${そろい10.join('・')}`);
  見る('★390px で、説明の下に第1問が見えている', 最初.第一問が見えている === true, `説明の高さ ${最初.説明の高さ}px`);
  await page.screenshot({ path: path.join(__dirname, 名 + '_採点_保存前_390px.png') });

  await 行C(0).locator('button', { hasText: 'できた' }).first().click();
  await 行C(1).locator('button', { hasText: 'できた' }).first().click();
  await page.waitForTimeout(250);
  /* ⚠️ ここは「紙の語の数が0のまま」で見ます。★保存の中身を文字で眺めて
        「たぶん入っていない」で済ませないこと（それは何も守りません）。 */
  const 保存前の紙 = await page.evaluate(ids => {
    const o = JSON.parse(localStorage.getItem('kanji_app_practice_count_v1')) || { counts: {} };
    return ids.map(id => { const it = KANJI_DATA.find(d => d.id === id); return o.counts[it.unitKey + '\u0000' + it.word] || 0; });
  }, 仕込み.ids);
  見る('★保存前は、紙の語の練習が全部0', 保存前の紙.every(n => n === 0), `${保存前の紙.join(',')}`);

  await page.click('text=採点結果を保存する');
  await page.waitForTimeout(400);
  const 採点後 = await page.evaluate(({ ids, 外のid, 四語めid }) => {
    const o = JSON.parse(localStorage.getItem('kanji_app_practice_count_v1')) || { counts: {} };
    const st = JSON.parse(localStorage.getItem('kq_kanji_stats_v1')) || {};
    const 数 = id => { const it = KANJI_DATA.find(d => d.id === id); return o.counts[it.unitKey + '\u0000' + it.word] || 0; };
    const 日 = id => (st[id] && st[id].lastCorrectAt) ? ymdOf(st[id].lastCorrectAt) : null;
    return { 紙の練習: ids.map(数), 押した: [日(ids[0]), 日(ids[1])], 押していない: 日(ids[2]),
             四語め: 日(四語めid), 外の練習: 数(外のid), 外の正解: 日(外のid), 今日: todayYmd(), saved: o.saved };
  }, 仕込み);
  見る('★紙に出ていた語ぜんぶに練習1回', 採点後.紙の練習.every(n => n === 1), `${採点後.紙の練習.join(',')}`);
  見る('⭕ を押した語に、今日の正解が入った', 採点後.押した.every(d => d === 採点後.今日), `${採点後.押した.join(' / ')}（今日=${採点後.今日}）`);
  見る('★押していない語に正解は入らない', 採点後.押していない === null, 採点後.押していない || 'なし');
  見る('★押していない語の、前に付いていた ⭕ が外れた（また紙に出る）', 採点後.四語め === null, 採点後.四語め || '外れた');
  見る('★★その紙に無い語の練習は動かない', 採点後.外の練習 === 3, `入れておいた3回 → ${採点後.外の練習}回（${仕込み.外の語}）`);
  見る('★★その紙に無い語の正解も動かない', 採点後.外の正解 === '2026-01-05', `${採点後.外の正解}`);

  // ★同じ紙で2回目の保存 → 練習は増えない
  await page.evaluate(() => switchTab('check'));
  await page.waitForTimeout(200);
  await page.click('text=採点結果を保存する');
  await page.waitForTimeout(400);
  const 二回目 = await page.evaluate(ids => {
    const o = JSON.parse(localStorage.getItem('kanji_app_practice_count_v1')) || { counts: {} };
    return ids.map(id => { const it = KANJI_DATA.find(d => d.id === id); return o.counts[it.unitKey + '\u0000' + it.word] || 0; });
  }, 仕込み.ids);
  見る('★保存を2回押しても、練習は1回だけ', 二回目.every(n => n === 1), `${二回目.join(',')}`);

  // ★③に「あとから直すところ」と分かる案内が出ているか（②との役割分け）
  const 役割 = await page.evaluate(() => {
    switchTab('history');
    const el = document.querySelector('#history-list-container .hist-role');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  await page.waitForTimeout(250);
  見る('★③に「あとから直すところ」と分かる案内が出ている', !!役割 && 役割.includes('あとから直すところ'), 役割 || '(無し)');
  // ★②の行に入れた練習が、③の一覧にも出ているか（同じ数を2画面で見る）
  const 一覧の数 = await page.evaluate(() => [...document.querySelectorAll('#history-list-container .word-practiced')].length);
  見る('★②で入れた練習が、③の一覧にも出ている', 一覧の数 >= 10, `「練習 N回」のバッジ ${一覧の数}個（紙10語＋先に入れた1語）`);

  // ★390px で ② の画面がはみ出していないか
  await page.evaluate(() => switchTab('check'));
  await page.waitForTimeout(250);
  const はみ出し2 = await page.evaluate(() => {
    const w = document.documentElement.clientWidth, 悪い = [];
    document.querySelectorAll('#screen-check .check-item, #screen-check button, #screen-check .word-done, #screen-check .word-practiced').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.right > w + 1 || r.left < -1) 悪い.push(`${e.className}: left=${Math.round(r.left)} right=${Math.round(r.right)} (幅 ${w})`);
    });
    return 悪い;
  });
  見る('390px で ② の画面がはみ出していない', はみ出し2.length === 0, `${はみ出し2.length}件`);
  はみ出し2.slice(0, 6).forEach(x => 言う(`        ✖ ${x}`));
  await page.screenshot({ path: path.join(__dirname, 名 + '_採点_保存後_390px.png') });

  言う('');
  言う(NG === 0 ? '★すべて通りました。' : `★落ちた項目 ${NG}件（上の ✖）。`);
  fs.writeFileSync(path.join(__dirname, '実機確認_練習回数_' + 名 + '_2026-09-25_結果.txt'), 記録.join('\n') + '\n', 'utf8');
  console.log('\n→ 画像と結果テキストを tools/ に書きました。');
  await b.close(); if (server) server.close();
  process.exitCode = NG === 0 ? 0 : 1;
})();
