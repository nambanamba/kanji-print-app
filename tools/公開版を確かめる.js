/* 公開ずみの GitHub Pages を、受け取る人が開く形で確かめる（確認ポイント 0-4／3-4）。
   ★ローカルのファイルではなく https://nambanamba.github.io/kanji-print-app/ を開く。
   ★文字列一致では判定しない（"test-hint" は廃止コメントにも出るため誤検出する）。
     実際に紙を描かせて、その中身を見る。 */
const path = require('path');
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
      const u0 = '第4回';
      const sheet = KANJI_DATA.filter(d => d.unitKey === u0 && d.priority === '高').slice(0, 10);
      currentSet = sheet; selectedUnits = new Set([u0]);
      renderTestPrint();
      out.テスト1枚 = [...document.querySelectorAll('#print-region .test-item .test-q-text')]
        .map(e => e.textContent.replace(/\s+/g, ' ').trim());
      // 読み（かな）だけになっているか＝項目の文字が「番号＋ひらがな」だけか
      out.かなだけ = out.テスト1枚.every((t, i) => t.replace(/\s/g, '') === `${i + 1}.${sheet[i].kana}`);

      // --- 練習プリントに意味が出ているか ---
      renderPracticePrint();
      const means = [...document.querySelectorAll('#print-region .p-mean-sub')].map(e => e.textContent.trim());
      const words = [...document.querySelectorAll('#print-region .p-sample-word')].map(e => e.textContent.trim());
      out.練習 = { お手本: words.length, 意味: means.length, データと一致: sheet.every((d, i) => means[i] === d.mean) };
    } finally { window.print = realPrint; }
    return out;
  });

  console.log('公開URL: ' + URL.split('?')[0]);
  console.log(`\n【① テスト】 紙 ${r.テスト.枚数}枚 / 答えが印刷されている紙 ${r.テスト.露出枚数}枚 / のべ ${r.テスト.露出語数}語`);
  console.log('  1枚目の中身（第4回）:');
  r.テスト1枚.forEach(t => console.log('    ' + t));
  console.log('  読み（ひらがな）だけになっている: ' + r.かなだけ);
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
  check('公開版のテストは読み（ひらがな）だけ', r.かなだけ === true);
  check('公開版の練習には10語ぶんの意味が出ている', r.練習.意味 === 10 && r.練習.データと一致);
  console.log('\nNG 合計: ' + ng);

  await browser.close();
  process.exit(ng === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
