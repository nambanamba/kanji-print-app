/* 「練習した回数」（2026-09-25 の依頼）が、依頼書の受け入れ条件を満たしているかを機械で確かめる。

   ★見ているもの（依頼書「何が起きたら失敗か」の1〜5）
     1. テストプリント（①）を刷って、数が増える
     2. 同じ紙を続けて刷り直して、数が二重に増える
     3. 数を足したことで、記録・★・チェック・「出さない」のどれかが変わる
     4. 数が紙に印刷される（テスト・練習とも）
     5. 数が全部0のとき、直す前と紙が1枚でも変わる

   ★入口に自己テストを置いています（確認ポイント 4-1 / 4-3 / 4-6c）。
     3つ全部を先に通し、1つでも落ちたら**数字を出さずに終了コード3で止まります。**
       (a) 刷り直しで二重に数える偽の実装 → 鳴るべき          ← 4-1
       (b) いまの正しい実装               → 鳴ってはいけない  ← 4-3（網を広げすぎていないことの担保）
       (c) 直す前の版（BEFORE の版）      → 数える仕組みが無い＝鳴るべき ← 4-6c

   ⚠️ (c) の比較先を `HEAD` にしてはいけません（確認ポイント 4-6c）。
      直した瞬間に「直す前の版」が「直したあとの版」に化けて、対照が静かに鳴らなくなります。

   ⚠️ 文字列 grep で済ませていません。**実際にボタンを押させて、紙を描かせて中を読んでいます**（4-6c 末尾）。

   ⚠️ playwright はこのフォルダではなく**グローバル**に入っています。そのまま走らせると
   //    「Cannot find module 'playwright'」で落ちます。NODE_PATH を付けてください:
   //      PowerShell : $env:NODE_PATH="$env:APPDATA/npm/node_modules"; node <このファイル>
   //      Bash       : NODE_PATH=$(npm root -g) node <このファイル>

   使い方: node tools/練習した回数を検査する.js
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
// ★「練習した回数」を入れる直前のコミット（＝依頼書が指定した対照）。HEAD にしないこと
const BEFORE = 'd6f7cb8';
const KEY = 'kanji_app_practice_count_v1';

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
  // 印刷ダイアログが出ると止まるので、画面の中で print を潰しておく。
  // ⚠️ 本体の関数はすり替えません。潰すのは window.print だけです
  await page.evaluate(() => { window.print = () => {}; });
  return { ctx, page };
}

/* ★検査に使う回を、条件で選ぶ（決め打ちしない・4-6b）。
   10語以上ある回なら、10語の紙と、それとは別ぞろえの紙の両方が作れる */
function 対象の回(KANJI_DATA) {
  const byUnit = {};
  KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
  const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, 数: list.length }))
    .filter(x => x.数 >= 20).sort((a, b) => b.数 - a.数)[0];
  if (!u) throw new Error('20語以上ある回がありません（データの形が変わった？）');
  return u;
}

/* --------------------------------------------------------------
   測定1: ボタンを押したときに、数がどう動くか
   ★本物のボタンをクリックします（関数を直接呼びません）。
   ⚠️ 壊すのは countPracticeSheet の「その日すでに数えたか」の判定だけ（自己テスト(a)用）
   -------------------------------------------------------------- */
async function 測定_数の動き(page, 壊す) {
  return page.evaluate(({ 壊す, KEY }) => {
    const out = {};
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];
    out.対象の回 = u.回;

    // まっさらにする
    localStorage.removeItem(KEY);
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    localStorage.setItem('kanji_app_excluded_v1', '[]');
    localStorage.setItem('kanji_app_picked_v1', '[]');
    localStorage.setItem('kanji_app_star_v1', '[]');

    selectedUnits = new Set([u.回]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = [];
    generateDailySet(false);

    // ★偽の実装（自己テスト(a)用）。「その日すでに数えたか」を見なくする＝刷り直しで二重に増える
    if (壊す && typeof countPracticeSheet === 'function') {
      window.countPracticeSheet = function (list) {
        const today = todayYmd();
        const o = getPractice() || { v: 1, since: today, counts: {}, done: { ymd: today, sigs: [] } };
        list.forEach(it => { const k = excludeKeyOf(it); o.counts[k] = (o.counts[k] || 0) + 1; });
        localStorage.setItem(KEY, JSON.stringify(o));
        return true;
      };
    }

    const 語 = currentSet.map(d => d.unitKey + '\u0000' + d.word);
    const 数 = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return (o && o.counts) || {}; } catch(e) { return {}; } };
    const 合計 = () => 語.reduce((a, k) => a + (数()[k] || 0), 0);

    out.出した語数 = 語.length;
    out.はじめ = 合計();

    // ① テストプリントを「本物のボタン」で押す → 増えてはいけない
    const testBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('テストプリントを印刷'));
    if (!testBtn) { out.えらべない = 'テスト印刷のボタンが見つかりません'; return out; }
    testBtn.click();
    out.テスト印刷のあと = 合計();

    // プレビューを開く → 増えてはいけない
    const pvBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('今日の漢字を見る'));
    if (pvBtn) { pvBtn.click(); }
    out.プレビューのあと = 合計();

    // ② 練習プリントを「本物のボタン」で押す → 1回ぶん増えるべき
    const pracBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('練習プリントを印刷'));
    if (!pracBtn) { out.えらべない = '練習印刷のボタンが見つかりません'; return out; }
    pracBtn.click();
    out.練習1回目のあと = 合計();

    // ★同じ紙をもう2回刷り直す → 増えてはいけない（失敗条件2）
    pracBtn.click();
    pracBtn.click();
    out.刷り直し2回のあと = 合計();

    // 🔄 別の組み合わせにしてから刷る → 増えるべき（実際にもう1回書いているため）
    currentSet = u.list.slice(10, 20);
    pracBtn.click();
    const 別の語 = currentSet.map(d => d.unitKey + '\u0000' + d.word);
    out.別ぞろえが増えた = 別の語.every(k => (数()[k] || 0) === 1);

    // ★日が変わったら、同じ紙でも増えるべき（翌日また書いたら2回目の練習）
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      o.done.ymd = '2000-01-01';                 // 「前の日に数えた」状態にする
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch(e) {}
    currentSet = u.list.slice(0, 10);
    pracBtn.click();
    out.翌日あつかいのあと = 合計();

    out.紙の見た目 = (() => {
      const t = document.getElementById('print-region').textContent;
      return ['練習 ', '回', 'practice'].filter(x => x === '練習 ' ? t.includes('練習 ') : false);
    })();
    return out;
  }, { 壊す, KEY });
}

/* --------------------------------------------------------------
   測定2: 「数が全部0のとき、直す前と紙が1枚でも変わるか」（失敗条件5）
   前回（★最優先）の【2】とまったく同じやり方
   -------------------------------------------------------------- */
async function 測定_数0の紙(page) {
  return page.evaluate(() => {
    ['kanji_app_practice_count_v1', 'kanji_app_star_v1'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    localStorage.setItem('kanji_app_excluded_v1', '[]');
    localStorage.setItem('kanji_app_picked_v1', '[]');

    const 結果 = {};
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
            const テスト = [...document.querySelectorAll('#print-region .test-item')]
              .map(e => e.textContent.replace(/\s+/g, ' ').trim());
            renderPracticePrint();
            const 練習 = [...document.querySelectorAll('#print-region .p-item')]
              .map(e => e.textContent.replace(/\s+/g, ' ').trim());
            結果[`${回}|${prio}|${除く}|${語数}`] = { テスト, 練習 };
          });
        });
      });
    });
    return 結果;
  });
}

/* --------------------------------------------------------------
   測定3: 「数が紙に印刷されていないか」（失敗条件4）
   全語に大きな数を入れた、いちばん濃い状態で紙を描いて中を見る
   -------------------------------------------------------------- */
async function 測定_数が紙に出ていないか(page) {
  return page.evaluate(() => {
    const key = d => d.unitKey + '\u0000' + d.word;
    const counts = {};
    KANJI_DATA.forEach(d => { counts[key(d)] = 37; });      // 目につく数を全語に入れる
    localStorage.setItem('kanji_app_practice_count_v1',
      JSON.stringify({ v: 1, since: '2026-09-25', counts, done: { ymd: '2026-09-25', sigs: [] } }));

    const 出た = [];
    [...new Set(KANJI_DATA.map(d => d.unitKey))].forEach(回 => {
      selectedUnits = new Set([回]);
      usePicked = false; filterUnmastered = false; filterWeak = false;
      priorityFilter = 'all'; currentCount = 10;
      currentSet = [];
      generateDailySet(false);
      [['テスト', renderTestPrint], ['練習', renderPracticePrint]].forEach(([名, f]) => {
        f();
        const t = document.getElementById('print-region').textContent;
        ['練習 37回', '37回', '練習 ', 'から数えています'].forEach(印 => {
          if (t.includes(印)) 出た.push(`${回}/${名}: ${印}`);
        });
      });
    });
    return 出た;
  });
}

/* --------------------------------------------------------------
   測定4: 「数を足しても、記録・★・チェック・除外が変わらないか」（失敗条件3）
   -------------------------------------------------------------- */
async function 測定_他の箱を壊さないか(page) {
  return page.evaluate(() => {
    const key = d => d.unitKey + '\u0000' + d.word;
    const 語 = KANJI_DATA.slice(0, 8);
    const 記録 = {};
    記録[語[0].id] = { correct: 1, wrong: 0, lastAnswered: 111, lastCorrectAt: 111, box: 1 };
    記録[語[1].id] = { correct: 1, wrong: 0, lastAnswered: 222, lastCorrectAt: 222, box: 1 };
    const 除外 = [key(語[2])], チェック = [key(語[3]), key(語[4])], 星 = [key(語[5]), key(語[6])];
    localStorage.setItem('kq_kanji_stats_v1', JSON.stringify(記録));
    localStorage.setItem('kanji_app_excluded_v1', JSON.stringify(除外));
    localStorage.setItem('kanji_app_picked_v1', JSON.stringify(チェック));
    localStorage.setItem('kanji_app_star_v1', JSON.stringify(星));
    localStorage.removeItem('kanji_app_practice_count_v1');

    // 数える操作をひととおり回す
    selectedUnits = new Set([語[0].unitKey]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = []; generateDailySet(false);
    const pracBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('練習プリントを印刷'));
    pracBtn.click(); pracBtn.click();
    currentSet = KANJI_DATA.slice(10, 20);
    pracBtn.click();
    listUnitKey = 語[0].unitKey;
    renderHistoryList();

    return {
      記録: localStorage.getItem('kq_kanji_stats_v1'), 期待記録: JSON.stringify(記録),
      除外: localStorage.getItem('kanji_app_excluded_v1'), 期待除外: JSON.stringify(除外),
      チェック: localStorage.getItem('kanji_app_picked_v1'), 期待チェック: JSON.stringify(チェック),
      星: localStorage.getItem('kanji_app_star_v1'), 期待星: JSON.stringify(星),
      数えたか: !!localStorage.getItem('kanji_app_practice_count_v1')
    };
  });
}

/* -------------------------------------------------------------- */
function 同じか(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-practice-'));
  ['index.html', 'kanji-data.js'].forEach(f => {
    fs.writeFileSync(path.join(tmp, f), execFileSync('git', ['show', `${BEFORE}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
  });

  const s今 = await serve(ROOT, 8181);
  const s前 = await serve(tmp, 8182);
  const browser = await chromium.launch({ channel: 'chrome' });

  let 終了コード = 0;
  try {
    /* ========== 入口の自己テスト ========== */
    const 自己 = [];
    // (a) 刷り直しで二重に数える偽の実装 → 鳴るべき
    {
      const { ctx, page } = await open(browser, 8181);
      const r = await 測定_数の動き(page, true);
      const 鳴った = r.刷り直し2回のあと !== r.練習1回目のあと;
      自己.push({ 名: '(a) 刷り直しで二重に数える偽の実装', 鳴るべき: true, 鳴った,
                 詳細: `1回目 ${r.練習1回目のあと} → 刷り直し2回のあと ${r.刷り直し2回のあと}` });
      await ctx.close();
    }
    // (b) いまの実装 → 鳴ってはいけない
    {
      const { ctx, page } = await open(browser, 8181);
      const r = await 測定_数の動き(page, false);
      const 鳴った = r.刷り直し2回のあと !== r.練習1回目のあと
                  || r.テスト印刷のあと !== r.はじめ
                  || r.プレビューのあと !== r.はじめ;
      自己.push({ 名: '(b) いまの実装', 鳴るべき: false, 鳴った,
                 詳細: `テスト後 ${r.テスト印刷のあと} / プレビュー後 ${r.プレビューのあと} / 練習1回 ${r.練習1回目のあと} / 刷り直し後 ${r.刷り直し2回のあと}` });
      await ctx.close();
    }
    // (c) 直す前の版 → 数える仕組みが無いので鳴るべき
    {
      const { ctx, page } = await open(browser, 8182);
      const r = await 測定_数の動き(page, false);
      const 鳴った = r.練習1回目のあと === r.はじめ;   // 練習を刷っても増えない＝数える仕組みが無い
      自己.push({ 名: `(c) 直す前の版 ${BEFORE}`, 鳴るべき: true, 鳴った,
                 詳細: `練習を刷っても ${r.はじめ} → ${r.練習1回目のあと}（増えない＝数える仕組みが無い）` });
      await ctx.close();
    }

    console.log('=== 入口の自己テスト ===');
    let 落ちた = 0;
    自己.forEach(t => {
      const ok = t.鳴った === t.鳴るべき;
      if (!ok) 落ちた++;
      console.log(`  ${ok ? 'OK ' : '✖ '} ${t.名}：${t.鳴るべき ? '鳴るべき' : '鳴ってはいけない'} → ${t.鳴った ? '鳴った' : '鳴らない'}`);
      console.log(`       ${t.詳細}`);
    });
    if (落ちた > 0) {
      console.error(`\n★自己テストが ${落ちた}件 落ちました。検査そのものが当てになりません。数字は出しません。`);
      process.exitCode = 3;
      return;
    }
    console.log('  → 3つとも通りました。以下の数字は信用できます。\n');

    /* ========== 本番 ========== */
    const KANJI_DATA = eval(fs.readFileSync(path.join(ROOT, 'kanji-data.js'), 'utf8') + '; KANJI_DATA');
    const u = 対象の回(KANJI_DATA);
    console.log(`対象に選んだ回: ${u.回}（${u.数}語。10語の紙を2ぞろえ作れる・4-6b）\n`);

    // 1〜2. ボタンを押したときの数の動き
    {
      const { ctx, page } = await open(browser, 8181);
      const r = await 測定_数の動き(page, false);
      console.log('【1】① テストプリントとプレビューで数が増えないか（失敗条件1）');
      console.log(`     はじめ ${r.はじめ} → テスト印刷のあと ${r.テスト印刷のあと} → プレビューのあと ${r.プレビューのあと}`);
      if (r.テスト印刷のあと !== r.はじめ || r.プレビューのあと !== r.はじめ) { console.log('     ✖ 増えています'); 終了コード = 1; }
      else console.log('     → OK（どちらも増えていません）');

      console.log('\n【2】② 練習プリントを刷り直して二重に増えないか（失敗条件2）');
      console.log(`     練習1回目のあと ${r.練習1回目のあと}（出した語 ${r.出した語数}語なので、この数になるべき）`);
      console.log(`     同じ紙をさらに2回 刷り直したあと ${r.刷り直し2回のあと}`);
      console.log(`     🔄 別ぞろえの紙を刷った → その語が1回ずつ増えた: ${r.別ぞろえが増えた}（true であるべき）`);
      console.log(`     日が変わったあつかいで同じ紙を刷った → ${r.刷り直し2回のあと} → ${r.翌日あつかいのあと}（増えるべき）`);
      if (r.練習1回目のあと !== r.はじめ + r.出した語数) { console.log('     ✖ 1回目の増え方がおかしい'); 終了コード = 1; }
      if (r.刷り直し2回のあと !== r.練習1回目のあと) { console.log('     ✖ 刷り直しで増えています'); 終了コード = 1; }
      if (!r.別ぞろえが増えた) { console.log('     ✖ 別ぞろえの紙で増えていません'); 終了コード = 1; }
      if (r.翌日あつかいのあと <= r.刷り直し2回のあと) { console.log('     ✖ 日が変わっても増えていません'); 終了コード = 1; }
      if (終了コード === 0) console.log('     → OK\n'); else console.log('');
      await ctx.close();
    }

    // 3. 数0のとき、直す前と紙が変わっていないか
    {
      const a = await (async () => { const { ctx, page } = await open(browser, 8181); const r = await 測定_数0の紙(page); await ctx.close(); return r; })();
      const b = await (async () => { const { ctx, page } = await open(browser, 8182); const r = await 測定_数0の紙(page); await ctx.close(); return r; })();
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      const ちがう = keys.filter(k => !同じか(a[k], b[k]));
      console.log('【3】数が全部0のとき、直す前の版と紙が1枚でも変わっていないか（失敗条件5）');
      console.log(`     比べた紙: ${keys.length}組（テストと練習の両方を見ているので ${keys.length * 2}枚ぶん）`);
      console.log(`     対照: ${BEFORE}（コミット固定。HEAD ではない・4-6c）`);
      console.log(`     ちがった紙: ${ちがう.length}組`);
      if (ちがう.length > 0) {
        終了コード = 1;
        ちがう.slice(0, 5).forEach(k => {
          console.log(`     ✖ ${k}`);
          console.log(`        直す前: ${JSON.stringify(b[k]).slice(0, 180)}`);
          console.log(`        いま  : ${JSON.stringify(a[k]).slice(0, 180)}`);
        });
        console.log('');
      } else console.log('     → OK（1枚も変わっていません）\n');
    }

    // 4. 数が紙に出ていないか
    {
      const { ctx, page } = await open(browser, 8181);
      const 出た = await 測定_数が紙に出ていないか(page);
      console.log('【4】練習した回数が紙に印刷されていないか（失敗条件4）');
      console.log(`     全語に「37回」を入れた状態で、全${new Set(KANJI_DATA.map(d => d.unitKey)).size}回 × テスト／練習 の紙を描いて中を見た`);
      console.log(`     数が見つかった紙: ${出た.length}枚`);
      if (出た.length > 0) { 終了コード = 1; 出た.slice(0, 10).forEach(x => console.log(`     ✖ ${x}`)); console.log(''); }
      else console.log('     → OK\n');
      await ctx.close();
    }

    // 5. 他の箱を壊さないか
    {
      const { ctx, page } = await open(browser, 8181);
      const r = await 測定_他の箱を壊さないか(page);
      console.log('【5】数を足しても、記録・★・チェック・「出さない」が変わらないか（失敗条件3）');
      console.log(`     （この間に練習プリントを3回ぶん刷って、実際に数えさせています: ${r.数えたか}）`);
      [['記録(kq_kanji_stats_v1)', r.記録, r.期待記録],
       ['出さない(kanji_app_excluded_v1)', r.除外, r.期待除外],
       ['チェック(kanji_app_picked_v1)', r.チェック, r.期待チェック],
       ['★(kanji_app_star_v1)', r.星, r.期待星]].forEach(([名, いま, 期待]) => {
        const ok = いま === 期待;
        if (!ok) 終了コード = 1;
        console.log(`     ${ok ? 'OK ' : '✖ '} ${名}`);
        if (!ok) { console.log(`        期待: ${期待}`); console.log(`        いま: ${いま}`); }
      });
      if (!r.数えたか) { console.log('     ✖ 一度も数えていません（この検査は成立していません）'); 終了コード = 1; }
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
