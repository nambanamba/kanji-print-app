/* 「練習した回数」が、依頼書の受け入れ条件を満たしているかを機械で確かめる。

   ============================================================================
   ★★2026-09-25b に、この道具の期待値を1か所ひっくり返しました。
      ★「通らないから緩めた」のではありません。「★仕様が変わったので揃えた」ほうです。

        変える前（2026-09-25 朝・コミット 2b43d78 まで）
            ② 練習プリントを刷ったら、出した語が +1 される  ← これが正しかった
        変えたあと（2026-09-25b・この版）
            ★①②とも、刷っても数は動かない                 ← いまはこれが正しい
            数が増えるのは ③一覧の「⭕ できた」「△ できなかった」を押したときだけ

      なぜ変わったか（ユーザーの言葉・公開直後）:
        「印刷しても練習してないかもしれないので、正解、練習した記録を入れられるようにしてほしい」
        ＝ 刷った回数を数えると、★机に置かれただけの紙も1回に数えてしまう。
           お子さんが実際に書いた量とは別のものを数えていた。
      決めたのは: ユーザー（司令塔が2問して確認）。依頼書 = 漢字プリント_練習と正解を手で入れる_依頼_2026-09-25b.md

      ⚠️ だから、この道具が古い版（2b43d78）に当たると【1】で鳴ります。それが正しい動きです。
         そこを入口の自己テスト (c) に使っています。

   ★★同じ日にもう1つ、仕様が変わりました（2026-09-25b・ユーザーの判断）。
      これも「通らないから緩めた」のではなく「★仕様が変わったので揃えた」ほうです。

        はじめの案 : 「△ できなかった」は 練習+1 だけ。正解の記録には触らない
        ★決まった形: 「△ できなかった」は 練習+1 ＋ ★前に付いていた ⭕ を外す

      なぜ変わったか: 担当が「⭕ が残ると、正解ずみを除く で絞っている親に
        その語が出てこなくなる」と先に報告し、司令塔が
        「今日書けなかった語を、また紙に出しますか」と聞いたところ ★「また出す」だった。
      ⚠️ 外すのは**正解の記録だけ**。★練習回数は消さないこと（消したら失敗条件8）。
   ============================================================================

   ★見ているもの（依頼書 2026-09-25b「何が起きたら失敗か」の1〜8）
     1. 練習プリントを刷って、数が増える（自動が残っている）
     2. 1回の練習が2回数えられる
     3. 「できなかった」を選んだのに、正解の記録が入る
     3b.★「できなかった」を押したのに、前に付いていた ⭕（正解の日付）が残っている（09-25b 追加）
     4. 押し間違いを戻せない
     5. 記録（正解日）・★最優先・チェック・「出さない」のどれかが壊れる
     6. 数が紙に印刷される
     7. 数が全部0のとき、紙が1枚でも変わる
     8. すでに入っている練習回数が消える／勝手に変わる

   ★入口の自己テスト（4-1 / 4-3 / 4-6c）。1つでも落ちたら数字を出さずに終了コード3で止まります。
       (a1) 刷ったら数える偽の実装                  → 鳴るべき
       (a2) できなかったで ⭕ を外さない偽の実装    → 鳴るべき（09-25b で足した決まり）
       (b1) いまの実装（刷っても増えない）          → 鳴ってはいけない
       (b2) いまの実装（できなかったで ⭕ が外れる）→ 鳴ってはいけない
       (c)  対照 2b43d78（刷ると増える版）          → 鳴るべき（★向きが逆。上の囲みのとおり）
     ★(a) と (b) を対にしてあります。(a) だけだと、網を広げて通してしまえるためです（4-3）。

   ⚠️ 対照を `HEAD` にしてはいけません（4-6c）。コミットで固定しています。
   ⚠️ 文字列 grep で済ませていません。★本物のボタンを押させて、紙を描かせて中を読んでいます。

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
// ⚠️ playwright はグローバルです。NODE_PATH=$(npm root -g) を付けてください（2026-09-24）
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
// ★手で入れる形に変える直前の公開版（＝依頼書が指定した対照）。HEAD にしないこと
const BEFORE = '2b43d78';
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
  // ⚠️ 潰すのは window.print だけ。本体の関数はすり替えません
  await page.evaluate(() => { window.print = () => {}; });
  return { ctx, page };
}

/* 検査に使う回を条件で選ぶ（決め打ちしない・4-6b） */
function 対象の回(KANJI_DATA) {
  const byUnit = {};
  KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
  const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, 数: list.length }))
    .filter(x => x.数 >= 20).sort((a, b) => b.数 - a.数)[0];
  if (!u) throw new Error('20語以上ある回がありません（データの形が変わった？）');
  return u;
}

/* --------------------------------------------------------------
   測定1: ★刷っても数が動かないこと（失敗条件1）
   ⚠️ この期待値が 2026-09-25b でひっくり返った所です（上の囲み参照）
   -------------------------------------------------------------- */
async function 測定_刷って増えないか(page, 壊す) {
  return page.evaluate(({ 壊す, KEY }) => {
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];

    localStorage.removeItem(KEY);
    ['kq_kanji_stats_v1'].forEach(k => localStorage.setItem(k, '{}'));
    ['kanji_app_excluded_v1', 'kanji_app_picked_v1', 'kanji_app_star_v1'].forEach(k => localStorage.setItem(k, '[]'));

    selectedUnits = new Set([u.回]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = []; generateDailySet(false);

    // ★偽の実装（自己テスト(a)用）。刷ったら数える形に戻してしまう
    if (壊す) {
      const 元 = window.printPracticeSheet;
      window.printPracticeSheet = function () {
        const o = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { v: 1, counts: {} }; } catch(e) { return { v: 1, counts: {} }; } })();
        if (!o.counts) o.counts = {};
        currentSet.forEach(it => { const k = it.unitKey + '\u0000' + it.word; o.counts[k] = (o.counts[k] || 0) + 1; });
        localStorage.setItem(KEY, JSON.stringify(o));
        return 元.apply(this, arguments);
      };
    }

    const 合計 = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return Object.values((o && o.counts) || {}).reduce((a, b) => a + b, 0); } catch(e) { return 0; } };
    const out = { 対象の回: u.回, 出した語数: currentSet.length, はじめ: 合計() };

    const btn = t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
    const テスト = btn('テストプリントを印刷'), 練習 = btn('練習プリントを印刷'), 見る = btn('今日の漢字を見る');
    if (!テスト || !練習) { out.えらべない = '印刷のボタンが見つかりません'; return out; }

    テスト.click();                     out.テスト印刷のあと = 合計();
    if (見る) 見る.click();             out.プレビューのあと = 合計();
    // 偽の実装は window.printPracticeSheet を差しかえているので、そちらを直接呼ぶ
    if (壊す) { window.printPracticeSheet(); window.printPracticeSheet(); }
    else { 練習.click(); 練習.click(); }
    out.練習を2回刷ったあと = 合計();
    return out;
  }, { 壊す, KEY });
}

/* --------------------------------------------------------------
   測定2: ★ボタンで入る・二重に数えない・できなかったは正解にしない・戻せる
   （失敗条件2・3・4）★本物のボタンを押します
   -------------------------------------------------------------- */
/* ★⭕ を外さない偽の実装を仕込んで、測定2 が鳴るかを見る（自己テスト(a)・失敗条件3b 用）。
   ⚠️ 壊すのは「できなかったときに正解を外す」所だけ。練習の数え方には触りません */
async function 壊す_できなかったで正解を外さない(page) {
  await page.evaluate(() => {
    const 元 = window.markPracticed;
    window.markPracticed = function (id, ymd, できた) {
      if (できた) return 元(id, ymd, true);
      const item = KANJI_DATA.find(d => d.id === id);
      if (!item) return;
      addPractice(item, +1);          // 練習は増やすが、★正解を外さない（これが偽の実装）
      updateProgressDisplay();
      renderHistoryList();
    };
  });
}

async function 測定_手で入れる(page) {
  return page.evaluate(({ KEY }) => {
    const out = {};
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];

    localStorage.removeItem(KEY);
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    ['kanji_app_excluded_v1', 'kanji_app_picked_v1', 'kanji_app_star_v1'].forEach(k => localStorage.setItem(k, '[]'));

    listUnitKey = u.回;
    selectedUnits = new Set([u.回]);
    switchTab('history');

    const 行 = () => [...document.querySelectorAll('#history-list-container .word-row')];
    const 数 = it => { try { const o = JSON.parse(localStorage.getItem(KEY)); return ((o && o.counts) || {})[it.unitKey + '\u0000' + it.word] || 0; } catch(e) { return 0; } };
    const 正解日 = id => { try { const s = JSON.parse(localStorage.getItem('kq_kanji_stats_v1'))[id]; return s && s.lastCorrectAt ? 1 : 0; } catch(e) { return 0; } };
    const ボタン = (r, t) => [...r.querySelectorAll('button')].find(b => b.textContent.includes(t));

    const rows = 行();
    const 語を取る = r => r.querySelector('.word-main').textContent.replace(/おすすめ|練習 \d+回/g, '').trim();
    const A = u.list.find(d => d.word === 語を取る(rows[0]));
    const B = u.list.find(d => d.word === 語を取る(rows[1]));
    const C = u.list.find(d => d.word === 語を取る(rows[2]));
    if (!A || !B || !C) { out.えらべない = '行と語を突き合わせられません'; return out; }

    // ★1語めに「⭕ できた」を1回 → 練習+1 かつ 正解が入る（1回の操作で両方）
    ボタン(行()[0], 'できた').click();
    out.できた後の練習 = 数(A);
    out.できた後の正解 = 正解日(A.id);

    // ★「⭕ できた」のとなりに「正解にする」が無いこと（あると2回数えられる＝失敗条件2）
    out.正解にするボタンが残っている = !!ボタン(行()[0], '正解にする');

    // ★2語めに「△ できなかった」を1回 → 練習+1 だけ。正解は入らない（失敗条件3）
    // ⚠️ 2語めは ⭕ が付いていない語。「⭕ が無い語に押しても壊れない」も、ここで見ている
    ボタン(行()[1], 'できなかった').click();
    out.できなかった後の練習 = 数(B);
    out.できなかった後の正解 = 正解日(B.id);

    /* ★3語めで「⭕ が付いている語に できなかった を押す」を見る（失敗条件3b・09-25b 追加）
       できた → できなかった の順に押して、
         ・⭕ が外れること（★これが新しい決まり）
         ・★練習回数は消えず、2回になっていること（外すのは正解の記録だけ） */
    ボタン(行()[2], 'できた').click();
    out.三語め_できた後の正解 = 正解日(C.id);
    out.三語め_できた後の練習 = 数(C);
    ボタン(行()[2], 'できなかった').click();
    out.三語め_できなかった後の正解 = 正解日(C.id);
    out.三語め_できなかった後の練習 = 数(C);

    // ★戻せること（失敗条件4）
    ボタン(行()[1], '練習を1回減らす').click();
    out.減らしたあとの練習 = 数(B);

    // ★1語めの正解も外せること。そのとき練習は減らないこと（別々に戻せる）
    ボタン(行()[0], '正解を取り消す').click();
    out.正解を外したあとの正解 = 正解日(A.id);
    out.正解を外したあとの練習 = 数(A);

    // ★0回になったら、戻すボタンも消えていること（押しても負にならない）
    out.ゼロ回で減らすボタンが消える = !ボタン(行()[1], '練習を1回減らす');
    return out;
  }, { KEY });
}

/* --------------------------------------------------------------
   測定3: 数0のとき、直す前と紙が変わらないか（失敗条件7）
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
            currentSet = []; generateDailySet(false);
            renderTestPrint();
            const テスト = [...document.querySelectorAll('#print-region .test-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
            renderPracticePrint();
            const 練習 = [...document.querySelectorAll('#print-region .p-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
            結果[`${回}|${prio}|${除く}|${語数}`] = { テスト, 練習 };
          });
        });
      });
    });
    return 結果;
  });
}

/* 測定4: 数が紙に出ていないか（失敗条件6） */
async function 測定_数が紙に出ていないか(page) {
  return page.evaluate(() => {
    const counts = {};
    KANJI_DATA.forEach(d => { counts[d.unitKey + '\u0000' + d.word] = 37; });
    localStorage.setItem('kanji_app_practice_count_v1', JSON.stringify({ v: 1, since: '2026-09-25', counts }));
    const 出た = [];
    [...new Set(KANJI_DATA.map(d => d.unitKey))].forEach(回 => {
      selectedUnits = new Set([回]);
      usePicked = false; filterUnmastered = false; filterWeak = false;
      priorityFilter = 'all'; currentCount = 10;
      currentSet = []; generateDailySet(false);
      [['テスト', renderTestPrint], ['練習', renderPracticePrint]].forEach(([名, f]) => {
        f();
        const t = document.getElementById('print-region').textContent;
        ['練習 37回', '37回', '練習 ', 'から数えています', 'できなかった'].forEach(印 => {
          if (t.includes(印)) 出た.push(`${回}/${名}: ${印}`);
        });
      });
    });
    return 出た;
  });
}

/* 測定5: 他の箱を壊さないか（失敗条件5）＋ ★すでに入っている数が消えないか（失敗条件8） */
async function 測定_他の箱と既存の数(page) {
  return page.evaluate(({ KEY }) => {
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

    // ★前の版（刷ったら数える版）が書いた形の保存。done つき。
    //   ここに入っている回数は、新しい版でも消えてはいけない（失敗条件8）
    const 既存 = {};
    既存[key(語[0])] = 5; 既存[key(語[1])] = 2; 既存[key(語[7])] = 9;
    localStorage.setItem(KEY, JSON.stringify({
      v: 1, since: '2026-09-25', counts: JSON.parse(JSON.stringify(既存)),
      done: { ymd: '2026-09-25', sigs: ['10_abc'] }     // 前の版が書いた形
    }));

    // 一覧を開いて、別の語を1回押す（保存を書きかえさせる）
    listUnitKey = 語[0].unitKey;
    selectedUnits = new Set([語[0].unitKey]);
    switchTab('history');
    const 行 = [...document.querySelectorAll('#history-list-container .word-row')];
    const b = [...行[行.length - 1].querySelectorAll('button')].find(x => x.textContent.includes('できなかった'));
    if (b) b.click();
    // 紙も刷ってみる（刷っても数は動かないはず）
    const 練習ボタン = [...document.querySelectorAll('button')].find(x => x.textContent.includes('練習プリントを印刷'));
    switchTab('home');
    currentSet = []; generateDailySet(false);
    if (練習ボタン) { 練習ボタン.click(); 練習ボタン.click(); }

    const いまの = JSON.parse(localStorage.getItem(KEY));
    const 残っている = Object.keys(既存).every(k => いまの.counts[k] === 既存[k]);
    return {
      記録: localStorage.getItem('kq_kanji_stats_v1'), 期待記録: JSON.stringify(記録),
      除外: localStorage.getItem('kanji_app_excluded_v1'), 期待除外: JSON.stringify(除外),
      チェック: localStorage.getItem('kanji_app_picked_v1'), 期待チェック: JSON.stringify(チェック),
      星: localStorage.getItem('kanji_app_star_v1'), 期待星: JSON.stringify(星),
      既存が残っている: 残っている,
      既存: JSON.stringify(既存), いまの数: JSON.stringify(いまの.counts),
      since: いまの.since
    };
  }, { KEY });
}

function 同じか(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-practice2-'));
  ['index.html', 'kanji-data.js'].forEach(f => {
    fs.writeFileSync(path.join(tmp, f), execFileSync('git', ['show', `${BEFORE}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
  });

  const s今 = await serve(ROOT, 8201);
  const s前 = await serve(tmp, 8202);
  const browser = await chromium.launch({ channel: 'chrome' });
  let 終了コード = 0;

  try {
    /* ===== 入口の自己テスト ===== */
    const 自己 = [];
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_刷って増えないか(page, true);
      自己.push({ 名: '(a1) 刷ったら数える偽の実装', 鳴るべき: true, 鳴った: r['練習を2回刷ったあと'] !== r.はじめ,
                 詳細: `刷る前 ${r.はじめ} → 練習を2回刷ったあと ${r['練習を2回刷ったあと']}` });
      await ctx.close();
    }
    {
      // ★失敗条件3b（09-25b で足した決まり）を、偽の実装で鳴らす
      const { ctx, page } = await open(browser, 8201);
      await 壊す_できなかったで正解を外さない(page);
      const r = await 測定_手で入れる(page);
      自己.push({ 名: '(a2) できなかったで ⭕ を外さない偽の実装', 鳴るべき: true,
                 鳴った: r.三語め_できなかった後の正解 !== 0,
                 詳細: `⭕付きの語に できなかった → ${r.三語め_できなかった後の正解 ? '⭕が残った（鳴るべき）' : '⭕が外れた'}` });
      await ctx.close();
    }
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_刷って増えないか(page, false);
      自己.push({ 名: '(b1) いまの実装（刷っても増えない）', 鳴るべき: false,
                 鳴った: r.テスト印刷のあと !== r.はじめ || r.プレビューのあと !== r.はじめ || r['練習を2回刷ったあと'] !== r.はじめ,
                 詳細: `テスト後 ${r.テスト印刷のあと} / プレビュー後 ${r.プレビューのあと} / 練習を2回刷ったあと ${r['練習を2回刷ったあと']}（全部 ${r.はじめ} のままであるべき）` });
      await ctx.close();
    }
    {
      // (b2) 正しい実装では、できなかったで ⭕ が外れる＝3b の検査は鳴らない
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_手で入れる(page);
      自己.push({ 名: '(b2) いまの実装（できなかったで ⭕ が外れる）', 鳴るべき: false,
                 鳴った: r.三語め_できなかった後の正解 !== 0 || r.三語め_できなかった後の練習 !== 2,
                 詳細: `⭕ ${r.三語め_できなかった後の正解 ? '残った（✖）' : '外れた'} / 練習 ${r.三語め_できなかった後の練習}回（2 であるべき＝数は消えない）` });
      await ctx.close();
    }
    {
      // ★向きが逆。対照は「刷ったら増える」のが正しかった版なので、この検査は鳴る
      const { ctx, page } = await open(browser, 8202);
      const r = await 測定_刷って増えないか(page, false);
      自己.push({ 名: `(c) 対照 ${BEFORE}（刷ると増える版）`, 鳴るべき: true, 鳴った: r['練習を2回刷ったあと'] !== r.はじめ,
                 詳細: `刷る前 ${r.はじめ} → 練習を2回刷ったあと ${r['練習を2回刷ったあと']}（★対照では増えるのが正しかった）` });
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
    console.log(`  → ${自己.length}つとも通りました。以下の数字は信用できます。\n`);

    const KANJI_DATA = eval(fs.readFileSync(path.join(ROOT, 'kanji-data.js'), 'utf8') + '; KANJI_DATA');
    const u = 対象の回(KANJI_DATA);
    console.log(`対象に選んだ回: ${u.回}（${u.数}語・4-6b）\n`);

    /* 1. 刷っても増えない */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_刷って増えないか(page, false);
      console.log('【1】★刷っても数が動かないか（失敗条件1・★2026-09-25b で期待値が逆になった所）');
      console.log(`     はじめ ${r.はじめ} / ①テスト印刷のあと ${r.テスト印刷のあと} / プレビューのあと ${r.プレビューのあと} / ★②練習を2回刷ったあと ${r['練習を2回刷ったあと']}`);
      if (r.テスト印刷のあと !== r.はじめ || r.プレビューのあと !== r.はじめ || r['練習を2回刷ったあと'] !== r.はじめ) { console.log('     ✖ 刷って増えています'); 終了コード = 1; }
      else console.log('     → OK（1つも増えていません）\n');
      await ctx.close();
    }

    /* 2. 手で入れる */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_手で入れる(page);
      console.log('【2】★ボタンで入る／二重に数えない／できなかったは正解にしない／戻せる（失敗条件2・3・4）');
      const 判定 = [
        ['「⭕ できた」1回 → 練習が1回になる', r.できた後の練習 === 1, `練習 ${r.できた後の練習}回`],
        ['「⭕ できた」1回 → 正解も同時に入る（1回の操作で両方）', r.できた後の正解 === 1, `正解 ${r.できた後の正解 ? 'あり' : 'なし'}`],
        ['★「正解にする」ボタンが残っていない（残ると2回数えられる）', r.正解にするボタンが残っている === false, r.正解にするボタンが残っている ? '残っている' : '無い'],
        ['「△ できなかった」1回 → 練習が1回になる', r.できなかった後の練習 === 1, `練習 ${r.できなかった後の練習}回`],
        ['★「△ できなかった」→ 正解は入らない', r.できなかった後の正解 === 0, `正解 ${r.できなかった後の正解 ? 'あり（✖）' : 'なし'}`],
        ['⭕ が無い語に「できなかった」を押しても壊れない', r.できなかった後の練習 === 1 && r.できなかった後の正解 === 0, `練習 ${r.できなかった後の練習}回 / 正解 なし`],
        ['★⭕ が付いている語に「できなかった」→ ⭕ が外れる（失敗条件3b・09-25b）', r.三語め_できなかった後の正解 === 0, `できた後 ${r.三語め_できた後の正解 ? '⭕あり' : '⭕なし'} → できなかった後 ${r.三語め_できなかった後の正解 ? '⭕あり（✖）' : '⭕なし'}`],
        ['★★そのとき練習回数は消えない（外すのは正解だけ・失敗条件8）', r.三語め_できなかった後の練習 === 2, `できた後 ${r.三語め_できた後の練習}回 → できなかった後 ${r.三語め_できなかった後の練習}回（2 であるべき）`],
        ['「↩ 練習を1回減らす」で戻せる', r.減らしたあとの練習 === 0, `練習 ${r.減らしたあとの練習}回`],
        ['「↩ 正解を取り消す」で正解だけ外せる', r.正解を外したあとの正解 === 0 && r.正解を外したあとの練習 === 1, `正解 ${r.正解を外したあとの正解 ? 'あり（✖）' : 'なし'} / 練習 ${r.正解を外したあとの練習}回（1 のままであるべき）`],
        ['0回になったら「減らす」ボタンが消える（負にならない）', r['ゼロ回で減らすボタンが消える'] === true, r['ゼロ回で減らすボタンが消える'] ? '消えた' : '残っている']
      ];
      判定.forEach(([名, ok, 詳]) => { if (!ok) 終了コード = 1; console.log(`     ${ok ? 'OK ' : '✖ '} ${名}　（${詳}）`); });
      console.log('');
      await ctx.close();
    }

    /* 3. 数0で紙が変わらない */
    {
      const a = await (async () => { const { ctx, page } = await open(browser, 8201); const r = await 測定_数0の紙(page); await ctx.close(); return r; })();
      const b = await (async () => { const { ctx, page } = await open(browser, 8202); const r = await 測定_数0の紙(page); await ctx.close(); return r; })();
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      const ちがう = keys.filter(k => !同じか(a[k], b[k]));
      console.log('【3】数が全部0のとき、直す前の版と紙が1枚でも変わっていないか（失敗条件7）');
      console.log(`     比べた紙: ${keys.length}組（テスト＋練習＝${keys.length * 2}枚ぶん） / 対照: ${BEFORE}（コミット固定・4-6c）`);
      console.log(`     ちがった紙: ${ちがう.length}組`);
      if (ちがう.length > 0) {
        終了コード = 1;
        ちがう.slice(0, 5).forEach(k => { console.log(`     ✖ ${k}`); console.log(`        直す前: ${JSON.stringify(b[k]).slice(0, 160)}`); console.log(`        いま  : ${JSON.stringify(a[k]).slice(0, 160)}`); });
        console.log('');
      } else console.log('     → OK（1枚も変わっていません）\n');
    }

    /* 4. 紙に数が出ていない */
    {
      const { ctx, page } = await open(browser, 8201);
      const 出た = await 測定_数が紙に出ていないか(page);
      console.log('【4】数や画面の文言が紙に印刷されていないか（失敗条件6）');
      console.log(`     全語に「37回」を入れた状態で、全${new Set(KANJI_DATA.map(d => d.unitKey)).size}回 × テスト／練習 の紙を描いて中を見た`);
      console.log(`     見つかった紙: ${出た.length}枚`);
      if (出た.length > 0) { 終了コード = 1; 出た.slice(0, 10).forEach(x => console.log(`     ✖ ${x}`)); console.log(''); }
      else console.log('     → OK\n');
      await ctx.close();
    }

    /* 5. 他の箱＋既存の数 */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_他の箱と既存の数(page);
      console.log('【5】ほかの記録が壊れないか（失敗条件5）と、★すでに入っている数が残るか（失敗条件8）');
      [['記録(kq_kanji_stats_v1)', r.記録, r.期待記録],
       ['出さない(kanji_app_excluded_v1)', r.除外, r.期待除外],
       ['チェック(kanji_app_picked_v1)', r.チェック, r.期待チェック],
       ['★最優先(kanji_app_star_v1)', r.星, r.期待星]].forEach(([名, いま, 期待]) => {
        const ok = いま === 期待;
        if (!ok) 終了コード = 1;
        console.log(`     ${ok ? 'OK ' : '✖ '} ${名}`);
        if (!ok) { console.log(`        期待: ${期待}`); console.log(`        いま: ${いま}`); }
      });
      console.log(`     ${r.既存が残っている ? 'OK ' : '✖ '} ★前の版が書いた練習回数が、そのまま残っている（失敗条件8）`);
      console.log(`        入れておいた: ${r.既存}`);
      console.log(`        いまの数    : ${r.いまの数}`);
      if (!r.既存が残っている) 終了コード = 1;
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
