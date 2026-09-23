/* ⚠️ 2026-09-23 以降、テストプリントは「意味」を出しません（ヒントごと廃止）。
      したがってこの道具の数字は【元データに残っている露出の候補】であって、
      【紙に出ている露出】ではありません。紙を測るのは `紙に答えが出ていないか.js` です。
      この道具は、将来ヒントを復活させたくなったときの判断材料として残してあります。

   （以下、作られた当時の説明）
   テストプリントは「かな ＋ 意味」だけを出す。
   その意味（mean）に、同じ紙に載る別の語の答え（word）がそのまま書いてあると、
   その問題は考えずに書けてしまう（確認ポイント 1-2 の経路1）。

   ここでは同じ単元の中の全組み合わせを見る。
   ★この道具が見ていないもの:
     - 実際に同じ紙に載るかどうか（出題の10語に両方入ったときだけ害になる）
     - 言いかえ（「清少納言が書いた随筆」→ 清少納言 が別問題にあるか等は拾うが、
       「天皇の位をゆずった人」のような言いかえは拾えない）
*/
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = KANJI_DATA; g.KANJI_UNITS = KANJI_UNITS;')(g);
const D = g.KANJI_DATA;

// --- 自己テスト：鳴るべきものを1つ仕込み、鳴らないものを1つ入れる（確認ポイント 4-1） ---
(function selftest() {
  const fake = [
    { id: 'x1', unitKey: 'U', word: '太政大臣', kana: 'だいじょうだいじん', mean: 'ある役職' },
    { id: 'x2', unitKey: 'U', word: '平清盛', kana: 'たいらのきよもり', mean: '武士として初めて太政大臣になった人物' }, // ← 鳴るべき
    { id: 'x3', unitKey: 'U', word: '院政', kana: 'いんせい', mean: '上皇が行った政治' },                            // ← 鳴ってはいけない
    { id: 'x4', unitKey: 'V', word: '太政大臣', kana: 'だ', mean: '別単元なので関係なし' }
  ];
  const hits = scan(fake);
  const ok = hits.length === 1 && hits[0].見える語 === '太政大臣' && hits[0].露出した問題 === 'x2';
  if (!ok) { console.error('自己テスト失敗。結果を出しません: ' + JSON.stringify(hits)); process.exit(3); }
  console.log('自己テスト: OK（仕込んだ1件だけを拾い、関係ない2件は拾わなかった）\n');
})();

function scan(list) {
  const byUnit = {};
  list.forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
  const hits = [];
  Object.keys(byUnit).forEach(u => {
    const items = byUnit[u];
    items.forEach(a => items.forEach(b => {
      if (a.id === b.id || a.word === b.word) return;
      if (String(b.mean || '').includes(a.word)) {
        hits.push({ 単元: u, 見える語: a.word, 答えが見える問題: a.id, 露出した問題: b.id, 露出した文: b.mean });
      }
    }));
  });
  return hits;
}

/* ★実際に害が出るのは「同じ紙に両方が載ったとき」だけ。
   そこで、アプリが実際に作る紙（高だけ・正解ずみを除く・10語）を
   1回ぶんずつ最後まで再現して、何枚に何語の答えが印刷されるかを数える。
   未正解の語は lastCorrectAt=0 で並びがデータ順なので、先頭から10語ずつが実際の紙になる。 */
function 紙ごとの露出(list) {
  const byUnit = {};
  list.filter(d => d.priority === '高').forEach(d => (byUnit[d.unitKey] = byUnit[d.unitKey] || []).push(d));
  let 枚数 = 0, 露出した枚数 = 0, 露出した語数 = 0;
  const 例 = [];
  Object.keys(byUnit).forEach(u => {
    const items = byUnit[u];
    for (let i = 0; i < items.length; i += 10) {
      const sheet = items.slice(i, i + 10);
      枚数++;
      const 出た = new Set();
      sheet.forEach(a => sheet.forEach(b => {
        if (a.id === b.id || a.word === b.word) return;
        if (String(b.mean || '').includes(a.word)) 出た.add(a.word);
      }));
      if (出た.size) {
        露出した枚数++; 露出した語数 += 出た.size;
        if (例.length < 12) 例.push(`${u} の ${Math.floor(i / 10) + 1}枚目: ${[...出た].join('・')}`);
      }
    }
  });
  return { 枚数, 露出した枚数, 露出した語数, 例 };
}
const 紙 = 紙ごとの露出(D);
console.log('★実際に出る紙で数える（高だけ・10語ずつ・回ごと）');
console.log(`   紙 ${紙.枚数}枚のうち、答えが印刷されている紙は ${紙.露出した枚数}枚（${Math.round(紙.露出した枚数 / 紙.枚数 * 100)}%）／のべ ${紙.露出した語数}語`);
紙.例.forEach(e => console.log('   ・' + e));
console.log('');

const hits = scan(D);
console.log('（参考）同じ単元の中で、別の語の答えが「意味」に書かれている組: ' + hits.length + '組');
const byU = {};
hits.forEach(h => byU[h.単元] = (byU[h.単元] || 0) + 1);
console.log(JSON.stringify(byU, null, 1));
console.log('');
hits.forEach(h => console.log(`  [${h.単元}] ${h.答えが見える問題}「${h.見える語}」← ${h.露出した問題} の意味「${h.露出した文}」`));
