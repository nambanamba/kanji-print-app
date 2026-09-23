/* 公開ずみの GitHub Pages を、受け取る人が開く形で確かめる（確認ポイント 0-4／3-4）。
   ★ローカルのファイルではなく https://nambanamba.github.io/kanji-print-app/ を開く。
   ★文字列一致では判定しない（"test-hint" は廃止コメントにも出るため誤検出する）。
     実際に紙を描かせて、その中身を見る。 */
const path = require('path');
// ⚠️ playwright はこのフォルダではなく**グローバル**に入っています。そのまま走らせると
//    「Cannot find module 'playwright'」で落ちます。NODE_PATH を付けてください（2026-09-24）:
//      PowerShell : $env:NODE_PATH="$env:APPDATA/npm/node_modules"; node <このファイル>
//      Bash       : NODE_PATH=$(npm root -g) node <このファイル>
const { chromium } = require('playwright');
const URL = 'https://nambanamba.github.io/kanji-print-app/index.html?cb=' + Date.now();

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof KANJI_DATA !== 'undefined' && typeof renderTestPrint === 'function');

  const r = await page.evaluate(() => {
    const realPrint = window.print; window.print = () => {};
    const out = {};
    try {
      // --- 全41枚（高だけ・10語ずつ）で、紙に答えが印刷されていないか ---
      const byUnit = {};
      KANJI_DATA.filter(d => d.priority === '高').forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
      let 枚数 = 0, 露出枚数 = 0, 露出語数 = 0;
      Object.keys(byUnit).forEach(u => {
        const items = byUnit[u];
        for (let i = 0; i < items.length; i += 10) {
          const sheet = items.slice(i, i + 10);
          currentSet = sheet; selectedUnits = new Set([u]);
          renderTestPrint();
          const txt = [...document.querySelectorAll('#print-region .test-item')].map(e => e.textContent).join('\n');
          const 出た = new Set(sheet.map(d => d.word).filter(w => txt.includes(w)));
          枚数++;
          if (出た.size) { 露出枚数++; 露出語数 += 出た.size; }
        }
      });
      out.テスト = { 枚数, 露出枚数, 露出語数 };

      // --- テストの1枚を、中身ごと取り出す ---
      /* ★第3回を見ます。先頭10語に 租・庸・調（添え書きあり）と、添え書きの無い語が
         両方入るので、「添え書きが出る枝」と「出ない枝」を1枚で両方とおせます。
         添え書きの無い回だけを見ると、出る枝を一度も試さずに OK と出てしまいます。 */
      const u0 = '第3回';
      const sheet = KANJI_DATA.filter(d => d.unitKey === u0 && d.priority === '高').slice(0, 10);
      currentSet = sheet; selectedUnits = new Set([u0]);
      renderTestPrint();
      out.テスト1枚 = [...document.querySelectorAll('#print-region .test-item .test-q-text')]
        .map(e => e.textContent.replace(/\s+/g, ' ').trim());
      /* 項目の文字が「番号＋読み」、または「番号＋読み＋（添え書き）」だけになっているか。
         ⚠️ 「番号＋読みだけ」で判定してはいけません。添え書きのある語が紙に載った瞬間に、
            正しいのに NG になります（確認ポイント 4-3。2026-09-23 に作りかけて気づきました）。
         ★意味（mean）が戻ってきたら、ここで必ず落ちます。 */
      out.かなだけ = out.テスト1枚.every((t, i) => {
        const w = sheet[i], note = TEST_NOTES[w.word];
        const 素 = t.replace(/\s/g, '');
        return 素 === `${i + 1}.${w.kana}` || (note && 素 === `${i + 1}.${w.kana}（${note}）`);
      });
      out.この紙の添え書き数 = sheet.filter(d => TEST_NOTES[d.word]).length;

      // --- 添え書きが .test-item の中に出ているか（11語ぶん） ---
      out.添え書き = { 表の語数: Object.keys(TEST_NOTES).length, 出た: 0, 外に出た: 0, 余計: [] };
      Object.keys(TEST_NOTES).forEach(word => {
        const d0 = KANJI_DATA.find(x => x.word === word);
        if (!d0) return;
        const unit = KANJI_DATA.filter(x => x.unitKey === d0.unitKey);
        const s = [d0, ...unit.filter(x => x.word !== word).slice(0, 9)];
        currentSet = s; selectedUnits = new Set([d0.unitKey]);
        renderTestPrint();
        const inItem = [...document.querySelectorAll('#print-region .test-item .test-note')];
        const all = [...document.querySelectorAll('#print-region .test-note')];
        out.添え書き.外に出た += all.length - inItem.length;
        if (inItem.map(e => e.textContent).join('').includes(TEST_NOTES[word])) out.添え書き.出た++;
        [...document.querySelectorAll('#print-region .test-item')].forEach((el, i) => {
          const n = el.querySelector('.test-note');
          if (n && !TEST_NOTES[s[i].word]) out.添え書き.余計.push(s[i].word);
        });
      });

      // --- 練習プリントに意味が出ているか ---
      // ⚠️ 直前の添え書き走査で currentSet を何度も入れかえているので、必ず組み直すこと。
      //    組み直さないと、別の紙を描いたまま sheet と比べて「一致 false」になります（2026-09-23 に踏みました）
      currentSet = sheet; selectedUnits = new Set([u0]);
      renderPracticePrint();
      const means = [...document.querySelectorAll('#print-region .p-mean-sub')].map(e => e.textContent.trim());
      const words = [...document.querySelectorAll('#print-region .p-sample-word')].map(e => e.textContent.trim());
      out.練習 = { お手本: words.length, 意味: means.length, データと一致: sheet.every((d, i) => means[i] === d.mean) };
    } finally { window.print = realPrint; }
    return out;
  });

  console.log('公開URL: ' + URL.split('?')[0]);
  console.log(`\n【① テスト】 紙 ${r.テスト.枚数}枚 / 答えが印刷されている紙 ${r.テスト.露出枚数}枚 / のべ ${r.テスト.露出語数}語`);
  console.log('  1枚目の中身（第3回・添え書きのある語と無い語が混ざる紙）:');
  r.テスト1枚.forEach(t => console.log('    ' + t));
  console.log(`  この紙の添え書き数: ${r.この紙の添え書き数}（0 だと「添え書きが出る枝」を試せていません）`);
  console.log('  読み＋（添え書き）だけになっている: ' + r.かなだけ);
  console.log(`\n【② 練習】 お手本 ${r.練習.お手本}語 / 意味 ${r.練習.意味}件 / データと一致 ${r.練習.データと一致}`);

  // 紙の画像（公開版）
  await page.evaluate(() => {
    const u0 = '第4回';
    const sheet = KANJI_DATA.filter(d => d.unitKey === u0 && d.priority === '高').slice(0, 10);
    currentSet = sheet; selectedUnits = new Set([u0]);
    const rp = window.print; window.print = () => {};
    try { renderTestPrint(); } finally { window.print = rp; }
  });
  await page.emulateMedia({ media: 'print' });
  const img = path.join(__dirname, '公開版_紙_テスト_2026-09-23.png');
  await page.screenshot({ path: img, fullPage: true });
  console.log('\n公開版の紙: ' + img);

  let ng = 0;
  const check = (n, c) => { console.log((c ? '  OK   ' : '  NG   ') + n); if (!c) ng++; };
  console.log('\n=== 判定 ===');
  check('公開版のテストに答えが1語も印刷されていない（41枚中0枚）', r.テスト.露出枚数 === 0);
  check('公開版のテストは「読み」または「読み＋添え書き」だけ（意味は出ていない）', r.かなだけ === true);
  check('★その紙で、添え書きが出る枝を実際に通した', r.この紙の添え書き数 > 0);
  check('公開版の練習には10語ぶんの意味が出ている', r.練習.意味 === 10 && r.練習.データと一致);
  console.log(`  （添え書き: 表 ${r.添え書き.表の語数}語 / 紙に出た ${r.添え書き.出た}語 / .test-item の外 ${r.添え書き.外に出た}件 / 表に無い語に付いた ${r.添え書き.余計.length}件）`);
  check('公開版の添え書きが、表の語すべてに出ている',
    r.添え書き.出た === r.添え書き.表の語数 && r.添え書き.表の語数 > 0);
  check('公開版の添え書きが、すべて .test-item の中にある', r.添え書き.外に出た === 0);
  check('公開版の添え書きが、表に無い語に付いていない', r.添え書き.余計.length === 0);
  console.log('\nNG 合計: ' + ng);

  await browser.close();
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
