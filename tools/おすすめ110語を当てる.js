/* おすすめ110語（5年下\quiz_csv\漢字_厳選の候補_2026-09-23.md）を kanji-data.js の id に当てる。
   依頼 2026-09-24「★110語すべてが id に当たること。1件でも当たらなければ止めて司令塔に報告」
   出典表 = 「## 全体の並び（110語・重要 × 書けない の順）」（語と単元の両方が載っている唯一の表） */
const fs = require("fs");
const path = require("path");

const MD = "G:/マイドライブ/四谷大塚/5年下/quiz_csv/漢字_厳選の候補_2026-09-23.md";
const md = fs.readFileSync(MD, "utf8").split(/\r?\n/);

const start = md.findIndex(l => l.startsWith("## 全体の並び"));
if (start < 0) throw new Error("「## 全体の並び」の見出しが見つかりません");
let end = md.findIndex((l, i) => i > start && l.startsWith("## "));
if (end < 0) end = md.length;

// | # | 語 | 読み | 単元 | 単元内 | ... の行だけ拾う（1列目が数字のもの）
const rows = [];
for (let i = start; i < end; i++) {
  const l = md[i].trim();
  if (!l.startsWith("|")) continue;
  const c = l.split("|").slice(1, -1).map(s => s.trim());
  if (c.length < 4) continue;
  if (!/^\d+$/.test(c[0])) continue;                 // 見出し・区切り行を捨てる
  const word = c[1].replace(/\*\*/g, "").trim();     // 太字の ** を外す
  const kana = c[2].replace(/\*\*/g, "").trim();
  const unit = c[3].replace(/\*\*/g, "").trim();
  rows.push({ no: Number(c[0]), word, kana, unit });
}

// kanji-data.js を読む
const src = fs.readFileSync(path.join(__dirname, "..", "kanji-data.js"), "utf8");
const KANJI_DATA = eval(src + "; KANJI_DATA");

const hits = [], misses = [], ambiguous = [];
rows.forEach(r => {
  const cand = KANJI_DATA.filter(d => d.unitKey === r.unit && d.word === r.word);
  if (cand.length === 0) {
    // 手がかりを出す：同じ読み、または同じ回の似た語
    const byKana = KANJI_DATA.filter(d => d.kana === r.kana).map(d => `${d.id}/${d.unitKey}/${d.word}`);
    const byWordOtherUnit = KANJI_DATA.filter(d => d.word === r.word).map(d => `${d.id}/${d.unitKey}`);
    misses.push({ ...r, byKana, byWordOtherUnit });
  } else {
    if (cand.length > 1) ambiguous.push({ ...r, ids: cand.map(d => d.id) });
    hits.push({ ...r, id: cand[0].id, priority: cand[0].priority, ids: cand.map(d => d.id) });
  }
});

console.log(`出典の行数: ${rows.length}（期待 110）`);
console.log(`当たった: ${hits.length} / 当たらなかった: ${misses.length} / 同じ回に同じ語が複数: ${ambiguous.length}`);

const dupWord = new Map();
rows.forEach(r => { const k = r.unit + "/" + r.word; dupWord.set(k, (dupWord.get(k) || 0) + 1); });
const dups = [...dupWord].filter(([, n]) => n > 1);
if (dups.length) console.log("⚠️ 出典の中で重複している行:", dups);

if (ambiguous.length) {
  console.log("\n--- 同じ回に同じ語が複数ある（どの id か確かめること） ---");
  ambiguous.forEach(a => console.log(`  ${a.unit} ${a.word} → ${a.ids.join(", ")}`));
}
if (misses.length) {
  console.log("\n--- ★当たらなかった語（ここで止める） ---");
  misses.forEach(m => {
    console.log(`  #${m.no} ${m.unit} 「${m.word}」（${m.kana}）`);
    if (m.byWordOtherUnit.length) console.log(`      同じ語が別の回に: ${m.byWordOtherUnit.join(", ")}`);
    if (m.byKana.length)          console.log(`      同じ読みの語   : ${m.byKana.join(", ")}`);
  });
} else {
  console.log("\n✅ 110語すべて id に当たりました。");
  const byUnit = {};
  hits.forEach(h => { byUnit[h.unit] = (byUnit[h.unit] || 0) + 1; });
  console.log("回ごとの内訳:", byUnit);
  // 当てた結果を人が読める形で残す（あとから検められるように）。
  // ⚠️ ここに区切りの \u0000 を「実体のNULバイト」で書き出さないこと。
  //    2026-09-24 に一度やって、NUL入りのテキストファイルができました。タブ区切りにしています
  const out = hits.map(h => `${h.unit}\t${h.word}\t${h.id}\t${h.priority}`).join("\n");
  fs.writeFileSync(path.join(__dirname, "おすすめ110語_当てた結果.tsv"),
    `# 出典: 5年下/quiz_csv/漢字_厳選の候補_2026-09-23.md（社会クイズ作成担当・2026-09-23）\n` +
    `# 「## 全体の並び（110語）」の表から、語＋回 で kanji-data.js の id に当てた結果（110/110 一致）\n` +
    `# 回\t語\tid\t重要度\n` + out + "\n", "utf8");
  console.log("→ tools/おすすめ110語_当てた結果.tsv に書き出しました");
}
