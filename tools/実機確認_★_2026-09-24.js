/* ★最優先の画面を、スマホ幅（390px）で実際にクリックして確かめる（確認ポイント 3-4）。
   ⚠️ これは「人が見るための画像＋クリックの記録」です。合否を決める検査は
      tools\★最優先を検査する.js のほうです。
   使い方: node tools\実機確認_★_2026-09-24.js [--public]
     --public を付けると、ローカルではなく**公開ずみの GitHub Pages** を見ます。
     ★確認ポイント 0-4「『直した』と『届いた』は別」。公開したら必ず --public で見ること。
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
const PORT = 8171;
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

(async () => {
  const server = 公開 ? null : await serve();
  // キャッシュを踏まないように、毎回ちがうクエリを付ける（公開直後は古い版が返ることがある）
  const url = 公開 ? 公開URL + '?cb=' + Date.now() : `http://127.0.0.1:${PORT}/index.html`;
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await c.newPage();
  const ダイアログ = [];
  page.on('dialog', d => { ダイアログ.push(d.message().split('\n')[0]); d.accept(); });
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  言う(`見ているもの: ${公開 ? '★公開版 ' + 公開URL : 'ローカル'}`);
  // ★出したものが本当に届いているかを、まずここで見る。
  //   ★が届いていなければ以降の確認は全部おかしくなるので、先に止める
  const 届いた = await page.evaluate(() => ({
    star: typeof getStarred === 'function' && typeof toggleStarred === 'function',
    rec: typeof RECOMMENDED_KEYS !== 'undefined' ? RECOMMENDED_KEYS.size : null,
    note: !!document.getElementById('star-note'),
    btn: !!document.getElementById('list-star-only-btn')
  }));
  言う(`     ★の仕組みが届いているか: 関数=${届いた.star} / おすすめ=${届いた.rec}語 / ①の行=${届いた.note} / ★だけ表示ボタン=${届いた.btn}`);
  if (!届いた.star || 届いた.rec !== 110 || !届いた.note || !届いた.btn) {
    言う('     ✖ 届いていません。ここで止めます（公開直後ならしばらく待って、もう一度）。');
    fs.writeFileSync(path.join(__dirname, '実機確認_★_' + (公開 ? '公開版' : 'ローカル') + '_2026-09-24_結果.txt'), 記録.join('\n') + '\n', 'utf8');
    await b.close(); if (server) server.close(); process.exit(1);
  }

  // まっさらな端末から始める
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(url);
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');

  // --- ① ★0件のときに、★の行が画面に出ていないこと ---
  const note0 = await page.evaluate(() => {
    const el = document.getElementById('star-note');
    return { ある: !!el, 見える: el ? getComputedStyle(el).display !== 'none' : null, 文: el ? el.textContent : null };
  });
  言う(`【①】★0件のとき「★最優先…」の行が見えるか: ${note0.見える}（false であるべき＝直す前と同じ画面） 文="${note0.文}"`);

  // --- ③一覧へ行って★を2つ付ける（本物のクリックで） ---
  await page.click('#tab-history');
  await page.waitForTimeout(150);
  const 回 = await page.evaluate(() => document.getElementById('list-unit-select').value);
  言う(`【②】③一覧タブを開いた。いま見ている回: ${回}`);

  const 星ボタン = page.locator('#history-list-container .word-star');
  const 行数 = await 星ボタン.count();
  言う(`     この回の行数: ${行数}`);
  await 星ボタン.nth(0).click();
  await page.waitForTimeout(120);
  await 星ボタン.nth(1).click();
  await page.waitForTimeout(150);

  const 星状態 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#history-list-container .word-row')].slice(0, 3);
    return {
      保存: JSON.parse(localStorage.getItem('kanji_app_star_v1') || '[]').length,
      見た目: rows.map(r => ({
        語: r.querySelector('.word-main').textContent.replace('おすすめ', '').trim(),
        星: r.querySelector('.word-star').textContent.trim(),
        おすすめ: !!r.querySelector('.word-rec')
      })),
      件数表示: document.getElementById('list-count-text').textContent
    };
  });
  言う(`【③】☆を2つタップした → 保存された★: ${星状態.保存}語`);
  星状態.見た目.forEach(r => 言う(`     ${r.星} ${r.語}${r.おすすめ ? '（おすすめバッジあり）' : ''}`));
  言う(`     件数表示: ${星状態.件数表示}`);

  await page.screenshot({ path: path.join(__dirname, (公開 ? '公開版' : 'ローカル') + '_★一覧_390px.png'), fullPage: false });

  // --- 「★だけ表示」 ---
  await page.click('#list-star-only-btn');
  await page.waitForTimeout(150);
  const だけ = await page.evaluate(() => ({
    行: document.querySelectorAll('#history-list-container .word-row').length,
    ボタンON: document.getElementById('list-star-only-btn').classList.contains('is-on')
  }));
  言う(`【④】「★だけ表示」を押した → 行 ${だけ.行}（2 であるべき） / ボタンの見た目ON: ${だけ.ボタンON}`);
  await page.screenshot({ path: path.join(__dirname, (公開 ? '公開版' : 'ローカル') + '_★だけ表示_390px.png') });
  await page.click('#list-star-only-btn');
  await page.waitForTimeout(150);

  // --- ①に戻って「★N語が先に出ます」が出ているか ---
  await page.click('#tab-home');
  await page.waitForTimeout(150);
  const note2 = await page.evaluate(() => {
    const el = document.getElementById('star-note');
    return { 見える: getComputedStyle(el).display !== 'none', 文: el.textContent };
  });
  言う(`【⑤】★2件のとき ①の画面: 見える=${note2.見える} 文="${note2.文}"`);

  // 重要度「高だけ」にしても★が残るか（文面の N が減らないこと）
  await page.click('#prio-high');
  await page.waitForTimeout(200);
  const note3 = await page.evaluate(() => document.getElementById('star-note').textContent);
  言う(`【⑥】重要度「高だけ」にした → "${note3}"`);
  await page.screenshot({ path: path.join(__dirname, (公開 ? '公開版' : 'ローカル') + '_★印刷タブ_390px.png') });

  // 選んでいない回の★（＝出ない★）があるときの文面。
  // ⚠️ 起動時は全単元が選ばれているので、まず単元をしぼってから足すこと。
  //    しぼらずに足すと「選んでいない回」にならず、この枝を一度も通らない（4-6e と同じ型）
  const note4 = await page.evaluate(() => {
    const 見る回 = [...selectedUnits][0];
    const 他 = KANJI_DATA.find(d => d.unitKey !== 見る回);
    selectedUnits = new Set([見る回]);            // ★他の回は選ばない状態にする
    const set = getStarred(); set.add(他.unitKey + '\u0000' + 他.word); saveStarred(set);
    currentSet = []; generateDailySet(false); updateStarNote();
    return { 文: document.getElementById('star-note').textContent, 見る回, 足した回: 他.unitKey, 足した語: 他.word };
  });
  言う(`【⑦】「${note4.見る回}」だけを選んだ状態で、選んでいない「${note4.足した回}」の★（${note4.足した語}）を足した`);
  言う(`     → "${note4.文}"（「1語は…今回は出ません」と書かれているべき）`);
  // 単元の選択を元に戻す
  await page.evaluate(() => { selectedUnits = new Set(KANJI_UNITS.map(u => u.key)); currentSet = []; generateDailySet(false); updateStarNote(); });

  // 「選んだ語だけ」に切りかえたときの文面
  await page.click('#mode-picked');
  await page.waitForTimeout(200);
  const note5 = await page.evaluate(() => document.getElementById('star-note').textContent);
  言う(`【⑧】「✅ 選んだ語だけ」に切りかえた → "${note5}"`);
  await page.click('#mode-auto');
  await page.waitForTimeout(150);

  // --- おすすめを全部★にする ---
  await page.click('#tab-history');
  await page.waitForTimeout(150);
  const 前 = await page.evaluate(() => getStarred().size);
  await page.click('text=おすすめを全部★にする');
  await page.waitForTimeout(400);
  const 後 = await page.evaluate(() => ({ 星: getStarred().size, おすすめ: RECOMMENDED_KEYS.size }));
  言う(`【⑨】「おすすめを全部★にする」→ ★ ${前}語 → ${後.星}語（おすすめは ${後.おすすめ}語）`);
  言う(`     出たダイアログ: ${JSON.stringify(ダイアログ)}`);

  // --- はみ出していないか（390px）---
  const はみ出し = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const 悪い = [];
    document.querySelectorAll('#screen-history button, #screen-history .word-row, #screen-history .list-head').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.right > w + 1 || r.left < -1) 悪い.push(`${e.className || e.id}: left=${Math.round(r.left)} right=${Math.round(r.right)} (画面幅 ${w})`);
    });
    return 悪い;
  });
  言う(`【⑩】390px で画面からはみ出している要素: ${はみ出し.length}件`);
  はみ出し.slice(0, 8).forEach(x => 言う(`     ✖ ${x}`));
  await page.screenshot({ path: path.join(__dirname, (公開 ? '公開版' : 'ローカル') + '_おすすめ全★_390px.png') });

  // --- ★をすべて外す → ①の画面が元に戻るか ---
  await page.click('text=★をすべて外す');
  await page.waitForTimeout(400);
  await page.click('#tab-home');
  await page.waitForTimeout(200);
  const note6 = await page.evaluate(() => {
    const el = document.getElementById('star-note');
    return { 保存: (JSON.parse(localStorage.getItem('kanji_app_star_v1') || '[]')).length, 見える: getComputedStyle(el).display !== 'none' };
  });
  言う(`【⑪】「★をすべて外す」→ 保存された★ ${note6.保存}語 / ①の★の行が見える: ${note6.見える}（false であるべき）`);

  fs.writeFileSync(path.join(__dirname, '実機確認_★_' + (公開 ? '公開版' : 'ローカル') + '_2026-09-24_結果.txt'), 記録.join('\n') + '\n', 'utf8');
  console.log('\n→ 画像4枚と結果テキストを tools\\ に書きました。');
  await b.close(); if (server) server.close();
})();
