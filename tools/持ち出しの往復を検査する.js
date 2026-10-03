/* 「記録の持ち出し」が、もれなく移るかを実機（Chrome）で確かめる（2026-10-03・引越し依頼）。

   やること（本物のボタン・本物のファイルで往復する）
     A: 全部の箱（〇✕・出さない・★・チェック・練習回数・①の設定・選んだ語で出す）に値を入れる
        → 「📤 記録を書き出す」を押してファイルを受け取る
     B: 空のプロファイル（別のブラウザ文脈）で「📥 ファイルから読みこむ」
        → localStorage を A と全部比べる（移さないと決めたキー・欄を除く）
     そのほか: 古い形式(v1)のファイル／上書きしない・足すだけ・大きいほう／書き出せない条件

   ★入口の自己テスト（4-6）: 先に「直す前の版」で走らせ、★鳴らなければ止めて数字を出さない。
     直す前の版 = コミット 9cf5e11 に固定する（4-6c: HEAD で表さない）。
     直す前の版は tools/_old_9cf5e11/ に一時的に取り出し、終わったら消す。

   移さないと決めたもの（比べない）
     ・kq_kanji_stats_migrated_v1 … 旧キー引き継ぎ済みの印（端末ごとの内部の印）
     ・練習回数の saved … 「その日に数えた紙の指紋」。日が変わると捨てる作業用で、持ち出す意味が無い

   使い方: NODE_PATH=$(npm root -g) node tools/持ち出しの往復を検査する.js
   ⚠️ playwright はグローバルです（NODE_PATH が要ります）。
   ⚠️ このファイルにはバックスラッシュを書かない（確認ポイント 0-3）。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OLD_COMMIT = '9cf5e11';
const OLD_DIR = path.join(__dirname, '_old_' + OLD_COMMIT);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const IGNORE_KEYS = new Set(['kq_kanji_stats_migrated_v1']);

const serve = (root, port) => new Promise(r => {
  const s = http.createServer((q, p) => {
    const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { p.writeHead(404); return p.end('nf'); }
    p.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    p.end(fs.readFileSync(f));
  });
  s.listen(port, '127.0.0.1', () => r(s));
});

// 実行したあとの localStorage を、比べやすい形（キー→パースした値）にして返す
const SNAP = () => {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    let v = localStorage.getItem(k);
    try { v = JSON.parse(v); } catch (e) {}
    o[k] = v;
  }
  return o;
};
const norm = o => {
  const c = JSON.parse(JSON.stringify(o));
  for (const k of IGNORE_KEYS) delete c[k];
  if (c.kanji_app_practice_count_v1 && typeof c.kanji_app_practice_count_v1 === 'object') delete c.kanji_app_practice_count_v1.saved;
  return c;
};
// 集合として入っている配列は並びを無視して比べる
const canon = v => {
  if (Array.isArray(v)) return JSON.stringify([...v].map(x => JSON.stringify(x)).sort());
  if (v && typeof v === 'object') return JSON.stringify(Object.keys(v).sort().map(k => [k, canon(v[k])]));
  return JSON.stringify(v);
};

async function suite(root, port, label, 言う) {
  let NG = 0;
  const 見る = (t, ok, 詳) => { if (!ok) NG++; 言う(`     ${ok ? 'OK ' : '✖ '} ${t}　（${詳}）`); };
  const server = await serve(root, port);
  const url = `http://127.0.0.1:${port}/index.html`;
  const b = await chromium.launch({ channel: 'chrome' });
  const fresh = async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await c.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(url);
    await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
    await page.evaluate(() => { switchTab('history'); });
    return { c, page };
  };
  const exportFile = async page => {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 4000 }).catch(() => null),
      page.click('text=📤 記録を書き出す（ファイル）')
    ]);
    if (!dl) return null;
    return fs.readFileSync(await dl.path(), 'utf8');
  };
  const importText = async (page, text) => {
    await page.setInputFiles('input[type=file]', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') });
    await page.waitForTimeout(400);
    return page.evaluate(() => { const e = document.getElementById('io-result'); return { cls: e.className, txt: e.textContent }; });
  };
  // 全部の箱に値を入れる（本物のアプリの関数を呼ぶ）
  const fillAll = page => page.evaluate(() => {
    const ds = KANJI_DATA;
    const pick = n => ds.slice(n * 7, n * 7 + 3);
    pick(0).forEach(d => setCorrectOn(d.id, '2026-09-1' + (1 + (d.id.length % 5))));
    setKanjiStatus(ds[30].id, 'wrong');
    toggleExcluded(ds[40].id); toggleExcluded(ds[41].id);
    toggleStarred(ds[50].id); toggleStarred(ds[51].id);
    togglePicked(ds[60].id); togglePicked(ds[61].id); togglePicked(ds[62].id);
    addPractice(ds[70], 1); addPractice(ds[70], 1); addPractice(ds[71], 1); addPractice(ds[72], 3);
    setCount(15); setPriorityFilter('high'); toggleFilter('unmastered'); setPickMode(true);
    return { w: [ds[50], ds[70]].map(d => d.word) };
  });

  // ---------- A → ファイル → B ----------
  const A = await fresh();
  await fillAll(A.page);
  const snapA = norm(await A.page.evaluate(SNAP));
  const 箱 = ['kq_kanji_stats_v1', 'kq_kanji_stats_words_v1', 'kanji_app_excluded_v1', 'kanji_app_star_v1',
    'kanji_app_picked_v1', 'kanji_app_practice_count_v1', 'kanji_app_settings_v2'];
  言う(`【${label}】【1】全部の箱に値を入れた`);
  見る('7つの箱が全部入っている', 箱.every(k => snapA[k] !== undefined && canon(snapA[k]) !== canon({}) && canon(snapA[k]) !== canon([])),
    箱.map(k => k.replace('kanji_app_', '').replace('kq_kanji_', '') + '=' + (snapA[k] === undefined ? '無' : '有')).join(' '));
  const file = await exportFile(A.page);
  見る('書き出せた（ファイルが受け取れた）', !!file, file ? file.length + '文字' : '受け取れず');
  let ver = null;
  try { ver = JSON.parse(file).version; } catch (e) {}
  言う(`        ファイルの version = ${ver}`);
  await A.c.close();

  const B = await fresh();
  const rB = await importText(B.page, file || '{}');
  const snapB = norm(await B.page.evaluate(SNAP));
  言う(`【${label}】【2】空のプロファイルで読みこんだ（${rB.txt.slice(0, 120)}）`);
  const 差 = [];
  const keys = new Set([...Object.keys(snapA), ...Object.keys(snapB)]);
  keys.forEach(k => { if (canon(snapA[k]) !== canon(snapB[k])) 差.push(k.replace('kanji_app_', '').replace('kq_kanji_', '') + (snapB[k] === undefined ? '(移らず)' : '(ちがう)')); });
  見る('★localStorage が A と全部一致', 差.length === 0, 差.length === 0 ? keys.size + 'キー一致' : '不一致: ' + 差.join(', '));
  const ui = await B.page.evaluate(() => ({ usePicked, currentCount, priorityFilter, filterUnmastered }));
  見る('画面の状態にも反映された（選んだ語で出す・15語・高・正解ずみを除く）', ui.usePicked === true && ui.currentCount === 15 && ui.priorityFilter === 'high' && ui.filterUnmastered === true, JSON.stringify(ui));
  await B.c.close();

  // ---------- 古い形式 (v1) のファイル ----------
  // 直す前の版で実際に書き出した v1 ファイルを使う（手で作らない）
  const OLDSRV = await serve(OLD_DIR, port + 1);
  const bo = await b.newContext({ acceptDownloads: true });
  const po = await bo.newPage();
  po.on('dialog', d => d.accept());
  await po.goto(`http://127.0.0.1:${port + 1}/index.html`);
  await po.waitForFunction(() => typeof KANJI_DATA !== 'undefined');
  const v1 = await po.evaluate(() => {
    const ds = KANJI_DATA;
    [0, 1, 2].forEach(i => setCorrectOn(ds[i].id, '2026-09-12'));
    toggleExcluded(ds[40].id);
    return { text: JSON.stringify(buildExportData()), snap: (() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = JSON.parse(localStorage.getItem(k)); } return o; })() };
  });
  await bo.close(); OLDSRV.close();
  const v1ver = JSON.parse(v1.text).version;
  const C = await fresh();
  const rC = await importText(C.page, v1.text);
  const snapC = norm(await C.page.evaluate(SNAP));
  言う(`【${label}】【3】古い形式（version ${v1ver}）のファイルを読みこむ（${rC.txt.slice(0, 100)}）`);
  見る('読みこめた（エラーにならない）', rC.cls.includes('ok'), rC.cls);
  見る('〇✕と「出さない」が戻った', canon(snapC.kq_kanji_stats_v1) === canon(v1.snap.kq_kanji_stats_v1) && canon(snapC.kanji_app_excluded_v1) === canon(v1.snap.kanji_app_excluded_v1), Object.keys(snapC.kq_kanji_stats_v1 || {}).length + '語');
  見る('古い形式は★・チェック・練習・設定を作らない（勝手に増やさない）', snapC.kanji_app_star_v1 === undefined && snapC.kanji_app_picked_v1 === undefined && snapC.kanji_app_practice_count_v1 === undefined && snapC.kanji_app_settings_v2 === undefined, '無いまま');
  await C.c.close();

  // ---------- 足すだけ・大きいほう・上書きしない ----------
  const D = await fresh();
  await D.page.evaluate(() => {
    const ds = KANJI_DATA;
    toggleStarred(ds[90].id);               // こちらだけの★
    addPractice(ds[70], 1); addPractice(ds[70], 1); addPractice(ds[70], 1); addPractice(ds[70], 1); addPractice(ds[70], 1); // 5回（ファイルは2回）
    addPractice(ds[72], 1);                 // 1回（ファイルは3回）
    setCount(20);                           // こちらは設定をいじってある
  });
  const before = norm(await D.page.evaluate(SNAP));
  const rD = await importText(D.page, file || '{}');
  const after = norm(await D.page.evaluate(SNAP));
  const wk = await D.page.evaluate(() => [excludeKeyOf(KANJI_DATA[70]), excludeKeyOf(KANJI_DATA[72]), excludeKeyOf(KANJI_DATA[90]), excludeKeyOf(KANJI_DATA[50])]);
  言う(`【${label}】【4】こちらにも記録がある端末へ読みこむ（${rD.txt.slice(0, 160)}）`);
  const pc = (after.kanji_app_practice_count_v1 || {}).counts || {};
  見る('練習回数は語ごとに大きいほう（5と2→5 / 1と3→3）', pc[wk[0]] === 5 && pc[wk[1]] === 3, `${pc[wk[0]]} / ${pc[wk[1]]}`);
  const st = after.kanji_app_star_v1 || [];
  見る('★は足すだけ（こちらの★が残り、ファイルの★も入る）', st.includes(wk[2]) && st.includes(wk[3]), st.length + '語');
  const stg = after.kanji_app_settings_v2 || {};
  見る('★こちらの設定は上書きされない（20語のまま）', stg.count === 20 && (before.kanji_app_settings_v2 || {}).count === 20, 'count=' + stg.count);
  見る('「上書きしませんでした」と画面に出る', rD.txt.includes('上書きしませんでした'), rD.txt.includes('上書きしませんでした') ? 'ある' : '無い');
  見る('★こちらにチェックが無かったので、ファイルの「選んだ語で出す」を引きつぐ', stg.usePicked === true && (after.kanji_app_picked_v1 || []).length === 3, `usePicked=${stg.usePicked}`);
  await D.c.close();

  // ---------- 書き出せない条件 ----------
  const E = await fresh();
  const f0 = await exportFile(E.page);
  const m0 = await E.page.evaluate(() => document.getElementById('io-result').textContent);
  見る('全部の箱が空なら書き出せない', f0 === null && m0.includes('書き出せる記録がまだありません'), f0 === null ? m0 : 'ファイルが出た');
  await E.page.evaluate(() => { toggleStarred(KANJI_DATA[5].id); });
  const f1 = await exportFile(E.page);
  見る('★だけでも書き出せる（〇✕が0件でも）', f1 !== null, f1 === null ? '書き出せず: ' + await E.page.evaluate(() => document.getElementById('io-result').textContent) : 'version ' + JSON.parse(f1).version);
  if (f1) {
    const F = await fresh();
    const rF = await importText(F.page, f1);
    const sF = norm(await F.page.evaluate(SNAP));
    見る('★だけのファイルを空の端末へ読みこめる', rF.cls.includes('ok') && (sF.kanji_app_star_v1 || []).length === 1, rF.txt.slice(0, 80));
    await F.c.close();
  }
  await E.c.close();
  await b.close(); server.close();
  return NG;
}

(async () => {
  const lines = [];
  const 言う = t => { lines.push(t); console.log(t); };
  // 直す前の版を、固定したコミットから取り出す（HEAD ではなく）
  fs.rmSync(OLD_DIR, { recursive: true, force: true });
  fs.mkdirSync(OLD_DIR);
  const gitShow = f => execFileSync('git', ['show', OLD_COMMIT + ':' + f], { cwd: ROOT, maxBuffer: 1 << 28 });
  fs.writeFileSync(path.join(OLD_DIR, 'index.html'), gitShow('index.html'));
  fs.writeFileSync(path.join(OLD_DIR, 'kanji-data.js'), gitShow('kanji-data.js'));
  let ngOld, ngNew;
  try {
    言う('===== 入口の自己テスト: 直す前の版（' + OLD_COMMIT + '）で走らせる。★鳴らなければ止める =====');
    ngOld = await suite(OLD_DIR, 8301, '直す前', 言う);
    if (ngOld === 0) { 言う('✖ 直す前の版で1件も鳴りません。検査が壊れています。ここで止めます。'); process.exitCode = 2; return; }
    言う(`===== 直す前の版で ${ngOld} 件鳴った（期待どおり）。いまの版を検査する =====`);
    ngNew = await suite(ROOT, 8303, 'いまの版', 言う);
  } finally {
    fs.rmSync(OLD_DIR, { recursive: true, force: true });
  }
  言う(`★結果: 直す前の版 ✖${ngOld}件 / いまの版 ✖${ngNew}件`);
  process.exitCode = ngNew === 0 ? 0 : 1;
})();
