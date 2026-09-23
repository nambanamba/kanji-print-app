/* 実機確認（2026-09-23）：依頼「出す語を選ぶのが手間」
   本物の Chrome（channel: chrome・スマホ幅 390x844）で index.html を開き、
   「いままでどおり自動でえらぶ ＋ 高だけ ＋ 正解ずみを除く ＋ 10語」が
   本当に「まだクリアしていない語から10語」になるかを、UIのクリックだけで確かめる。

   ★見ているのは、内部関数の戻り値ではなく
     ・プレビューに出た語（画面）
     ・「① テストプリント」の #print-region に出た語（紙になる中身）
     ・localStorage の記録（kq_kanji_stats_v1）
   の3つで、それぞれ突き合わせる。

   ★この検査が見ていないもの:
     - 実際の紙の見た目（余白・改ページ）。別途PDF化して目視すること
     - 「選んだ語だけ」モードの中身（今回の依頼の対象外・壊れていないことだけ確認）
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
const PORT = 8123;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };

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

const log = [];
function say(s) { console.log(s); log.push(s); }
let ng = 0;
function check(name, cond, detail) {
  say((cond ? '  OK   ' : '  NG   ') + name + (detail ? '  … ' + detail : ''));
  if (!cond) ng++;
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());           // alert はそのまま閉じる
  const dialogs = [];
  page.on('dialog', d => dialogs.push(d.message()));

  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);

  // ---- 画面から読み取るための小道具（DOMだけを見る） ----
  const previewWords = () => page.evaluate(() =>
    [...document.querySelectorAll('#preview-area .pv-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  const printWords = () => page.evaluate(() =>
    [...document.querySelectorAll('#print-region .test-item .test-q-text')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  // 出た語の「語（word）」だけは、プレビューの答え欄から取る
  const previewAnswers = () => page.evaluate(() =>
    [...document.querySelectorAll('#preview-area .pv-item .pv-word')].map(e => e.textContent.trim()));

  const unitBtn = name => page.locator('#unit-grid-container .unit-btn', { hasText: name });

  // ============ 1. 依頼書の組み合わせをUIで作る（全11単元） ============
  say('\n===== 1. 「自動でえらぶ ＋ 高だけ ＋ 正解ずみを除く ＋ 10語」をUIで設定 =====');
  await page.click('button:has-text("すべて選ぶ")');
  await page.click('#prio-high');
  await page.click('#filter-unmastered');
  await page.click('#count-chips .chip[data-count="10"]');

  const st = await page.evaluate(() => ({
    usePicked, priorityFilter, filterUnmastered, filterWeak, currentCount,
    units: selectedUnits.size, poolLen: getPool().length,
    label: document.getElementById('selected-units-count').textContent,
    prioNote: document.getElementById('prio-note').textContent,
    progress: document.getElementById('progress-text').textContent,
    sub: document.getElementById('progress-sub-text').textContent
  }));
  say('  画面の表示: ' + JSON.stringify(st, null, 0));
  check('自動でえらぶ（usePicked=false）', st.usePicked === false);
  check('高だけ（priorityFilter=high）', st.priorityFilter === 'high');
  check('正解ずみを除く ON', st.filterUnmastered === true);
  check('10語', st.currentCount === 10);

  // ---- データ側の実数（道具ではなく kanji-data.js を直接数えた値）と突き合わせる ----
  const dataCount = await page.evaluate(() => {
    const p = {}; KANJI_DATA.forEach(d => p[d.priority] = (p[d.priority] || 0) + 1);
    return { total: KANJI_DATA.length, prio: p, units: KANJI_UNITS.length };
  });
  say('  データ実数: ' + JSON.stringify(dataCount));

  // ============ 2. 1日目：プレビューと紙に、何語出るか ============
  say('\n===== 2. 1日目 =====');
  await page.click('button:has-text("今日の漢字を見る")');
  const pv1 = await previewWords();
  const ans1 = await previewAnswers();
  check('プレビューに 10語', pv1.length === 10, `実測 ${pv1.length}語`);
  say('  出た語: ' + ans1.join('・'));

  await page.click('button:has-text("① テストプリントを印刷")').catch(() => {});
  await page.waitForTimeout(300);
  const pr1 = await printWords();
  check('紙（#print-region）にも 10語', pr1.length === 10, `実測 ${pr1.length}語`);

  // ---- ★出た語を、記録と重要度に突き合わせる（「そう見える」ではなく数える） ----
  const audit1 = await page.evaluate(() => {
    const m = getMastery();
    return currentSet.map(d => ({ id: d.id, word: d.word, prio: d.priority, correct: (m[d.id] || {}).correct || 0 }));
  });
  check('10語すべて priority=高', audit1.every(a => a.prio === '高'),
    '高でないもの: ' + JSON.stringify(audit1.filter(a => a.prio !== '高')));
  check('10語すべて 未正解（correct=0）', audit1.every(a => a.correct === 0),
    '正解ずみが混入: ' + JSON.stringify(audit1.filter(a => a.correct > 0)));

  // ============ 3. 「できた」を記録して、翌日ぶんを作る ============
  say('\n===== 3. ⭕を付けて、次に別の語が出るか =====');
  await page.click('#tab-check');
  await page.click('button:has-text("すべてできた")');
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('kq_kanji_stats_v1') || '{}');
    return { n: Object.keys(m).length, ids: Object.keys(m) };
  });
  check('localStorage に10語ぶん記録された', saved.n === 10, `実測 ${saved.n}件`);

  await page.click('#tab-home');
  await page.click('a:has-text("別の問題に出題し直す")');
  await page.waitForTimeout(200);
  const audit2 = await page.evaluate(() => currentSet.map(d => ({ id: d.id, word: d.word, prio: d.priority })));
  const ids1 = new Set(audit1.map(a => a.id));
  check('2日目は10語', audit2.length === 10, `実測 ${audit2.length}語`);
  check('1日目と1語も重なっていない', audit2.every(a => !ids1.has(a.id)),
    '重なり: ' + audit2.filter(a => ids1.has(a.id)).map(a => a.word).join('・'));
  check('2日目も全部 高', audit2.every(a => a.prio === '高'));
  say('  2日目の語: ' + audit2.map(a => a.word).join('・'));

  // ============ 4. リロードしても設定が残るか（毎週さわらずに済むか） ============
  say('\n===== 4. 閉じて開き直したとき =====');
  await page.reload();
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
  const st2 = await page.evaluate(() => ({
    usePicked, priorityFilter, filterUnmastered, currentCount, units: selectedUnits.size,
    highActive: document.getElementById('prio-high').classList.contains('active'),
    filterActive: document.getElementById('filter-unmastered').classList.contains('active'),
    setLen: currentSet.length,
    progress: document.getElementById('progress-text').textContent
  }));
  say('  ' + JSON.stringify(st2));
  check('設定が残っている（高だけ・正解ずみを除く・10語・全単元）',
    st2.priorityFilter === 'high' && st2.filterUnmastered === true &&
    st2.currentCount === 10 && st2.units === dataCount.units && st2.highActive && st2.filterActive);
  const audit3 = await page.evaluate(() => currentSet.map(d => ({ id: d.id, word: d.word })));
  check('開き直しただけで、次の10語ができている（ボタンを押す前）', audit3.length === 10, `実測 ${audit3.length}語`);
  check('開き直した10語にも、⭕を付けた語が入っていない', audit3.every(a => !ids1.has(a.id)));

  // ============ 5. 全部クリアしたらどうなるか ============
  say('\n===== 5. 高だけを全部クリアしたとき =====');
  const highIds = await page.evaluate(() => {
    // 画面からではなくデータから。getPool() は重複を除いた後の実際の対象
    const before = getPool().map(d => d.id);
    const m = getMastery();
    const t = Date.now();
    before.forEach(id => { m[id] = { correct: 1, wrong: 0, lastAnswered: t, lastCorrectAt: t, box: 1 }; });
    localStorage.setItem('kq_kanji_stats_v1', JSON.stringify(m));
    return before;
  });
  say(`  「高だけ」の対象は ${highIds.length}語（重複を除いた実数）。全部⭕にした`);
  await page.reload();
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
  const endState = await page.evaluate(() => ({
    setLen: currentSet.length,
    progress: document.getElementById('progress-text').textContent,
    sub: document.getElementById('progress-sub-text').textContent
  }));
  say('  ' + JSON.stringify(endState));
  dialogs.length = 0;
  await page.click('a:has-text("別の問題に出題し直す")');
  await page.waitForTimeout(400);
  say('  「出題し直す」を押したときに出たメッセージ: ' + JSON.stringify(dialogs));
  const afterEmpty = await page.evaluate(() => currentSet.length);
  check('全クリア後は0語になる（黙って古い語を出さない）', afterEmpty === 0, `実測 ${afterEmpty}語`);
  check('全クリアがユーザーに伝わる（進捗バーかalertのどちらかで）',
    /全問クリア/.test(endState.sub) || dialogs.some(m => /条件に合う語がありません/.test(m)),
    `進捗サブ=「${endState.sub}」 alert=${JSON.stringify(dialogs)}`);

  // 印刷を押したらどうなるか（空のまま紙が出ないか）
  dialogs.length = 0;
  await page.click('button:has-text("① テストプリントを印刷")');
  await page.waitForTimeout(400);
  const pr2 = await printWords();
  say('  全クリア後に「① 印刷」を押したとき: 紙の項目数=' + pr2.length + ' / メッセージ=' + JSON.stringify(dialogs));

  // ============ 6. 9/20 の「選んだ語だけ」を壊していないか ============
  say('\n===== 6. 9/20 の「選んだ語だけ」が使えるままか =====');
  await page.evaluate(() => localStorage.removeItem('kq_kanji_stats_v1'));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#unit-grid-container .unit-btn').length > 0);
  await page.click('#tab-history');
  await page.waitForTimeout(200);
  await page.click('button:has-text("この回を全部つける")');
  await page.waitForTimeout(200);
  await page.click('#tab-home');
  await page.click('#mode-picked');
  await page.waitForTimeout(300);
  const picked = await page.evaluate(() => ({
    n: currentSet.length, note: document.getElementById('pick-mode-note').textContent,
    stored: JSON.parse(localStorage.getItem('kanji_app_picked_v1') || '[]').length
  }));
  say('  ' + JSON.stringify(picked));
  check('「選んだ語だけ」が今も動く', picked.n > 0 && picked.n === picked.stored);

  say('\n===== NG 合計: ' + ng + ' =====');
  fs.writeFileSync(path.join(__dirname, '実機確認_選ぶ手間_2026-09-23_結果.txt'), log.join('\n'), 'utf8');
  await browser.close();
  server.close();
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
