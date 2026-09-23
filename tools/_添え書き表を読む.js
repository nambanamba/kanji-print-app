/* ★index.html の TEST_NOTES を、実物から読み取る。

   理由: 道具の中に写しを置くと、本体と静かに食い違います。
   2026-09-23 に実際に起きました——`呉` を index.html に足したのに、
   道具側の「承認ずみ」配列が11語のままで、まだ漏れているように見えていました。
   **検査は、出荷されるものそのものを見るべきです**（確認ポイント 0-2／3-9）。

   ⚠️ 読み取れなかったら例外を投げます。黙って空の表を返しません
   （空を返すと「漏れ0件」「付けすぎ0件」と、都合よく全部通ってしまうため）。 */
const fs = require('fs');
const path = require('path');

function 添え書き表を読む(indexPath) {
  const p = indexPath || path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(p, 'utf8');
  const m = html.match(/const\s+TEST_NOTES\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!m) throw new Error(`TEST_NOTES を ${p} から読み取れませんでした（名前か書き方が変わった可能性）`);
  let 表;
  try { 表 = new Function('return ' + m[1])(); }
  catch (e) { throw new Error('TEST_NOTES の中身を読めませんでした: ' + e.message); }
  const n = Object.keys(表).length;
  if (n === 0) throw new Error('TEST_NOTES が空でした。検査が素通りするので止めます');
  return 表;
}

module.exports = { 添え書き表を読む };
