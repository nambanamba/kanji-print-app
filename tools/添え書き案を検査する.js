/* ★これは「文案の検査」だけをする道具です。アプリには何も足していません。
   司令塔の条件（2026-09-23）を、案の段階で機械に当てる。

   1. 答えを見せない        … 添え書きに、その語自身の漢字が入っていないか
   2. 同じ紙の別の答えを含めない … 同じ単元の他の語の答えが入っていないか
   3. 短く                  … 12字以内か
   5. 租・庸・調は同じ紙に並ぶ … 3つの添え書きが互いに違うか
*/
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = KANJI_DATA;')(g);
const D = g.KANJI_DATA;

// 添え書きの案（word をキーにする。id は振り直る前例があるため）
const 案 = {
  '倭':   '昔の日本のよび名',
  '隋':   '6世紀の中国の王朝',
  '唐':   '7世紀の中国の王朝',
  '租':   '稲で納める税',
  '調':   '特産物で納める税',
  '庸':   '布で納める税',
  '竿燈': '夏祭りの名',
  '冷害': '夏の低温の被害',
  '機械': '工業の種類',
  '平氏': '武士団の名',
  '平治': '1159年の乱の名'
};

let ng = 0;
const check = (n, c, d) => { console.log((c ? '  OK   ' : '  NG   ') + n + (d ? '  … ' + d : '')); if (!c) ng++; };

/* ---- 自己テスト：わざと条件を破った案を入れて、鳴るか（確認ポイント 4-1） ---- */
(function selftest() {
  const bad = {
    '租': '祖ではないほうの租',                       // ← 自分の漢字が入っている
    '調': '口分田にかかる税',                         // ← 同じ単元の別の答え（口分田）が入っている
    '庸': 'あいうえおかきくけこさしすせそ'            // ← 15字で長すぎ
  };
  const r = judge(bad, false);
  const ok = r.自分の漢字.length === 1 && r.他の答え.length === 1 && r.長すぎ.length === 1;
  if (!ok) { console.error('自己テスト失敗。結果を出しません: ' + JSON.stringify(r)); process.exit(3); }
  console.log('自己テスト: OK（自分の漢字入り・他の答え入り・長すぎ を、それぞれ拾った）\n');
})();

function judge(表, verbose) {
  const 自分の漢字 = [], 他の答え = [], 長すぎ = [];
  Object.keys(表).forEach(word => {
    const note = 表[word];
    const 該当 = D.filter(d => d.word === word);
    if (note.includes(word)) 自分の漢字.push(`${word}「${note}」`);
    if ([...note].length > 12) 長すぎ.push(`${word}「${note}」(${[...note].length}字)`);
    該当.forEach(d => {
      D.filter(o => o.unitKey === d.unitKey && o.word !== word)
        .forEach(o => { if (note.includes(o.word)) 他の答え.push(`${word}「${note}」に ${o.word}(${o.id})`); });
    });
  });
  return { 自分の漢字, 他の答え, 長すぎ };
}

console.log('=== 添え書きの案 ===');
Object.keys(案).forEach(w => {
  const d = D.find(x => x.word === w);
  console.log(`  ${w.padEnd(3)} (${d.kana})  →  「${案[w]}」   [${d.unitKey} ${d.id}]`);
  console.log(`        いまの意味: ${d.mean}`);
});

const r = judge(案, true);
console.log('\n=== 条件の判定 ===');
check('1. 添え書きに、その語自身の漢字が入っていない', r.自分の漢字.length === 0, r.自分の漢字.join(' / '));
check('2. 同じ単元の別の語の答えが入っていない', r.他の答え.length === 0, r.他の答え.join(' / '));
check('3. 12字以内', r.長すぎ.length === 0, r.長すぎ.join(' / '));
const 三つ = ['租', '庸', '調'].map(w => 案[w]);
check('5. 租・庸・調 の添え書きが互いに違う（同じ紙に並ぶ）', new Set(三つ).size === 3, 三つ.join(' / '));
check('6. 平氏 と 平治 の添え書きが互いに違う', 案['平氏'] !== 案['平治'], 案['平氏'] + ' / ' + 案['平治']);
check('4. 対象はこの11語だけ', Object.keys(案).length === 11, Object.keys(案).join('・'));

/* ★参考：いまの意味（mean）をそのまま短くして使うと、どれが条件2に引っかかるか */
console.log('\n（参考）いまの意味をそのまま使った場合、同じ単元の別の答えを含むもの:');
const mean表 = {}; Object.keys(案).forEach(w => { const d = D.find(x => x.word === w); mean表[w] = d.mean; });
judge(mean表, false).他の答え.forEach(x => console.log('   ・' + x));

console.log('\nNG 合計: ' + ng);
process.exit(ng === 0 ? 0 : 1);
