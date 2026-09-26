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

   ★★9番は依頼書に無く、あとから足しました（2026-09-25b・司令塔が公開版で見つけた漏れ）。
      **消したボタンの名前が、案内文に残ったまま公開されていました。**
        残っていた文: 「…できた語は日付を入れて『⭕ 正解にする』。」
        ★そのボタンは、この版で [⭕ できた] に置きかえて消したものです。

      ★なぜ前の検査をすり抜けたか（ここが肝心です）
        実機確認の【⑦】は「説明に必要な言葉が**あるか**」しか見ていませんでした。
        ★**「あるか」だけを見る検査は、消し忘れを永久に見つけられません。**網を広げても同じです。
        → だから「★**無いはずのものが無いか**」を見る枝を足しました（4-3b と同じ根の逆向き）。

      ⚠️ ボタンや機能を消したら、★その名前を「消した文言」に足すこと。
         足さないと、次に同じ消し忘れが起きても誰も気づきません。

   ============================================================================
   ★★2026-09-26 に、入力を ②「今日の採点」に一本化しました（依頼書 = 漢字プリント_入力を②に一本化_依頼_2026-09-26.md）。
      ユーザーの言葉:「社会の漢字で、練習したを入力するにはどうすればいいですか？」
                      「★できた、練習したは、同じ画面で入力したいです」

      ★何が起きていたか: 同じ「⭕ できた」という名前のボタンが②と③の2か所にあって、
        ★効きめが違いました。②で押しても練習は増えず（setResult → saveCheckResults）、
        練習が入るのは③だけ（markPracticed）。ユーザーは②で採点していたので、
        ★練習回数がいつまでも0でした。

      ★いまの決まり（②の「保存」を押したとき）
        ・その紙に出ていた語ぜんぶ … 練習 +1（★同じ日・同じ紙ぞろえなら1回だけ）
        ・⭕ を押した語 ……………… 今日の正解として記録
        ・★押していない語 ………… 「できなかった」として ⭕ を外す
      ★③は残します（あとから直すところ）。②に並ぶのはその紙の語だけなので、
        紙に出ていない語を直す手段が要るためです。

      ⚠️ だから、この道具が ca2c0c0（＝②で保存しても練習が入らなかった公開版）に当たると
         【7】で鳴ります。★それが正しい動きです。入口の自己テスト (c3) に使っています。
         ★「捕まえられるか」を、★実際に壊れていた版に当てて確かめる（4-3c の最後の1つ）。
   ============================================================================

   ★見ているもの（依頼書 2026-09-25b「何が起きたら失敗か」の1〜8 ＋ 9 ＋ 2026-09-26 の 10〜13）
     1. 練習プリントを刷って、数が増える（自動が残っている）
     2. 1回の練習が2回数えられる
     3. 「できなかった」を選んだのに、正解の記録が入る
     3b.★「できなかった」を押したのに、前に付いていた ⭕（正解の日付）が残っている（09-25b 追加）
     4. 押し間違いを戻せない
     5. 記録（正解日）・★最優先・チェック・「出さない」のどれかが壊れる
     6. 数が紙に印刷される
     7. 数が全部0のとき、紙が1枚でも変わる
     8. すでに入っている練習回数が消える／勝手に変わる
     9.★消したボタンの名前が、画面の案内文に残っている（09-25b 追加・上の囲み参照）
     10.★②で保存しても、練習回数が入らない（09-26 追加。★ca2c0c0 で実際に起きていたこと）
     11.★②で保存を2回押したら、練習が2回数えられる
     12.★②で保存したときに、★その紙に無い語の記録が動く
     13.「✨ すべてできた」→ 保存 で、全語に 練習+1 と正解が入らない

   ★入口の自己テスト（4-1 / 4-3 / 4-6c）。1つでも落ちたら数字を出さずに終了コード3で止まります。
       (a1) 刷ったら数える偽の実装                  → 鳴るべき
       (a2) できなかったで ⭕ を外さない偽の実装    → 鳴るべき（09-25b で足した決まり）
       (a3)★②の保存で練習を入れない偽の実装        → 鳴るべき（09-26）
       (a4)★②の保存で二重に数える偽の実装          → 鳴るべき（09-26）
       (a5)★②の保存が紙に無い語まで触る偽の実装    → 鳴るべき（09-26）
       (b1) いまの実装（刷っても増えない）          → 鳴ってはいけない
       (b2) いまの実装（できなかったで ⭕ が外れる）→ 鳴ってはいけない
       (b3)★いまの実装（②の保存で練習が入る）      → 鳴ってはいけない（09-26）
       (c)  対照 2b43d78（刷ると増える版）          → 鳴るべき（★向きが逆。上の囲みのとおり）
       (c2) 対照 2b43d78（「⭕ 正解にする」が現役）  → 鳴るべき
       (c3)★対照 ca2c0c0（②で保存しても練習が入らない版）→ 鳴るべき
            ★★これが「実際に壊れていた版」です。対照で鳴るだけでは「その版に在った」ことしか
              言えないので、★ユーザーが困っていた当の版に当てています（4-3c の最後の1つ）。
       (c3b)★対照 ca2c0c0（書き直す前の説明文が現役）→ 鳴るべき（消した文言の台帳・4-3c）
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
// ★手で入れる形に変える直前の公開版（＝09-25b の依頼書が指定した対照）。HEAD にしないこと
const BEFORE = '2b43d78';
/* ★2026-09-26b の対照。★HEAD にしないこと。
   ★この版が「保存すると、押していない語の ⭕ が消える／紙の語ぜんぶに練習+1」当の版です。
      ＝ ユーザーが実際に困った版。(c3)(c3b) で当てています */
const BEFORE26 = '763cb63';
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

/* ★この版で画面から消したものの名前。★画面に残っていたら鳴ります。
   ⚠️ ここは「消したら足す」台帳です。ボタンや機能を消すたびに1行足してください。
      ★対照 2b43d78 では「⭕ 正解にする」が現役だったので、そちらでは正しく鳴ります（(c) に使用）。 */
const 消した文言 = [
  { 語: '⭕ 正解にする', いつ: '2026-09-25b', なぜ: '[⭕ できた] に置きかえた（1回の操作で練習と正解の両方が入る形にするため）' },
  /* ★②の説明文は 2026-09-26 に書き直しました。押していない語は ⭕ が外れるようになったので、
     「そのままで大丈夫」は★もう本当ではありません（失敗条件5＝説明と食いちがう）。
     ★対照 ca2c0c0 にはこの文が現役であるため、(c3b) で鳴ることを確かめています */
  { 語: '何も押さずにそのままで大丈夫', いつ: '2026-09-26', なぜ: '②の保存で、押していない語は ⭕ が外れるようになった（説明と食いちがうため書き直し）' },
  /* ★2026-09-26b。★押していない語に何もしない形にしたので、763cb63 の説明は全部うそになりました。
     ★対照 763cb63 には5つとも現役なので、(c3b) で「5つとも鳴る」ことを確かめています */
  { 語: '紙に出ていた語ぜんぶに「練習 1回」', いつ: '2026-09-26b', なぜ: '★書いた語だけを数える形にした（紙に10語あっても書くのは4語）' },
  { 語: '押していない語は「できなかった」として', いつ: '2026-09-26b', なぜ: '★押していない語には何もしなくなった（⭕ を消すのは記録の消失）' },
  { 語: 'ふだんの入力は「② できた / できなかった」', いつ: '2026-09-26b', なぜ: '★練習回数は③でしか入らなくなったので、②が「ふだんの入力」ではなくなった' },
  { 語: '②で保存した語をここでもう一度押すと', いつ: '2026-09-26b', なぜ: '★②の保存では練習がふえなくなったので、二重に数える話そのものが無くなった' },
  { 語: '「② 今日の採点」で保存した回数', いつ: '2026-09-26b', なぜ: '★練習回数は③のボタンだけで入るようになった' },
  { 語: '△ できなかった', いつ: '2026-09-26b', なぜ: '★[✏️ 練習した] に改名し、効きめも変えた（⭕ を外さなくなった）' }
];
// ★2026-09-26b に足したぶん（(c3b) はこれが「対照で全部鳴る」ことを見ます）
const 消した文言_26b = 消した文言.filter(x => x.いつ === '2026-09-26b');

/* --------------------------------------------------------------
   測定6: ★消したボタンの名前が、画面のどこかに残っていないか（失敗条件9）
   ⚠️ ①②③の3つのタブを全部見ます。③だけ見ると、ほかのタブの消し忘れを拾えません。
   ⚠️ 見るのは**画面に出ている文字**（textContent）です。ソースの grep ではありません。
      コメントに名前が残っているのは無害なので、そこを鳴らさないためです。
   -------------------------------------------------------------- */
async function 測定_消した文言が残っていないか(page, 消した文言) {
  return page.evaluate(({ 消した文言 }) => {
    const 出た = [];
    const 見る = 名 => {
      ['home', 'check', 'history'].forEach(tab => {
        try { switchTab(tab); } catch(e) { return; }
        const el = document.getElementById('screen-' + tab);
        if (!el) return;
        // たたんである説明の中も読む（textContent は open でなくても中身を返す）
        const t = el.textContent.replace(/\s+/g, ' ');
        消した文言.forEach(x => { if (t.includes(x.語)) 出た.push({ タブ: tab, 語: x.語 }); });
      });
    };
    // 一覧に語が並んでいる状態にしてから見る（空の画面だと案内文しか出ない）
    listUnitKey = KANJI_DATA[0].unitKey;
    selectedUnits = new Set([KANJI_DATA[0].unitKey]);
    currentSet = [];
    try { generateDailySet(false); } catch(e) {}
    見る();
    return 出た;
  }, { 消した文言 });
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
   測定2: ★③一覧の [⭕ できた] と [✏️ 練習した] が★完全に別ものであること（2026-09-26b）
   ★本物のボタンを押します。

   ★★2026-09-25b から、ここの期待値を2か所ひっくり返しました。
      ★「通らないから緩めた」のではありません。「★仕様が変わったので揃えた」ほうです。
        09-25b: [⭕ できた]     は 練習+1 ＋ 正解    → ★いま: 正解だけ（練習は動かない）
        09-25b: [△ できなかった] は 練習+1 ＋ ⭕ を外す → ★いま: [✏️ 練習した]＝練習+1 だけ

      ユーザーの言葉（09-26・763cb63 の公開直後）:
        「★できたものは練習していません」
        「★練習の紙と確認の紙は別に作ってるじゃないですか？」
      ＝ 確認の紙（①）で正解した語を、練習の紙（②）で書いたとはかぎらない。
      ★「⭕ を外す」を担うのは「↩ 正解を取り消す」だけになりました。
   -------------------------------------------------------------- */
/* ★偽の実装（自己テスト用）。★今回いちばん大事な枝です。
   「✏️ 練習した」で ⭕ が外れてしまう形（＝09-25b の古い効きめ）を仕込んで、測定2が鳴るかを見る */
async function 壊す_練習したで正解が外れる(page) {
  await page.evaluate(() => {
    window.markPracticedOnly = function (id) {
      const item = KANJI_DATA.find(d => d.id === id);
      if (!item) return;
      addPractice(item, +1);
      clearCorrect(id);                 // ★これが偽の実装（⭕ を外してしまう）
      updateProgressDisplay();
      renderHistoryList();
    };
  });
}
/* ★偽の実装。「⭕ できた」で練習も数えてしまう形 */
async function 壊す_できたで練習も数える(page) {
  await page.evaluate(() => {
    const 元 = window.markCorrect;
    window.markCorrect = function (id, ymd) {
      const item = KANJI_DATA.find(d => d.id === id);
      if (item) addPractice(item, +1);  // ★これが偽の実装
      return 元(id, ymd);
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
    const 正解日 = id => { try { const s = (JSON.parse(localStorage.getItem('kq_kanji_stats_v1')) || {})[id]; return s && s.lastCorrectAt ? ymdOf(s.lastCorrectAt) : null; } catch(e) { return null; } };
    const ボタン = (r, t) => [...r.querySelectorAll('button')].find(b => b.textContent.includes(t));
    /* ⚠️ 押せなかったボタンは、黙って飛ばさずに控えます。
       ★偽の実装を入れると、あるはずのボタンが消えることがあります（ここで落ちると
         自己テストそのものが止まってしまい、鳴るかどうかが分かりません）。
       ★本番では「押せなかった＝0件」を判定に入れてあるので、見のがしません。 */
    const 押せなかった = [];
    const 押す = (r, t) => { const b = ボタン(r, t); if (b) b.click(); else 押せなかった.push(t); };

    const rows = 行();
    const 語を取る = r => r.querySelector('.word-main').textContent.replace(/おすすめ|練習 \d+回/g, '').trim();
    const A = u.list.find(d => d.word === 語を取る(rows[0]));
    const B = u.list.find(d => d.word === 語を取る(rows[1]));
    const C = u.list.find(d => d.word === 語を取る(rows[2]));
    if (!A || !B || !C) { out.えらべない = '行と語を突き合わせられません'; return out; }

    // ★1語め「⭕ できた」→ 正解だけ入る。★練習は動かない
    押す(行()[0], 'できた');
    out.できた後の正解 = 正解日(A.id) !== null;
    out.できた後の練習 = 数(A);
    out.正解にするボタンが残っている = !!ボタン(行()[0], '正解にする');

    // ★2語め「✏️ 練習した」→ 練習だけ1回。正解は入らない
    押す(行()[1], '練習した');
    out.練習した後の練習 = 数(B);
    out.練習した後の正解 = 正解日(B.id) !== null;

    // ★3語め ⭕ を入れてから「✏️ 練習した」→ ★⭕ は残る（ここが 09-25b と逆）
    押す(行()[2], 'できた');
    out.三語め_できた後の正解 = 正解日(C.id);
    押す(行()[2], '練習した');
    out.三語め_練習した後の正解 = 正解日(C.id);
    out.三語め_練習した後の練習 = 数(C);

    // ★戻せること
    押す(行()[1], '練習を1回減らす');
    out.減らしたあとの練習 = 数(B);
    押す(行()[0], '正解を取り消す');
    out.正解を外したあとの正解 = 正解日(A.id) !== null;
    out.ゼロ回で減らすボタンが消える = !ボタン(行()[1], '練習を1回減らす');

    // ★3語めの ⭕ を「↩ 正解を取り消す」で外す → 練習は残る（外すのはここだけ）
    押す(行()[2], '正解を取り消す');
    out.取り消したあとの正解 = 正解日(C.id);
    out.取り消したあとの練習 = 数(C);
    out.押せなかった = 押せなかった;
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

/* --------------------------------------------------------------
   測定7: ★②「今日の採点」の保存は、★押した語しか動かさない（2026-09-26b・失敗条件1〜5）
   ★本物のボタンを押します（⭕ も 保存 も）。
   ⚠️ 先に仕込むもの（★ここが検査の本体です）
      ・★紙に出ていて、これから押さない語に ⭕ を入れておく
          → 保存で★外れてはいけない（＝ 763cb63 の記録の消失。失敗条件2）
      ・★その紙に無い語に、練習5回と ⭕ を入れておく → 保存で動いてはいけない（失敗条件7）
      ・★押した語の練習回数も動いてはいけない（失敗条件3）
        ユーザーの言葉:「★できたものは練習していません」「★練習の紙と確認の紙は別に作ってる」
   -------------------------------------------------------------- */
async function 測定_採点して保存(page, 壊す) {
  return page.evaluate(({ KEY, 壊す }) => {
    const out = {};
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];

    localStorage.removeItem(KEY);
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    ['kanji_app_excluded_v1', 'kanji_app_picked_v1', 'kanji_app_star_v1'].forEach(k => localStorage.setItem(k, '[]'));

    selectedUnits = new Set([u.回]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = []; generateDailySet(false);
    const 紙 = currentSet.map(d => d.id);
    out.紙の語数 = 紙.length;
    if (紙.length < 5) { out.えらべない = '紙に5語も出ていません'; return out; }

    const 外 = u.list.find(d => 紙.indexOf(d.id) < 0);
    if (!外) { out.えらべない = '紙に無い語が見つかりません'; return out; }
    for (let i = 0; i < 5; i++) addPractice(外, +1);
    setCorrectOn(外.id, '2026-01-05');
    // ★紙に出ていて、押さない語。⭕ を先に入れておく（★保存で外れてはいけない）
    const 触らない = currentSet[3];
    setCorrectOn(触らない.id, '2026-01-05');
    // ★押す語にも練習を先に入れておく（★保存で動いてはいけない＝できた ≠ 練習した）
    addPractice(currentSet[0], +1);
    addPractice(currentSet[0], +1);

    const 数 = id => {
      const it = KANJI_DATA.find(d => d.id === id);
      try { const o = JSON.parse(localStorage.getItem(KEY)); return ((o && o.counts) || {})[it.unitKey + '\u0000' + it.word] || 0; } catch(e) { return 0; }
    };
    const 正解日 = id => {
      try { const s = (JSON.parse(localStorage.getItem('kq_kanji_stats_v1')) || {})[id]; return s && s.lastCorrectAt ? ymdOf(s.lastCorrectAt) : null; } catch(e) { return null; }
    };

    /* ★偽の実装（自己テスト用）。⚠️ 画面の作りには触りません */
    if (壊す === '押していない語も触る') {
      // ★763cb63 と同じ形。押していない語の ⭕ を外す（＝記録の消失）
      // ⚠️ 下書きの形（{ did, ok }）に合わせること。'ok' の文字列比較にすると★何も起きず、
      //    偽の実装が「鳴らない」＝検査が通ってしまいます（2026-09-26b に実際に踏みました）
      window.saveCheckResults = function () {
        const today = todayYmd(), ts = ymdToMs(today);
        const m = getMastery();
        currentSet.forEach(it => {
          if ((currentResults[it.id] || {}).ok) {
            m[it.id] = { correct: 1, wrong: 0, lastAnswered: ts, lastCorrectAt: ts, box: 1, nextDue: ts + 2 * 86400000 };
          } else { delete m[it.id]; }
        });
        currentSet.forEach(it => addPractice(it, +1));   // ★紙の語ぜんぶに +1（763cb63 と同じ）
        saveMastery(m); updateProgressDisplay(); renderHistoryList(); renderCheckList();
      };
    } else if (壊す === '紙の語ぜんぶ数える') {
      // ★763cb63 と同じ形。紙の語ぜんぶに練習 +1
      const 元 = window.saveCheckResults;
      window.saveCheckResults = function () {
        currentSet.forEach(it => addPractice(it, +1));
        return 元.apply(this, arguments);
      };
    } else if (壊す === 'できたで練習も数える') {
      // ★「⭕ できた」で練習も +1 してしまう（ユーザー:「できたものは練習していません」）
      const 元 = window.saveCheckResults;
      window.saveCheckResults = function () {
        currentSet.filter(it => (currentResults[it.id] || {}).ok).forEach(it => addPractice(it, +1));
        return 元.apply(this, arguments);
      };
    }

    switchTab('check');
    const 行 = () => [...document.querySelectorAll('#check-list-container .check-item')];
    const ボタン = (r, t) => [...r.querySelectorAll('button')].find(b => b.textContent.includes(t));
    const 押せなかった = [];
    const 押す = (n, t) => { const b = ボタン(行()[n], t); if (b) b.click(); else 押せなかった.push(n + ':' + t); };
    const 保存 = () => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('採点結果を保存する')); if (b) b.click(); };
    out.行数 = 行().length;
    out.最初から押されている行 = 行().filter(r => r.classList.contains('is-correct') || r.classList.contains('is-did')).length;
    out.前の記録が見えている = !!(行()[3] && 行()[3].querySelector('.word-done'));

    /* ★押しかた（★4通りを1枚の紙で見ます）
         1語め … [✏️ 練習した] だけ      → 練習+1 だけ（先に2回入れてあるので 3回）
         2語め … [⭕ できた] だけ        → 正解だけ（★練習は 0 のまま）
         3語め … ★両方                  → 練習+1 と 正解の両方
         4語め … ★どちらも押さない      → ★何も動かない（⭕ 2026-01-05 が残る） */
    押す(0, '練習した');
    押す(1, 'できた');
    押す(2, '練習した');
    押す(2, 'できた');
    out.押せなかった = 押せなかった;
    out.保存前に正解が入った = 正解日(紙[1]) !== null;
    out.保存前の練習 = [数(紙[0]), 数(紙[2])];

    保存();
    out.今日 = todayYmd();
    out.練習だけ押した語 = { 練習: 数(紙[0]), 正解: 正解日(紙[0]) };   // ★3回 / 正解なし
    out.できただけ押した語 = { 練習: 数(紙[1]), 正解: 正解日(紙[1]) }; // ★0回 / 今日
    out.両方押した語 = { 練習: 数(紙[2]), 正解: 正解日(紙[2]) };       // ★1回 / 今日
    out.触らない語の正解 = 正解日(触らない.id);                        // ★★2026-01-05 のまま
    out.触らない語の練習 = 数(触らない.id);
    out.紙の練習合計 = 紙.map(数).reduce((a, b) => a + b, 0);          // ★2+1+1 = 4
    out.紙に無い語の練習 = 数(外.id);
    out.紙に無い語の正解 = 正解日(外.id);

    switchTab('check');
    保存();
    out.二回目の紙の練習合計 = 紙.map(数).reduce((a, b) => a + b, 0);
    out.二回目の触らない語の正解 = 正解日(触らない.id);
    return out;
  }, { KEY, 壊す });
}

/* 測定8: 「✨ すべてできた」→ 保存 で、全語に今日の正解が入る。★練習は動かない（失敗条件3・5） */
async function 測定_すべてできた(page) {
  return page.evaluate(({ KEY }) => {
    const out = {};
    const byUnit = {};
    KANJI_DATA.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
    const u = Object.entries(byUnit).map(([k, list]) => ({ 回: k, list }))
      .filter(x => x.list.length >= 20).sort((a, b) => b.list.length - a.list.length)[0];
    localStorage.removeItem(KEY);
    localStorage.setItem('kq_kanji_stats_v1', '{}');
    selectedUnits = new Set([u.回]);
    usePicked = false; filterUnmastered = false; filterWeak = false;
    priorityFilter = 'all'; currentCount = 10;
    currentSet = []; generateDailySet(false);
    const 紙 = currentSet.map(d => d.id);
    switchTab('check');
    const 押す = t => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(t)); if (b) b.click(); };
    押す('すべてできた');
    押す('採点結果を保存する');
    const 数 = id => {
      const it = KANJI_DATA.find(d => d.id === id);
      try { const o = JSON.parse(localStorage.getItem(KEY)); return ((o && o.counts) || {})[it.unitKey + '\u0000' + it.word] || 0; } catch(e) { return 0; }
    };
    const 正解日 = id => { try { const s = (JSON.parse(localStorage.getItem('kq_kanji_stats_v1')) || {})[id]; return s && s.lastCorrectAt ? ymdOf(s.lastCorrectAt) : null; } catch(e) { return null; } };
    out.語数 = 紙.length;
    out.練習 = 紙.map(数);
    out.正解 = 紙.map(正解日);
    out.今日 = todayYmd();
    return out;
  }, { KEY });
}

// ★測定7の結果を「鳴った／鳴らない」の1つの値にする（自己テストと本番で同じ読み方をするため）
function 測定7が鳴ったか(r) {
  if (r.えらべない) return { 鳴った: true, 理由: r.えらべない };
  const 理由 = [];
  const 練 = r.練習だけ押した語 || {}, 出 = r.できただけ押した語 || {}, 両 = r.両方押した語 || {};
  if ((r.押せなかった || []).length) 理由.push(`押せなかったボタンがある(${r.押せなかった.join('・')})`);
  if (r.保存前に正解が入った) 理由.push('保存を押す前に正解が入っている');
  if ((r.保存前の練習 || []).some(n => n !== 0 && n !== 2)) 理由.push(`保存を押す前に練習が動いた(${(r.保存前の練習 || []).join(',')})`);
  if (練.練習 !== 3) 理由.push(`★[練習した]だけの語の練習が 3 でない(${練.練習})`);
  if (練.正解 !== null) 理由.push(`★[練習した]だけの語に正解が入った(${練.正解})`);
  if (出.正解 !== r.今日) 理由.push(`[できた]だけの語の正解が今日でない(${出.正解})`);
  if (出.練習 !== 0) 理由.push(`★★[できた]だけの語の練習が動いた(0→${出.練習})＝できた≠練習した`);
  if (両.練習 !== 1 || 両.正解 !== r.今日) 理由.push(`★両方押した語が両方入っていない(練習${両.練習}/正解${両.正解})`);
  if (r.触らない語の正解 !== '2026-01-05') 理由.push(`★★押していない語の ⭕ が外れた(2026-01-05→${r.触らない語の正解})＝記録の消失`);
  if (r.触らない語の練習 !== 0) 理由.push(`★押していない語の練習が増えた(${r.触らない語の練習})`);
  if (r.紙の練習合計 !== 4) 理由.push(`★紙ぜんぶの練習が合わない(4であるべき→${r.紙の練習合計})`);
  if (r.紙に無い語の練習 !== 5) 理由.push(`★紙に無い語の練習が動いた(5→${r.紙に無い語の練習})`);
  if (r.紙に無い語の正解 !== '2026-01-05') 理由.push(`★紙に無い語の正解が動いた(${r.紙に無い語の正解})`);
  if (r.二回目の紙の練習合計 !== 4) 理由.push(`★保存2回で練習が増えた(${r.二回目の紙の練習合計})`);
  if (r.二回目の触らない語の正解 !== '2026-01-05') 理由.push(`★保存2回めで ⭕ が外れた(${r.二回目の触らない語の正解})`);
  if (r.最初から押されている行 !== 0) 理由.push(`開いた時点で押された行がある(${r.最初から押されている行})`);
  return { 鳴った: 理由.length > 0, 理由: 理由.join(' / ') };
}

function 同じか(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-practice2-'));
  const tmp26 = fs.mkdtempSync(path.join(os.tmpdir(), 'kanji-practice26-'));
  ['index.html', 'kanji-data.js'].forEach(f => {
    fs.writeFileSync(path.join(tmp, f), execFileSync('git', ['show', `${BEFORE}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
    fs.writeFileSync(path.join(tmp26, f), execFileSync('git', ['show', `${BEFORE26}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
  });

  const s今 = await serve(ROOT, 8201);
  const s前 = await serve(tmp, 8202);
  const s前26 = await serve(tmp26, 8203);   // ★②で保存しても練習が入らなかった版（ca2c0c0）
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
      /* ★★(a2) 今回いちばん大事な枝。「✏️ 練習した」で ⭕ が外れる偽の実装で鳴ること。
         ＝ 09-25b の古い効きめが残っていたら捕まえる、という向きです */
      const { ctx, page } = await open(browser, 8201);
      await 壊す_練習したで正解が外れる(page);
      const r = await 測定_手で入れる(page);
      自己.push({ 名: '(a2) ★「練習した」で ⭕ が外れる偽の実装', 鳴るべき: true,
                 鳴った: r.三語め_練習した後の正解 === null,
                 詳細: `⭕付きの語に 練習した → ${r.三語め_練習した後の正解 ? '⭕が残った' : '★⭕が外れた（鳴るべき）'}` });
      await ctx.close();
    }
    {
      // ★(a2b)「できた」で練習も数える偽の実装で鳴ること
      const { ctx, page } = await open(browser, 8201);
      await 壊す_できたで練習も数える(page);
      const r = await 測定_手で入れる(page);
      自己.push({ 名: '(a2b) ★「できた」で練習も数える偽の実装', 鳴るべき: true,
                 鳴った: r.できた後の練習 !== 0,
                 詳細: `できたを押したあとの練習 ${r.できた後の練習}回（0 であるべき）` });
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
      // ★(c2) 対照 2b43d78 には「⭕ 正解にする」が現役である。
      //    ＝「消した文言が残っていないか」の検査は、対照で鳴るのが正しい（4-6c）
      const { ctx, page } = await open(browser, 8202);
      const r = await 測定_消した文言が残っていないか(page, 消した文言);
      自己.push({ 名: `(c2) 対照 ${BEFORE}（「⭕ 正解にする」が現役の版）`, 鳴るべき: true, 鳴った: r.length > 0,
                 詳細: `見つかった件数 ${r.length}（★対照では現役なので出るのが正しい）` });
      await ctx.close();
    }
    {
      // (b2) 正しい実装では ⭕ が残り、練習だけ増える＝上の2つは鳴らない
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_手で入れる(page);
      自己.push({ 名: '(b2) いまの実装（練習したで ⭕ は外れない／できたで練習は増えない）', 鳴るべき: false,
                 鳴った: r.三語め_練習した後の正解 === null || r.できた後の練習 !== 0,
                 詳細: `3語めの ⭕ ${r.三語め_練習した後の正解 || '外れた（✖）'} / できた後の練習 ${r.できた後の練習}回（0 であるべき）` });
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
    /* ===== ここから 2026-09-26b（★押した語しか動かさない）ぶん ===== */
    for (const [名, 壊す] of [['(a3) ★押していない語の ⭕ を外す偽の実装（＝763cb63 と同じ形）', '押していない語も触る'],
                              ['(a4) ★紙の語ぜんぶに練習+1する偽の実装（＝763cb63 と同じ形）', '紙の語ぜんぶ数える'],
                              ['(a5) ★「できた」で練習も数える偽の実装', 'できたで練習も数える']]) {
      const { ctx, page } = await open(browser, 8201);
      const r = 測定7が鳴ったか(await 測定_採点して保存(page, 壊す));
      自己.push({ 名, 鳴るべき: true, 鳴った: r.鳴った, 詳細: r.鳴った ? r.理由 : '鳴りませんでした（★偽の実装を見逃しています）' });
      await ctx.close();
    }
    {
      const { ctx, page } = await open(browser, 8201);
      const r = 測定7が鳴ったか(await 測定_採点して保存(page, null));
      自己.push({ 名: '(b3) いまの実装（★押した語しか動かさない）', 鳴るべき: false, 鳴った: r.鳴った,
                 詳細: r.鳴った ? r.理由 : '鳴りません（正しい）' });
      await ctx.close();
    }
    {
      /* ★★(c3) 実際に困っていた版に当てる（4-3c の最後の1つ）。
         763cb63 は「保存すると押していない語の ⭕ が消える」まま公開していた版そのものです。
         ここで鳴らなければ、この検査はユーザーが困った不具合を捕まえられません。 */
      const { ctx, page } = await open(browser, 8203);
      const r = 測定7が鳴ったか(await 測定_採点して保存(page, null));
      自己.push({ 名: `(c3) ★対照 ${BEFORE26}（押していない語の ⭕ が消えた公開版）`, 鳴るべき: true, 鳴った: r.鳴った,
                 詳細: r.鳴った ? r.理由 : '鳴りませんでした（★実際の不具合を捕まえられていません）' });
      await ctx.close();
    }
    {
      /* ★(c3b) 書き直す前の説明文が、対照 763cb63 に★5つとも現役であること。
         ★1つでも見つからなければ、その台帳の行は「画面に出ない文字」を見ていることになります
         （＝その行は何も守っていない。書き写しのまちがいもここで分かります）。 */
      const { ctx, page } = await open(browser, 8203);
      const r = await 測定_消した文言が残っていないか(page, 消した文言);
      const 出た = new Set(r.map(x => x.語));
      const 出なかった = 消した文言_26b.filter(x => !出た.has(x.語)).map(x => x.語);
      自己.push({ 名: `(c3b) ★対照 ${BEFORE26}（書き直す前の説明文が★5つとも現役の版）`, 鳴るべき: true,
                 鳴った: 出なかった.length === 0 && 消した文言_26b.length > 0,
                 詳細: 出なかった.length === 0
                   ? `${消した文言_26b.length}つとも見つかった（対照では現役なので出るのが正しい）`
                   : `★対照で見つからない台帳の行があります: ${出なかった.join(' / ')}` });
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

    /* 2. ③の2つのボタンが別ものか */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_手で入れる(page);
      console.log('【2】★③の [⭕ できた] と [✏️ 練習した] が★完全に別ものか（2026-09-26b）');
      const 判定 = [
        ['「⭕ できた」→ 正解が入る', r.できた後の正解 === true, r.できた後の正解 ? '入った' : '入らない'],
        ['★★「⭕ できた」→ 練習は動かない（確認の紙と練習の紙は別物）', r.できた後の練習 === 0, `練習 ${r.できた後の練習}回（0 であるべき）`],
        ['★「正解にする」ボタンが残っていない', r.正解にするボタンが残っている === false, r.正解にするボタンが残っている ? '残っている' : '無い'],
        ['「✏️ 練習した」→ 練習が1回ふえる', r.練習した後の練習 === 1, `練習 ${r.練習した後の練習}回`],
        ['★「✏️ 練習した」→ 正解は入らない', r.練習した後の正解 === false, r.練習した後の正解 ? '入った（✖）' : '入らない'],
        ['★★⭕ が付いている語に「✏️ 練習した」→ ★⭕ は外れない（09-25b と逆・09-26b）', r.三語め_練習した後の正解 !== null && r.三語め_練習した後の正解 === r.三語め_できた後の正解, `できた後 ${r.三語め_できた後の正解} → 練習した後 ${r.三語め_練習した後の正解}`],
        ['★そのとき練習は1回ふえる', r.三語め_練習した後の練習 === 1, `練習 ${r.三語め_練習した後の練習}回`],
        ['「↩ 練習を1回減らす」で戻せる', r.減らしたあとの練習 === 0, `練習 ${r.減らしたあとの練習}回`],
        ['「↩ 正解を取り消す」で正解だけ外せる', r.正解を外したあとの正解 === false, r.正解を外したあとの正解 ? 'あり（✖）' : 'なし'],
        ['★★⭕ を外せるのは「↩ 正解を取り消す」だけ（練習は残る）', r.取り消したあとの正解 === null && r.取り消したあとの練習 === 1, `正解 ${r.取り消したあとの正解 || 'なし'} / 練習 ${r.取り消したあとの練習}回`],
        ['0回になったら「減らす」ボタンが消える（負にならない）', r['ゼロ回で減らすボタンが消える'] === true, r['ゼロ回で減らすボタンが消える'] ? '消えた' : '残っている'],
        ['★押すはずのボタンが全部あった（黙って飛ばしていない）', (r.押せなかった || []).length === 0, (r.押せなかった || []).length === 0 ? '0件' : `押せなかった: ${r.押せなかった.join('・')}`]
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

    /* 6. 消した文言が残っていないか */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_消した文言が残っていないか(page, 消した文言);
      console.log('【6】★消したボタンの名前が、画面の案内文に残っていないか（失敗条件9・09-25b 追加）');
      console.log(`     見た場所: ① 印刷 ／ ② 採点 ／ ③ 一覧 の3タブぜんぶ（画面に出ている文字だけ。ソースの grep ではない）`);
      消した文言.forEach(x => console.log(`     消したもの: 「${x.語}」（${x.いつ}・${x.なぜ}）`));
      console.log(`     残っていた件数: ${r.length}`);
      if (r.length > 0) { 終了コード = 1; r.forEach(x => console.log(`     ✖ ${x.タブ} タブに「${x.語}」が残っています`)); console.log(''); }
      else console.log('     → OK\n');
      await ctx.close();
    }

    /* 7. ★②の保存は、押した語しか動かさない（2026-09-26b・失敗条件1〜5・7） */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_採点して保存(page, null);
      const 練 = r.練習だけ押した語 || {}, 出 = r.できただけ押した語 || {}, 両 = r.両方押した語 || {};
      console.log('【7】★②「今日の採点」の2つのボタンと保存（2026-09-26b・失敗条件1〜5・7）');
      console.log(`     紙に出した語: ${r.紙の語数}語 ／ 1語め=✏️練習しただけ ／ 2語め=⭕できただけ ／ 3語め=両方 ／ 4語め=★どちらも押さない`);
      console.log(`     仕込み: 1語めに練習2回 ／ 4語めに ⭕ 2026-01-05 ／ 紙に無い語に練習5回と ⭕ 2026-01-05`);
      const 判定 = [
        ['★押すはずのボタンが全部あった', (r.押せなかった || []).length === 0, (r.押せなかった || []).length === 0 ? '0件' : r.押せなかった.join('・')],
        ['★保存を押すまでは、どこにも入らない', r.保存前に正解が入った === false, r.保存前に正解が入った ? '入っている（✖）' : '入っていない'],
        ['開いた時点で押された行が無い（今日の採点は白紙から）', r.最初から押されている行 === 0, `${r.最初から押されている行}行`],
        ['★先に ⭕ が付いていた語は「前に ⭕」として見えている（黙って消さない）', r.前の記録が見えている === true, r.前の記録が見えている ? '見えている' : '見えない'],
        ['★[✏️ 練習した]だけ → 練習が1ふえる', 練.練習 === 3, `先に2回 → ${練.練習}回`],
        ['★[✏️ 練習した]だけ → 正解は入らない', 練.正解 === null, 練.正解 || 'なし'],
        ['★[⭕ できた]だけ → 今日の正解が入る', 出.正解 === r.今日, `${出.正解}（今日=${r.今日}）`],
        ['★★[⭕ できた]だけ → 練習は動かない（確認の紙と練習の紙は別物）', 出.練習 === 0, `練習 ${出.練習}回（0 であるべき）`],
        ['★両方押した語 → 練習も正解も入る', 両.練習 === 1 && 両.正解 === r.今日, `練習 ${両.練習}回 / 正解 ${両.正解}`],
        ['★★どちらも押していない語の ⭕ が外れない（失敗条件2＝記録の消失）', r.触らない語の正解 === '2026-01-05', `2026-01-05 → ${r.触らない語の正解}`],
        ['★★どちらも押していない語の練習が増えない（失敗条件1）', r.触らない語の練習 === 0 && r.紙の練習合計 === 4, `その語 ${r.触らない語の練習}回 / 紙ぜんぶ ${r.紙の練習合計}（2+1+1=4 であるべき）`],
        ['★★その紙に無い語の練習は動かない（失敗条件7）', r.紙に無い語の練習 === 5, `入れておいた5回 → ${r.紙に無い語の練習}回`],
        ['★★その紙に無い語の正解も動かない（失敗条件7）', r.紙に無い語の正解 === '2026-01-05', `入れておいた 2026-01-05 → ${r.紙に無い語の正解}`],
        ['★保存を2回押しても、何も増えない・消えない（失敗条件6）', r.二回目の紙の練習合計 === 4 && r.二回目の触らない語の正解 === '2026-01-05', `練習 ${r.二回目の紙の練習合計} / 4語めの ⭕ ${r.二回目の触らない語の正解}`]
      ];
      判定.forEach(([名, ok, 詳]) => { if (!ok) 終了コード = 1; console.log(`     ${ok ? 'OK ' : '✖ '} ${名}　（${詳}）`); });
      console.log('');
      await ctx.close();
    }

    /* 8. ★「✨ すべてできた」→ 保存（全語に今日の正解。★練習は動かない） */
    {
      const { ctx, page } = await open(browser, 8201);
      const r = await 測定_すべてできた(page);
      console.log('【8】「✨ すべてできた」→ 保存 で、全語に今日の正解が入り、★練習は動かないか');
      const 正解OK = r.正解.every(d => d === r.今日), 練習OK = r.練習.every(n => n === 0);
      if (!正解OK || !練習OK) 終了コード = 1;
      console.log(`     ${正解OK ? 'OK ' : '✖ '} 全${r.語数}語に今日の正解　（今日=${r.今日} / ちがう語 ${r.正解.filter(d => d !== r.今日).length}件）`);
      console.log(`     ${練習OK ? 'OK ' : '✖ '} ★練習回数は1つも増えていない　（${r.練習.join(',')}）`);
      console.log('');
      await ctx.close();
    }

    console.log(終了コード === 0 ? '★すべて通りました。' : '★落ちた項目があります（上の ✖）。');
  } finally {
    await browser.close();
    s今.close(); s前.close(); s前26.close();
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(tmp26, { recursive: true, force: true });
  }
  process.exitCode = 終了コード;
})();
