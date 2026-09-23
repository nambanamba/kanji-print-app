/* データの中で読みが一意でも、子どもが書くときに一意とは限らない。
   （例:「そ」と言われて「租」か「祖」か。どちらもデータに在れば衝突として拾えるが、
     片方しかデータに無ければ拾えない）
   そこで、短い読み＝ほかの漢字が思いつきやすいものを、人が見るために並べる。
   ★これは機械の判定ではなく、人が見るための一覧です。 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = KANJI_DATA;')(g);
const D = g.KANJI_DATA;
const N = Number(process.argv[2] || 5);
const short = D.filter(d => d.kana.length <= N)
  .sort((a, b) => a.kana.length - b.kana.length || a.kana.localeCompare(b.kana));
console.log(`読みが ${N}文字以下の語: ${short.length} / ${D.length}`);
short.forEach(d => console.log(`  ${String(d.kana).padEnd(6)} → ${d.word}   [${d.unitKey} ${d.id} ${d.priority}]`));
