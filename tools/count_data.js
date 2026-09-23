// データの内訳を数えるだけの道具（読み取り専用）
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'kanji-data.js'), 'utf8');
const g = {};
new Function('g', src + '\n g.KANJI_DATA = typeof KANJI_DATA !== "undefined" ? KANJI_DATA : null;' +
  '\n g.KANJI_UNITS = typeof KANJI_UNITS !== "undefined" ? KANJI_UNITS : null;')(g);
const D = g.KANJI_DATA, U = g.KANJI_UNITS;
console.log('総語数', D.length, '／単元数', U.length);
const by = {};
D.forEach(d => {
  by[d.unitKey] = by[d.unitKey] || { n: 0, p: {} };
  by[d.unitKey].n++;
  by[d.unitKey].p[d.priority] = (by[d.unitKey].p[d.priority] || 0) + 1;
});
U.forEach(u => {
  const b = by[u.key] || { n: 0, p: {} };
  console.log((u.key + '').padEnd(10), (u.name + '').padEnd(30), 'meta.count=' + u.count, 'actual=' + b.n, JSON.stringify(b.p));
});
const prio = {};
D.forEach(d => prio[d.priority] = (prio[d.priority] || 0) + 1);
console.log('priority 全体:', JSON.stringify(prio));
const lv = {};
D.forEach(d => lv[d.level] = (lv[d.level] || 0) + 1);
console.log('level 全体:', JSON.stringify(lv));
// 語の重複（unitKey+word ではなく word で）
const w = {};
D.forEach(d => w[d.word] = (w[d.word] || 0) + 1);
console.log('重複する語:', Object.keys(w).filter(k => w[k] > 1).length, '件');
