/* ★これは「文案の検査」だけをする道具です。アプリには何も足していません。
   司令塔の条件（2026-09-23）を、案の段階で機械に当てる。

   ⚠️ 2026-09-23 改訂（司令塔の指摘）:
      初版は条件1を「語まるごと」でしか見ておらず、
      冷害「夏の低温の被害」の **「害」** を見逃して OK と出していた。
      → **1字ずつ**の照合を足した。確認ポイント 4-3b（「含む」で数える検査の落とし穴）と同じ型。

   見るもの
     1a. その語自身が、まるごと添え書きに入っていないか   … NG
     1b. ★その語の漢字が1字でも入っていないか            … NG（今回足した）
     2a. 同じ単元の別の語の答えが、まるごと入っていないか  … NG
     2b. 同じ単元の別の語の漢字が1字入っているか          … 参考（NGにしない）
     3.  12字以内か                                      … NG
     5.  租・庸・調 の添え書きが互いに違うか              … NG（同じ紙に並ぶため）

   ★2b を NG にしない理由: 「税」「名」のような1字はどこにでも出る。
     ここを NG にすると、鳴りすぎる検査になる（確認ポイント 4-3）。
     出しておいて、人が見て判断する。

   ★見ていないもの
     - 言いかえで答えが分かってしまうか（人の判断）
     - 添え書きを足したあとの紙そのもの。それは `紙に答えが出ていないか.js` で測る
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
  '隋':   '中国の王朝',
  '唐':   '中国の王朝',
  '租':   '稲で納める税',
  '調':   '特産物で納める税',
  '庸':   '布で納める税',
  '竿燈': '夏祭りの名',
  '冷害': '夏の低温で作物が不作',
  '機械': '工業の種類',
  '平氏': '武士団の名',
  '平治': '1159年の乱の名'
};

// 漢字だけを取り出す（ひらがな・カタカナ・数字は1字照合の対象にしない）
const 漢字 = s => [...s].filter(c => /\p{Script=Han}/u.test(c));

function judge(表) {
  const まるごと自分 = [], 一字自分 = [], まるごと他 = [], 一字他 = [], 長すぎ = [];
  Object.keys(表).forEach(word => {
    const note = 表[word];
    if (note.includes(word)) まるごと自分.push(`${word}「${note}」`);
    漢字(word).forEach(c => {
      if (note.includes(c)) 一字自分.push(`${word}「${note}」に「${c}」`);
    });
    if ([...note].length > 12) 長すぎ.push(`${word}「${note}」(${[...note].length}字)`);

    const units = new Set(D.filter(d => d.word === word).map(d => d.unitKey));
    const 他 = D.filter(o => units.has(o.unitKey) && o.word !== word);
    他.forEach(o => { if (note.includes(o.word)) まるごと他.push(`${word}「${note}」に ${o.word}(${o.id})`); });
    const seen = new Set();
    他.forEach(o => 漢字(o.word).forEach(c => {
      const k = word + c;
      if (note.includes(c) && !seen.has(k)) { seen.add(k); 一字他.push(`${word}「${note}」の「${c}」… ${o.word}(${o.id}) の字`); }
    }));
  });
  return { まるごと自分, 一字自分, まるごと他, 一字他, 長すぎ };
}

/* ---- 自己テスト（確認ポイント 4-1）：鳴るべきものと、鳴ってはいけないものを両方入れる ---- */
(function selftest() {
  const bad = {
    '租':   '祖ではないほうの租',            // ← 自分がまるごと入っている
    '調':   '口分田にかかる税',              // ← 同じ単元の別の答え（口分田）がまるごと入っている
    '庸':   'あいうえおかきくけこさしすせそ', // ← 15字で長すぎ
    '冷害': '夏の低温の被害'                 // ← ★今回の見落とし。「害」が自分の字
  };
  const r = judge(bad);
  const ok =
    r.まるごと自分.length === 1 &&
    r.まるごと他.length === 1 &&
    r.長すぎ.length === 1 &&
    r.一字自分.length === 2 &&                                   // 租（自分まるごと＝字も入る）と 冷害の「害」
    r.一字自分.some(x => x.includes('冷害') && x.includes('害'));
  if (!ok) {
    console.error('自己テスト失敗。結果を出しません:\n' + JSON.stringify(r, null, 1));
    process.exit(3);
  }
  console.log('自己テスト: OK（まるごと・★1字ずつ・他の答え・長すぎ を、それぞれ拾った）');
  console.log('  ★「冷害」→「夏の低温の被害」の「害」を、ちゃんと鳴らせた（初版が見逃した実例そのもの）\n');
})();

/* ---- 誤指摘の確認（確認ポイント 4-3）：直しすぎていないか ---- */
(function 対照() {
  const good = { '冷害': '夏の低温で作物が不作', '租': '稲で納める税' };
  const r = judge(good);
  if (r.一字自分.length !== 0 || r.まるごと自分.length !== 0) {
    console.error('対照失敗: 問題ない案に鳴っています（鳴りすぎ）:\n' + JSON.stringify(r, null, 1));
    process.exit(3);
  }
  console.log('対照: OK（直した案には鳴らない＝鳴りすぎていない）\n');
})();

let ng = 0;
const check = (n, c, d) => { console.log((c ? '  OK   ' : '  NG   ') + n + (d ? '\n         ' + d : '')); if (!c) ng++; };

console.log('=== 添え書きの案（11語） ===');
Object.keys(案).forEach(w => {
  const d = D.find(x => x.word === w);
  console.log(`  ${w.padEnd(3)} (${d.kana})  →  「${案[w]}」  ${[...案[w]].length}字   [${d.unitKey} ${d.id}]`);
});

const r = judge(案);
console.log('\n=== 条件の判定 ===');
check('1a. その語自身が、まるごと入っていない', r.まるごと自分.length === 0, r.まるごと自分.join(' / '));
check('★1b. その語の漢字が1字も入っていない', r.一字自分.length === 0, r.一字自分.join('\n         '));
check('2a. 同じ単元の別の答えが、まるごと入っていない', r.まるごと他.length === 0, r.まるごと他.join(' / '));
check('3.  12字以内', r.長すぎ.length === 0, r.長すぎ.join(' / '));
const 三つ = ['租', '庸', '調'].map(w => 案[w]);
check('5.  租・庸・調 が互いに違う（同じ紙に並ぶ）', new Set(三つ).size === 3, 三つ.join(' / '));
check('6.  平氏 と 平治 が互いに違う', 案['平氏'] !== 案['平治'], 案['平氏'] + ' / ' + 案['平治']);
check('4.  対象はこの11語だけ', Object.keys(案).length === 11, Object.keys(案).join('・'));

console.log('\n--- 2b. 同じ単元の別の答えと、漢字1字が重なるもの（参考。NGにはしない） ---');
if (r.一字他.length === 0) console.log('   なし');
else r.一字他.forEach(x => console.log('   ・' + x));

console.log('\n※ 隋・唐 は添え書きが同じ「中国の王朝」です。読みが「ずい」「とう」で違うため、');
console.log('   区別に年号は要らないという司令塔の判断によります（年号を書くと遣隋使607年と食い違って迷わせる）。');

console.log('\nNG 合計: ' + ng);
process.exit(ng === 0 ? 0 : 1);
