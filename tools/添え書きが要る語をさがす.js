/* 添え書き（テストの紙に出す短い手がかり）が要る語を、489語ぜんぶから機械で拾う。
   司令塔の指示（2026-09-23）。★人の目で選んだ11語に漏れがないかを確かめるためのもの。

   ================= ★この検査が「見ていないもの」 =================
   ⚠️ ここで拾えるのは【データの中だけで確実に言える分】です。次は拾えません。

   1. ★**同音の別語（データの外）** … 「れいがい」→ 例外／冷害、「かんとう」→ 関東／竿燈、
      「きかい」→ 機会／機械。**相手の語が kanji-data.js に無いので、機械には見えません。**
      → これは人が読んで気づくしかありません（2026-09-23 の11語のうち3語がこれ）
   2. 送りがな・表記ゆれ
   3. 添え書きがあっても子どもに伝わるか（文面の良し悪し）
   → つまり **この検査で0件でも「漏れなし」の証明にはなりません。**
      「機械で確実に言える分は0件」までしか言えません（確認ポイント 4-2）。

   ================= 拾うもの =================
   ① 1文字の語     … 読み1つで字が決まるはずがない。必ず添え書きが要る
   ② 読みの衝突     … kana が完全一致する語が2つ以上（回をまたいでも拾う）
                      2a: 漢字が違う  → 読みだけでは絶対に区別できない（要・添え書き）
                      2b: 漢字も同じ  → 同じ答えなので害なし（別枠に出す）

   使い方: node tools\添え書きが要る語をさがす.js
*/
const fs = require('fs');
const path = require('path');

/* ★突き合わせ相手は index.html の TEST_NOTES（＝いま実際に紙へ出ているもの）。
   道具の中に写しを置くと本体と食い違います。2026-09-23 に実際に踏みました
   （呉 を index.html に足したのに、道具側が11語のままで漏れたように見えた）。 */
const { 添え書き表を読む } = require('./_添え書き表を読む.js');
const 承認ずみ = Object.keys(添え書き表を読む());

function scan(list) {
  const 一文字 = list.filter(d => [...d.word].length === 1);
  const byKana = {};
  list.forEach(d => (byKana[d.kana] = byKana[d.kana] || []).push(d));
  const 衝突 = [], 同語重複 = [];
  Object.keys(byKana).forEach(k => {
    const items = byKana[k];
    if (items.length < 2) return;
    const words = [...new Set(items.map(d => d.word))];
    if (words.length === 1) 同語重複.push({ 読み: k, 語: words[0], 件数: items.length });
    else 衝突.push({ 読み: k, 語: items.map(d => `${d.word}(${d.unitKey}/${d.id})`) });
  });
  return { 一文字, 衝突, 同語重複 };
}

/* ---- 入口の自己テスト（確認ポイント 4-1／4-6）。落ちたら数字を出さずに止まる ---- */
(function selftest() {
  const fake = [
    { id: 'a', unitKey: 'U', word: '租', kana: 'そ' },      // ① 1文字 → 拾うべき
    { id: 'b', unitKey: 'U', word: '倭', kana: 'わ' },      // ① 1文字 → 拾うべき
    { id: 'c', unitKey: 'V', word: '和', kana: 'わ' },      // ①＋② 1文字かつ「わ」で衝突
    { id: 'd', unitKey: 'W', word: '調', kana: 'ちょう' },
    { id: 'e', unitKey: 'X', word: '調', kana: 'ちょう' },  // ②b 同じ語 → 別枠（衝突にしない）
    { id: 'f', unitKey: 'Y', word: '平城京', kana: 'へいじょうきょう' } // 何にも当たらない
  ];
  const r = scan(fake);
  // ★1文字の語は「件数」で数える。同じ語が2つの単元にあれば2件出る（租・倭・和・調・調 の5件）
  const ok =
    r.一文字.length === 5 &&
    [...new Set(r.一文字.map(d => d.word))].sort().join() === ['倭', '和', '租', '調'].sort().join() &&
    r.衝突.length === 1 && r.衝突[0].読み === 'わ' &&
    r.同語重複.length === 1 && r.同語重複[0].語 === '調' &&
    !r.一文字.some(d => d.word === '平城京');
  if (!ok) {
    console.error('自己テスト失敗。結果を出しません:\n' + JSON.stringify(r, null, 1));
    process.exit(3);
  }
  /* ★漏れの判定そのものも試す。
     「表に無い語があれば鳴る／全部あれば鳴らない」を両方とおす。
     ここを試さないと、表を index.html から読むようにした結果、
     何を入れても素通りする形になっていても気づけません。 */
  const 漏れあり = 漏れを出す(r, ['租', '倭']);          // 和・調 が表に無い → 鳴るべき
  const 漏れなし = 漏れを出す(r, ['租', '倭', '和', '調']); // 全部ある → 鳴らぬべき
  if (!([...漏れあり].sort().join() === ['和', '調'].sort().join() && 漏れなし.size === 0)) {
    console.error('自己テスト失敗（漏れの判定）。結果を出しません: ' +
      JSON.stringify({ 漏れあり: [...漏れあり], 漏れなし: [...漏れなし] }));
    process.exit(3);
  }

  console.log('自己テスト: OK');
  console.log('  鳴るべきもの … 1文字の語5件（4種）／読み「わ」の衝突1件 を拾った');
  console.log('  鳴らぬべきもの … 同じ語の重複は別枠へ、3文字の語は拾わなかった（鳴りすぎていない）');
  console.log('  ★漏れの判定 … 表に無い語があれば鳴り、全部あれば鳴らない（両方とおした）\n');
})();

const src = fs.readFileSync(path.join(__dirname, '..', 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = KANJI_DATA;')(g);
const D = g.KANJI_DATA;

const r = scan(D);
console.log(`対象: ${D.length}語 ／ 読みの種類 ${new Set(D.map(d => d.kana)).size}`);

console.log(`\n=== ① 1文字の語: ${r.一文字.length}語 ===`);
r.一文字.forEach(d => {
  const 済 = 承認ずみ.includes(d.word);
  console.log(`  ${済 ? '［添え書きあり］' : '★［添え書きが無い］'} ${d.word}（${d.kana}）  [${d.unitKey} ${d.id} ${d.priority}]`);
});

console.log(`\n=== ② 読みの衝突（漢字が違うもの）: ${r.衝突.length}組 ===`);
if (r.衝突.length === 0) console.log('  0組');
else r.衝突.forEach(c => console.log(`  「${c.読み}」 → ${c.語.join(' / ')}`));

console.log(`\n（参考）読みも漢字も同じで単元をまたぐ語: ${r.同語重複.length}語 ＝ 同じ答えなので害なし`);

// --- 漏れの判定 ---
function 漏れを出す(結果, 表) {
  const s = new Set();
  結果.一文字.forEach(d => { if (!表.includes(d.word)) s.add(d.word); });
  結果.衝突.forEach(c => c.語.forEach(x => {
    const w = x.split('(')[0];
    if (!表.includes(w)) s.add(w);
  }));
  return s;
}
const 要add = 漏れを出す(r, 承認ずみ);

console.log(`\n=== 判定：いま紙に出ている ${承認ずみ.length}語 からの漏れ ===`);
if (要add.size === 0) {
  console.log('  ★0件（機械で確実に言える範囲では、いまの' + 承認ずみ.length + '語で足りています）');
} else {
  console.log(`  ★${要add.size}件 … ${[...要add].join('・')}`);
  console.log('  → 司令塔へ一覧で報告すること。文案は司令塔が見る（勝手に作って入れない）');
}
console.log('\n⚠️ 0件でも「漏れなし」の証明にはなりません。');
console.log('   同音の別語（例外／機会／関東のようにデータの外にある語）は、この検査からは見えません。');
console.log('   いまの表のうち 冷害・機械・竿燈 の3語は、まさにその型で、人が読んで見つけたものです。');
