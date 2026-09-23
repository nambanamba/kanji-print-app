/* ★最優先（2026-09-24 の依頼）が、依頼書の受け入れ条件を満たしているかを機械で確かめる。

   ★見ているもの（依頼書「何が起きたら失敗か」の1〜5）
     1. ★を付けた語が、どれかの設定で紙に出ない
     2. ★が0件のとき、直す前と紙が1枚でも変わる
     4. ★や「おすすめ」が紙に印刷されて答えのヒントになる
     5. 記録・除外・チェックが、★を入れたことで消える／移る
   （3 は別の道具 tools\おすすめ110語を当てる.js。110/110 を確認ずみ）

   ★入口に自己テストを置いています（確認ポイント 4-1 / 4-3 / 4-6c）。
     3つ全部を先に通し、1つでも落ちたら**数字を出さずに終了コード3で止まります。**
       (a) ★の語を落とす偽の実装   → 鳴るべき          ← 4-1
       (b) いまの正しい実装         → 鳴ってはいけない  ← 4-3（網を広げすぎていないことの担保）
       (c) 直す前の版（BEFORE の版）→ ★を知らないので、重要度で★が落ちる＝鳴るべき ← 4-6c

   ⚠️ (c) の比較先を `HEAD` にしてはいけません（確認ポイント 4-6c）。
      直した瞬間に「直す前の版」が「直したあとの版」に化けて、対照が静かに鳴らなくなります。
      BEFORE をコミットハッシュで固定しています。

   ⚠️ 文字列 grep で済ませていません。**実際に紙を描かせて、その中身を読んでいます**（4-6c 末尾）。

   使い方: node tools\★最優先を検査する.js
*/
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
// ⚠️ playwright はこのフォルダではなく**グローバル**に入っています。そのまま走らせると
//    「Cannot find module 'playwright'」で落ちます。NODE_PATH を付けてください（2026-09-24）:
//      PowerShell : $env:NODE_PATH="$env:APPDATA/npm/node_modules"; node <このファイル>
//      Bash       : NODE_PATH=$(npm root -g) node <このファイル>
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
// ★★最優先を入れる直前のコミット（＝依頼書が指定した対照）。HEAD にしないこと
const BEFORE = '9f89e1d';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function serve(dir, port) {
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

/* ★検査の対象になる回を、条件で選ぶ（決め打ちしない・確認ポイント 4-6b / 4-6e）。
   ほしいのは「★あり・★なしが混ざる回」。ここでは
   「重要度が『高』でない語（＝『高だけ』なら落ちる語）を10語以上持つ回」を選ぶ。
   その中の『高でない』語に★を付ければ、★の枝と★でない枝が1枚の紙で両方通る。 */
function 対象の回(KANJI_DATA) {
  const byUnit = {};
  KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
  const cand = Object.entries(byUnit)
    .map(([k, list]) => ({ 回: k, 非高: list.filter(d => d.priority !== '高').length, 高: list.filter(d => d.priority === '高').length }))
    .filter(u => u.非高 >= 3 && u.高 >= 10)
    .sort((a, b) => b.非高 - a.非高);
  if (cand.length === 0) throw new Error('★あり/なしが混ざる回が見つかりません（データの重要度の分布が変わった？）');
  return cand[0];
}

/* --------------------------------------------------------------
   測定1: 「★を付けた語が、重要度『高だけ』の紙に出るか」
   ★でない『高でない』語は落ちたままであること（鳴りすぎ防止）も同時に見る

   ⚠️ ★テストプリント（①）に印刷されるのは「読み（かな）」だけで、答えの語は出ません
      （出たらそれは答えの露出です）。だから「紙にその語が載っているか」は
      **読みが刷られているか**で見ます。練習プリント（②）はお手本＝語そのものが
      刷られるので、そちらは語で見ます。★①②の両方で確かめます。
      ⚠️ ここを「語が紙にあるか」で書くと、正しい実装でも必ず「出ていない」になります
         （2026-09-24 に実際に踏みました）。
   ⚠️ 読みが同じ語があると取り違えるので、★に使う語は
      「その回の中で読みが1つしかない語」から選びます。 */
async function 測定_高だけで星が出るか(page, 壊す) {
  return page.evaluate(({ 壊す }) => {
    const out = { 対象の回: null, 星にした語: [], 紙に出た星: [], 出なかった星: [], 星でない非高が出た: [] };
    // 回を選ぶ（node 側と同じ条件を画面の中でもう一度）
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit)
      .map(([k, list]) => ({ 回: k, list, 非高: list.filter(d => d.priority !== '高').length, 高: list.filter(d => d.priority === '高').length }))
      .filter(x => x.非高 >= 3 && x.高 >= 10).sort((a, b) => b.非高 - a.非高)[0];
    out.対象の回 = u.回;

    // 読みが回の中で一意な語だけを候補にする（読みで紙を読むため。取り違え防止）
    const かな数 = {};
    u.list.forEach(d => { かな数[d.kana] = (かな数[d.kana] || 0) + 1; });
    const 一意 = d => かな数[d.kana] === 1;
    const 非高 = u.list.filter(d => d.priority !== '高' && 一意(d));
    if (非高.length < 4) { out.えらべない = true; return out; }
    const 星語 = 非高.slice(0, 3);                    // この3語を★にする
    const 星でない非高 = 非高.slice(3);               // ★を付けない『高でない』語
    out.星にした語 = 星語.map(d => d.word);

    // 端末の状態をこの検査用にそろえる（記録・除外・チェックは空）
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    localStorage.setItem('kanji_app_excluded_v1', '[]');
    localStorage.setItem('kanji_app_picked_v1', '[]');
    const key = d => d.unitKey + '\u0000' + d.word;
    localStorage.setItem('kanji_app_star_v1', JSON.stringify(星語.map(key)));

    // 設定: この回だけ・重要度「高だけ」・10語・自動でえらぶ
    selectedUnits = new Set([u.回]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'high';
    currentCount = 10;

    // ★偽の実装（自己テスト(a)用）。★を知らない＝重要度で★が落ちる版にすり替える
    if (壊す) {
      window.getPool = function () {
        const keep = PRIORITY_KEEP[priorityFilter] || PRIORITY_KEEP.all;
        return getPoolIgnoringPriority().filter(d => keep.includes(d.priority));
      };
    }

    currentSet = [];
    const rp = window.print; window.print = () => {};
    let テスト紙 = '', 練習紙 = '';
    try {
      generateDailySet(false);
      // ★実際に紙を描かせて、その中身を読む（文字列 grep で済ませない・4-6c 末尾）
      renderTestPrint();
      テスト紙 = [...document.querySelectorAll('#print-region .test-item')]
        .map(e => e.textContent.replace(/\s+/g, ' ').trim()).join('\n');
      renderPracticePrint();
      練習紙 = [...document.querySelectorAll('#print-region .p-item')]
        .map(e => e.textContent.replace(/\s+/g, ' ').trim()).join('\n');
    } finally { window.print = rp; }
    out.テスト紙の問数 = テスト紙 ? テスト紙.split('\n').length : 0;

    // ①は読みで、②は語そのもので見る。両方に出て初めて「紙に出た」とする
    const 出た = d => テスト紙.includes(d.kana) && 練習紙.includes(d.word);
    星語.forEach(d => (出た(d) ? out.紙に出た星 : out.出なかった星).push(d.word));
    星でない非高.forEach(d => { if (出た(d)) out.星でない非高が出た.push(d.word); });
    return out;
  }, { 壊す });
}

/* --------------------------------------------------------------
   測定2: 「★が0件のとき、紙が1枚でも変わるか」
   全単元・重要度3通り × 正解ずみを除く2通りで、出る語の並びを丸ごと取る。
   これを BEFORE の版と突き合わせる（受け入れ条件②）
   -------------------------------------------------------------- */
async function 測定_星0件の紙(page) {
  return page.evaluate(() => {
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    localStorage.setItem('kanji_app_excluded_v1', '[]');
    localStorage.setItem('kanji_app_picked_v1', '[]');
    localStorage.removeItem('kanji_app_star_v1');   // ★0件（キーそのものが無い状態）

    const 結果 = {};
    const rp = window.print; window.print = () => {};
    try {
      [...new Set(KANJI_DATA.map(d => d.unitKey))].forEach(回 => {
        ['all', 'highmid', 'high'].forEach(prio => {
          [false, true].forEach(除く => {
            [10, 'all'].forEach(語数 => {
              selectedUnits = new Set([回]);
              usePicked = false; filterWeak = false;
              filterUnmastered = 除く; priorityFilter = prio; currentCount = 語数;
              currentSet = [];
              generateDailySet(false);
              renderTestPrint();
              const 行 = [...document.querySelectorAll('#print-region .test-item')]
                .map(e => e.textContent.replace(/\s+/g, ' ').trim());
              結果[`${回}|${prio}|${除く}|${語数}`] = 行;
            });
          });
        });
      });
    } finally { window.print = rp; }
    return 結果;
  });
}

/* --------------------------------------------------------------
   測定3: 「★や『おすすめ』が紙に出ていないか」（受け入れ条件④）
   ★を付けた状態で紙を描き、★・☆・おすすめ の印が紙に混ざっていないかを見る
   -------------------------------------------------------------- */
async function 測定_印が紙に出ていないか(page) {
  return page.evaluate(() => {
    const 回一覧 = [...new Set(KANJI_DATA.map(d => d.unitKey))];
    const key = d => d.unitKey + '\u0000' + d.word;
    // 全語に★を付けた、いちばん濃い状態で見る
    localStorage.setItem('kanji_app_star_v1', JSON.stringify(KANJI_DATA.map(key)));
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    localStorage.setItem('kanji_app_excluded_v1', '[]');
    localStorage.setItem('kanji_app_picked_v1', '[]');

    const 出た = [];
    const rp = window.print; window.print = () => {};
    try {
      回一覧.forEach(回 => {
        selectedUnits = new Set([回]);
        usePicked = false; filterUnmastered = false; filterWeak = false;
        priorityFilter = 'all'; currentCount = 10;
        currentSet = [];
        generateDailySet(false);
        [['テスト', renderTestPrint], ['練習', renderPracticePrint]].forEach(([名, f]) => {
          f();
          const t = document.getElementById('print-region').textContent;
          ['★', '☆', 'おすすめ', '最優先'].forEach(印 => {
            if (t.includes(印)) 出た.push(`${回}/${名}: ${印}`);
          });
        });
      });
    } finally { window.print = rp; }
    return 出た;
  });
}

/* --------------------------------------------------------------
   測定4: 「★を入れても、記録・除外・チェックが消えない／移らない」（受け入れ条件⑤）
   -------------------------------------------------------------- */
async function 測定_他の箱を壊さないか(page) {
  return page.evaluate(() => {
    const key = d => d.unitKey + '\u0000' + d.word;
    const 語 = KANJI_DATA.slice(0, 6);
    const 記録 = {}; 記録[語[0].id] = { correct: 1, wrong: 0, lastAnswered: 111, lastCorrectAt: 111, box: 1 };
    記録[語[1].id] = { correct: 1, wrong: 0, lastAnswered: 222, lastCorrectAt: 222, box: 1 };
    const 除外 = [key(語[2])], チェック = [key(語[3]), key(語[4])];
    localStorage.setItem('kq_kanji_stats_v1', JSON.stringify(記録));
    localStorage.setItem('kanji_app_excluded_v1', JSON.stringify(除外));
    localStorage.setItem('kanji_app_picked_v1', JSON.stringify(チェック));
    localStorage.setItem('kanji_app_star_v1', '[]');

    // ★の操作をひととおり回す
    listUnitKey = 語[0].unitKey;
    toggleStarred(語[0].id);
    toggleStarred(語[5].id);
    starAllShown(true);
    starAllShown(false);
    toggleStarred(語[2].id);          // 「出さない」にした語に★を付けてみる
    RECOMMENDED_KEYS.forEach(k => {}); // 参照だけ
    const set = getStarred(); set.add(key(語[1])); saveStarred(set);

    return {
      記録: localStorage.getItem('kq_kanji_stats_v1'),
      除外: localStorage.getItem('kanji_app_excluded_v1'),
      チェック: localStorage.getItem('kanji_app_picked_v1'),
      期待記録: JSON.stringify(記録),
      期待除外: JSON.stringify(除外),
      期待チェック: JSON.stringify(チェック)
    };
  });
}

/* --------------------------------------------------------------
   測定5: 依頼書の「いまある絞り込みとの関係」の表を、そのまま1項目ずつ当てる
     - 正解ずみを除く …… 正解ずみの★は入らない
     - 「出さない」……… 除外が勝つ。★があっても出ない
     - 「選んだ語だけ」… ★は使わない
     - 単元の選択 ……… ★は超えない（09-24 に司令塔が確認ずみ）
     - ★が語数より多いとき … ★の中で「正解した日が古い順・未正解が先」に切る
   ここも紙を描いて、出た語を currentSet ではなく**紙から**読む。
   ⚠️ ①は読みしか刷らないので、語そのものを見たい項目は②（練習プリント）で見る。
   -------------------------------------------------------------- */
async function 測定_絞り込みとの関係(page) {
  return page.evaluate(() => {
    const key = d => d.unitKey + '\u0000' + d.word;
    const 結果 = [];
    const rp = window.print;

    // 紙（②練習プリント）に実際に刷られた語を読む。②はお手本＝語そのものが出る
    function 紙の語(設定) {
      localStorage.setItem('kq_kanji_stats_v1', JSON.stringify(設定.記録 || {}));
      localStorage.setItem('kanji_app_excluded_v1', JSON.stringify(設定.除外 || []));
      localStorage.setItem('kanji_app_picked_v1', JSON.stringify(設定.チェック || []));
      localStorage.setItem('kanji_app_star_v1', JSON.stringify(設定.星 || []));
      selectedUnits = new Set(設定.単元);
      usePicked = !!設定.選んだ語だけ;
      filterUnmastered = !!設定.正解ずみを除く;
      filterWeak = false;
      priorityFilter = 設定.重要度 || 'all';
      currentCount = 設定.語数;
      currentSet = [];
      window.print = () => {};
      try { generateDailySet(false); renderPracticePrint(); } finally { window.print = rp; }
      // 語は .p-sample-word（お手本）に出る。ここだけ読めば取り違えない
      return [...document.querySelectorAll('#print-region .p-sample-word')].map(e => e.textContent.trim());
    }

    // 検査に使う回を選ぶ（★の枝と★でない枝が混ざる回・4-6e）
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit)
      .map(([k, list]) => ({ 回: k, list, 非高: list.filter(d => d.priority !== '高').length, 高: list.filter(d => d.priority === '高').length }))
      .filter(x => x.非高 >= 3 && x.高 >= 10).sort((a, b) => b.非高 - a.非高)[0];
    const 別の回 = Object.keys(byUnit).find(k => k !== u.回);
    const 非高 = u.list.filter(d => d.priority !== '高');
    const A = 非高[0], B = 非高[1], C = 非高[2];        // ★に使う3語（どれも「高」ではない）
    const 別回の語 = byUnit[別の回][0];

    // (1) 正解ずみを除く …… 正解ずみの★は入らない
    {
      const 記録 = {}; 記録[A.id] = { correct: 1, wrong: 0, lastAnswered: 1, lastCorrectAt: 1, box: 1 };
      const 語 = 紙の語({ 単元: [u.回], 星: [A, B].map(key), 記録, 正解ずみを除く: true, 重要度: 'high', 語数: 10 });
      結果.push({ 項目: '正解ずみを除く：正解ずみの★は入らない',
                  OK: !語.includes(A.word) && 語.includes(B.word),
                  詳細: `正解ずみの★「${A.word}」が紙に: ${語.includes(A.word)}（false であるべき） / 未正解の★「${B.word}」が紙に: ${語.includes(B.word)}（true であるべき）` });
    }
    // (2) 「出さない」が★より強い
    {
      const 語 = 紙の語({ 単元: [u.回], 星: [A, B].map(key), 除外: [key(A)], 重要度: 'high', 語数: 10 });
      結果.push({ 項目: '「出さない」が★より強い',
                  OK: !語.includes(A.word) && 語.includes(B.word),
                  詳細: `出さないにした★「${A.word}」が紙に: ${語.includes(A.word)}（false であるべき） / ふつうの★「${B.word}」: ${語.includes(B.word)}（true であるべき）` });
    }
    // (3) 「選んだ語だけ」では★を使わない
    {
      const 語 = 紙の語({ 単元: [u.回], 星: [A, B].map(key), チェック: [C].map(key), 選んだ語だけ: true, 語数: 10 });
      結果.push({ 項目: '「選んだ語だけ」では★を使わない',
                  OK: 語.length === 1 && 語[0] === C.word,
                  詳細: `紙に出た語: ${JSON.stringify(語)}（チェックした「${C.word}」1語だけであるべき。★の ${A.word}・${B.word} は出ない）` });
    }
    // (4) ★は単元の選択を超えない
    {
      const 語 = 紙の語({ 単元: [u.回], 星: [別回の語].map(key), 重要度: 'all', 語数: 10 });
      結果.push({ 項目: '★は単元の選択を超えない',
                  OK: !語.includes(別回の語.word),
                  詳細: `選んでいない「${別の回}」の★「${別回の語.word}」が紙に: ${語.includes(別回の語.word)}（false であるべき）` });
    }
    // (5) ★が語数より多いとき、★の中で「正解した日が古い順・未正解が先」に切る
    {
      const 星たち = u.list.slice(0, 5);
      // 3語に日付を入れる（古い→新しい）。残り2語は未正解＝いちばん先
      const 記録 = {};
      記録[星たち[0].id] = { correct: 1, wrong: 0, lastAnswered: 300, lastCorrectAt: 300, box: 1 };
      記録[星たち[1].id] = { correct: 1, wrong: 0, lastAnswered: 100, lastCorrectAt: 100, box: 1 };
      記録[星たち[2].id] = { correct: 1, wrong: 0, lastAnswered: 200, lastCorrectAt: 200, box: 1 };
      const 語 = 紙の語({ 単元: [u.回], 星: 星たち.map(key), 記録, 語数: 3 });
      // 期待: 未正解の2語（星たち[3], 星たち[4]）→ そのあと lastCorrectAt が最小の 星たち[1]
      const 期待 = [星たち[3].word, 星たち[4].word, 星たち[1].word];
      const OK = 語.length === 3 && 期待.every(w => 語.includes(w));
      結果.push({ 項目: '★が語数より多いとき、★の中で並び順どおりに切る',
                  OK,
                  詳細: `★5語・3語印刷 → 紙: ${JSON.stringify(語)} ／ 期待（未正解2語 + 正解日が最古の1語）: ${JSON.stringify(期待)}` });
    }
    return 結果;
  });
}

/* -------------------------------------------------------------- */
function 同じか(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  // BEFORE の版を作業ディレクトリの外に取り出す（いまのファイルには触らない）
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-star-'));
  ['index.html', 'kanji-data.js'].forEach(f => {
    fs.writeFileSync(path.join(tmp, f), execFileSync('git', ['show', `${BEFORE}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
  });

  const s今 = await serve(ROOT, 8161);
  const s前 = await serve(tmp, 8162);
  const browser = await chromium.launch({ channel: 'chrome' });

  let 終了コード = 0;
  try {
    /* ========== 入口の自己テスト（1つでも落ちたら数字を出さずに止まる） ========== */
    const 自己 = [];

    // (a) ★の語を落とす偽の実装 → 鳴るべき
    {
      const { ctx, page } = await open(browser, 8161);
      const r = await 測定_高だけで星が出るか(page, true);
      自己.push({ 名: '(a) ★を落とす偽の実装', 鳴るべき: true, 鳴った: r.出なかった星.length > 0, 詳細: `出なかった星 ${r.出なかった星.length}語` });
      await ctx.close();
    }
    // (b) いまの実装 → 鳴ってはいけない
    {
      const { ctx, page } = await open(browser, 8161);
      const r = await 測定_高だけで星が出るか(page, false);
      const 鳴った = r.出なかった星.length > 0 || r.星でない非高が出た.length > 0;
      自己.push({ 名: '(b) いまの実装', 鳴るべき: false, 鳴った,
                 詳細: `出なかった星 ${r.出なかった星.length}語 / ★でないのに出た非高 ${r.星でない非高が出た.length}語` });
      await ctx.close();
    }
    // (c) 直す前の版（コミット固定）→ ★を知らないので鳴るべき
    {
      const { ctx, page } = await open(browser, 8162);
      const r = await 測定_高だけで星が出るか(page, false);
      自己.push({ 名: `(c) 直す前の版 ${BEFORE}`, 鳴るべき: true, 鳴った: r.出なかった星.length > 0, 詳細: `出なかった星 ${r.出なかった星.length}語` });
      await ctx.close();
    }

    console.log('=== 入口の自己テスト ===');
    let 落ちた = 0;
    自己.forEach(t => {
      const ok = t.鳴った === t.鳴るべき;
      if (!ok) 落ちた++;
      console.log(`  ${ok ? 'OK ' : '✖ '} ${t.名}：${t.鳴るべき ? '鳴るべき' : '鳴ってはいけない'} → ${t.鳴った ? '鳴った' : '鳴らない'}　（${t.詳細}）`);
    });
    if (落ちた > 0) {
      console.error(`\n★自己テストが ${落ちた}件 落ちました。検査そのものが当てになりません。数字は出しません。`);
      process.exitCode = 3;
      return;
    }
    console.log('  → 3つとも通りました。以下の数字は信用できます。\n');

    /* ========== 本番の測定 ========== */
    const KANJI_DATA = (() => {
      const src = fs.readFileSync(path.join(ROOT, 'kanji-data.js'), 'utf8');
      return eval(src + '; KANJI_DATA');
    })();
    const u = 対象の回(KANJI_DATA);
    console.log(`対象に選んだ回: ${u.回}（高 ${u.高}語 / 高でない ${u.非高}語 ＝ ★の枝と★でない枝が両方通る・4-6e）\n`);

    // 1. ★が「高だけ」で落ちないか
    {
      const { ctx, page } = await open(browser, 8161);
      const r = await 測定_高だけで星が出るか(page, false);
      console.log('【1】★を付けた語が、重要度「高だけ」の紙に出るか（失敗条件1）');
      console.log(`     星にした語: ${r.星にした語.join('・')}（どれも重要度は「高」ではない）`);
      console.log(`     紙に出た星: ${r.紙に出た星.length}語 / 出なかった星: ${r.出なかった星.length}語`);
      console.log(`     ★でないのに紙に出た「高でない」語: ${r.星でない非高が出た.length}語（0であるべき＝★の効きすぎ防止）`);
      if (r.出なかった星.length > 0) { console.log(`     ✖ 出なかった: ${r.出なかった星.join('・')}`); 終了コード = 1; }
      if (r.星でない非高が出た.length > 0) { console.log(`     ✖ 効きすぎ: ${r.星でない非高が出た.join('・')}`); 終了コード = 1; }
      if (終了コード === 0) console.log('     → OK\n'); else console.log('');
      await ctx.close();
    }

    // 2. ★0件のとき、直す前と紙が変わっていないか
    {
      const a = await (async () => { const { ctx, page } = await open(browser, 8161); const r = await 測定_星0件の紙(page); await ctx.close(); return r; })();
      const b = await (async () => { const { ctx, page } = await open(browser, 8162); const r = await 測定_星0件の紙(page); await ctx.close(); return r; })();
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      const ちがう = keys.filter(k => !同じか(a[k], b[k]));
      console.log('【2】★が0件のとき、直す前の版と紙が1枚でも変わっていないか（失敗条件2・受け入れ条件②）');
      console.log(`     比べた紙: ${keys.length}枚（全${new Set(Object.keys(a).map(k => k.split('|')[0])).size}回 × 重要度3 × 正解ずみを除く2 × 語数2）`);
      console.log(`     対照: ${BEFORE}（コミット固定。HEAD ではない・4-6c）`);
      console.log(`     ちがった紙: ${ちがう.length}枚`);
      if (ちがう.length > 0) {
        終了コード = 1;
        ちがう.slice(0, 5).forEach(k => {
          console.log(`     ✖ ${k}`);
          console.log(`        直す前: ${JSON.stringify(b[k]).slice(0, 200)}`);
          console.log(`        いま  : ${JSON.stringify(a[k]).slice(0, 200)}`);
        });
      } else console.log('     → OK（1枚も変わっていません）\n');
      if (ちがう.length > 0) console.log('');
    }

    // 3. ★・おすすめ が紙に出ていないか
    {
      const { ctx, page } = await open(browser, 8161);
      const 出た = await 測定_印が紙に出ていないか(page);
      console.log('【3】★や「おすすめ」の印が紙に印刷されていないか（失敗条件4）');
      console.log(`     全語に★を付けた状態で、全${new Set(KANJI_DATA.map(d => d.unitKey)).size}回 × テスト／練習 の紙を描いて中を見た`);
      console.log(`     印が見つかった紙: ${出た.length}枚`);
      if (出た.length > 0) { 終了コード = 1; 出た.slice(0, 10).forEach(x => console.log(`     ✖ ${x}`)); console.log(''); }
      else console.log('     → OK\n');
      await ctx.close();
    }

    // 4. 他の箱を壊さないか
    {
      const { ctx, page } = await open(browser, 8161);
      const r = await 測定_他の箱を壊さないか(page);
      console.log('【4】★を触っても、記録・「出さない」・チェックが変わらないか（失敗条件5）');
      const 明細 = [['記録(kq_kanji_stats_v1)', r.記録, r.期待記録],
                    ['出さない(kanji_app_excluded_v1)', r.除外, r.期待除外],
                    ['チェック(kanji_app_picked_v1)', r.チェック, r.期待チェック]];
      明細.forEach(([名, いま, 期待]) => {
        const ok = いま === 期待;
        if (!ok) 終了コード = 1;
        console.log(`     ${ok ? 'OK ' : '✖ '} ${名}`);
        if (!ok) { console.log(`        期待: ${期待}`); console.log(`        いま: ${いま}`); }
      });
      console.log('');
      await ctx.close();
    }

    // 5. 依頼書の「いまある絞り込みとの関係」の表
    {
      const { ctx, page } = await open(browser, 8161);
      const r = await 測定_絞り込みとの関係(page);
      console.log('【5】依頼書「いまある絞り込みとの関係」の表を1項目ずつ');
      r.forEach(x => {
        if (!x.OK) 終了コード = 1;
        console.log(`     ${x.OK ? 'OK ' : '✖ '} ${x.項目}`);
        console.log(`        ${x.詳細}`);
      });
      console.log('');
      await ctx.close();
    }

    console.log(終了コード === 0 ? '★すべて通りました。' : '★落ちた項目があります（上の ✖）。');
  } finally {
    await browser.close();
    s今.close(); s前.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.exitCode = 終了コード;
})();
