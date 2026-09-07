// アプリの「🐙 GitHubに報告して消してもらう」で作られた削除報告Issueを読んで、
// kanji-data.js から該当の語を取りのぞく。
//
// Issueの本文は index.html の buildRemovalIssue() が作る決まった形で、
// 元データJSONのファイルごとに表が分かれている:
//   ### quiz_csv / 第1回_漢字.json
//   | id | 漢字 | 読み | ヒント |
//   |---|---|---|---|
//   | `k1_26` | 群馬県 | ぐんまけん | 岩宿遺跡がある県 |
//
// kanji-data.js は1語1ブロックの整形されたテキストなので、idでブロックを見つけて
// そのブロックだけを取りのぞく。ほかの行やファイル全体の整形には触れない。
//
// 入力（環境変数）: ISSUE_BODY
// 出力: GITHUB_OUTPUT に applied(true/false) / count / ids / reason / title を書く
const fs = require("fs");
const path = require("path");

const DATA_JS = path.join(__dirname, "..", "..", "kanji-data.js");

function out(obj) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(obj).map(([k, v]) => {
    const s = String(v);
    return s.includes("\n") ? k + "<<__EOF__\n" + s + "\n__EOF__" : k + "=" + s;
  });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
}
function fail(reason) {
  out({ applied: "false", reason });
  console.log("適用しませんでした: " + reason);
  process.exit(0); // ワークフロー自体は成功させ、Issueにコメントで知らせる
}
function evalData(src) {
  return new Function(src + "; return {KANJI_DATA, KANJI_UNITS};")();
}

// 表の行から id と漢字を取り出す。id は `k1_26` のようにバッククォートで囲まれている
function parseRows(body) {
  const rows = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\|\s*`([A-Za-z0-9_]+)`\s*\|\s*([^|]+?)\s*\|/);
    if (m) rows.push({ id: m[1], word: m[2] });
  }
  return rows;
}

const body = (process.env.ISSUE_BODY || "").replace(/\r\n/g, "\n");
if (!body.trim()) fail("Issueの本文が空です");

const rows = parseRows(body);
if (rows.length === 0) fail("消す語の表が読み取れませんでした（`id` の行が1つもありません）");

const seen = new Set();
for (const r of rows) {
  if (seen.has(r.id)) fail("同じidが2回書かれています: " + r.id);
  seen.add(r.id);
}

const src = fs.readFileSync(DATA_JS, "utf8");
const before = evalData(src);

// 報告の漢字と、いまのデータの漢字が食い違っていたら止める。
// idが振り直されていた場合に、別の語を消してしまうのを防ぐため
for (const r of rows) {
  const d = before.KANJI_DATA.find(x => x.id === r.id);
  if (!d) fail("kanji-data.js に id " + r.id + " が見つかりませんでした（すでに消されているかもしれません）");
  if (d.word !== r.word) {
    fail("id " + r.id + " の漢字が報告と違います（報告: " + r.word + " ／ 今のデータ: " + d.word +
         "）。データが更新されて id がずれている可能性があるので、手で確認してください");
  }
}

// ブロックを1つずつ取りのぞく。うしろのidから消すと位置がずれない
let next = src;
const positions = rows.map(r => {
  const re = new RegExp('^[ \\t]*id:[ \\t]*"' + r.id + '"[ \\t]*,[ \\t]*$', "m");
  const m = next.match(re);
  if (!m) fail("kanji-data.js の id 行を特定できませんでした: " + r.id);
  return { ...r, pos: m.index };
}).sort((a, b) => b.pos - a.pos);

for (const p of positions) {
  const start = next.lastIndexOf("\n  {", p.pos);
  const end = next.indexOf("\n  },", p.pos);
  if (start === -1 || end === -1) fail("ブロックの範囲を特定できませんでした: " + p.id);
  next = next.slice(0, start) + next.slice(end + "\n  },".length);
}

// KANJI_UNITS の count を、消したあとの実際の語数に合わせる
const mid = evalData(next);
for (const u of before.KANJI_UNITS) {
  const n = mid.KANJI_DATA.filter(d => d.unitKey === u.key).length;
  if (n === u.count) continue;
  const re = new RegExp('(\\{[ \\t]*key:[ \\t]*"' + u.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
                        '"[^}]*count:[ \\t]*)\\d+', "m");
  if (!re.test(next)) fail("KANJI_UNITS の " + u.key + " の行が見つかりませんでした");
  next = next.replace(re, (m, head) => head + n);
}

// 書き出す前に必ず読み直して確かめる
let after;
try { after = evalData(next); } catch (e) { fail("書きかえた結果の kanji-data.js が読み取れませんでした: " + e.message); }

const removed = new Set(rows.map(r => r.id));
if (after.KANJI_DATA.length !== before.KANJI_DATA.length - rows.length) {
  fail("語数が想定と合いません（" + before.KANJI_DATA.length + " → " + after.KANJI_DATA.length + "、消すのは " + rows.length + "語）");
}
if (after.KANJI_DATA.some(d => removed.has(d.id))) fail("消したはずのidが残っています");
const keptBefore = before.KANJI_DATA.filter(d => !removed.has(d.id)).map(d => d.id).join(",");
if (keptBefore !== after.KANJI_DATA.map(d => d.id).join(",")) fail("消す語以外の並びが変わってしまいました");
for (const u of after.KANJI_UNITS) {
  const n = after.KANJI_DATA.filter(d => d.unitKey === u.key).length;
  if (n !== u.count) fail("KANJI_UNITS の count が合いません: " + u.key + " (" + u.count + " ≠ " + n + ")");
}
const empty = after.KANJI_UNITS.filter(u => u.count === 0).map(u => u.key);
if (empty.length) fail("この削除で語が0になる単元があります（" + empty.join("・") + "）。手で確認してください");

fs.writeFileSync(DATA_JS, next);
const words = rows.map(r => r.word).join("・");
console.log("kanji-data.js から " + rows.length + "語を削除しました: " + words);
out({
  applied: "true",
  count: String(rows.length),
  ids: rows.map(r => r.id).join(","),
  words,
  title: "[漢字データ削除] " + rows.length + "語（" + words.slice(0, 40) + (words.length > 40 ? "ほか" : "") + "）"
});
