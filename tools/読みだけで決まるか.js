/* テストプリントからヒント（mean）を消すと、出るのは「読み（kana）」だけになる。
   そのとき答えが一意に決まるかを数える。

   ★見ているもの
     1. 489語ぜんぶで、同じ読みなのに漢字が違う組（＝読みだけでは決まらない語）
     2. そのうち、実際に同じ紙（1枚10語）に載りうるか（同じ単元にいるか）
     3. 同じ読み・同じ漢字（＝単元またぎの重複語）は害がないので別枠にする

   ★見ていないもの
     - 読みは同じでも文脈で分かる、という人の判断（機械では決められない）
     - 送りがな・表記ゆれ
*/
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = KANJI_DATA; g.KANJI_UNITS = KANJI_UNITS;')(g);
const D = g.KANJI_DATA;

/* ---------- 自己テスト（確認ポイント 4-1）：先に鳴ることを確かめる ---------- */
(function selftest() {
  const fake = [
    { id: 'a', unitKey: 'U', word: '租', kana: 'そ' },
    { id: 'b', unitKey: 'U', word: '祖', kana: 'そ' },   // ← 同じ単元でぶつかる。鳴るべき
    { id: 'c', unitKey: 'V', word: '庸', kana: 'よう' },
    { id: 'd', unitKey: 'W', word: '調', kana: 'ちょう' },
    { id: 'e', unitKey: 'X', word: '調', kana: 'ちょう' }, // ← 同じ読み・同じ漢字。害がないので別枠
    { id: 'f', unitKey: 'Y', word: '倭', kana: 'わ' },
    { id: 'h', unitKey: 'Z', word: '和', kana: 'わ' }     // ← 別単元でぶつかる。鳴るべき（ただし同じ紙には載らない）
  ];
  const r = scan(fake);
  const ok =
    r.衝突.length === 2 &&
    r.衝突.some(c => c.読み === 'そ' && c.同じ単元 === true) &&
    r.衝突.some(c => c.読み === 'わ' && c.同じ単元 === false) &&
    r.同語重複.length === 1 && r.同語重複[0].読み === 'ちょう';
  if (!ok) { console.error('自己テスト失敗。結果を出しません:\n' + JSON.stringify(r, null, 1)); process.exit(3); }
  console.log('自己テスト: OK（同単元の衝突・別単元の衝突・害のない重複語を、それぞれ正しく仕分けた）\n');
})();

function scan(list) {
  const byKana = {};
  list.forEach(d => (byKana[d.kana] = byKana[d.kana] || []).push(d));
  const 衝突 = [], 同語重複 = [];
  Object.keys(byKana).forEach(k => {
    const items = byKana[k];
    if (items.length < 2) return;
    const words = [...new Set(items.map(d => d.word))];
    if (words.length === 1) {
      同語重複.push({ 読み: k, 語: words[0], 単元: items.map(d => d.unitKey) });
      return;
    }
    // 同じ単元の中に、違う漢字の同じ読みが2つ以上あるか（＝同じ紙に載りうる）
    const perUnit = {};
    items.forEach(d => (perUnit[d.unitKey] = perUnit[d.unitKey] || new Set()).add(d.word));
    const 同じ単元 = Object.values(perUnit).some(s => s.size >= 2);
    衝突.push({
      読み: k, 同じ単元,
      語: items.map(d => `${d.word}(${d.unitKey}/${d.id})`)
    });
  });
  return { 衝突, 同語重複 };
}

const r = scan(D);
console.log('総語数: ' + D.length + ' ／ 読みの種類: ' + new Set(D.map(d => d.kana)).size);
console.log('');
console.log('★読みが同じなのに漢字が違う組: ' + r.衝突.length + '組');
const 同紙 = r.衝突.filter(c => c.同じ単元);
console.log('   うち、同じ単元にいる（＝同じ紙に載りうる）: ' + 同紙.length + '組');
console.log('   別の単元どうし（同じ回だけ選べばぶつからない）: ' + (r.衝突.length - 同紙.length) + '組');
console.log('');
if (r.衝突.length) {
  console.log('--- 内訳 ---');
  r.衝突.forEach(c => console.log(`  ${c.同じ単元 ? '★同じ単元' : ' 別単元  '}  「${c.読み}」 → ${c.語.join(' / ')}`));
  console.log('');
}
console.log('（参考）同じ読み・同じ漢字で単元をまたいでいる語（害なし）: ' + r.同語重複.length + '語');
