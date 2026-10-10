# 歴史の単元（第1〜4・6回）を外し、作り直した15回分に入れかえる（2026-10-10・社会クイズ作成担当の依頼）
# 依頼書: 5年下/quiz_csv/取り込み依頼_漢字_作り直し_20261010.md
# 使い方: python tools/歴史の漢字を入れかえる.py [--書く]   （--書く が無ければ検査だけで、何も書かない）
# ・元JSONは sha256 を「バイナリで」計算し、依頼書の表と合わなければ止まる
# ・夏期講習(kaki…)の部分は1バイトも変えない（入れかえ前後で同じ塊かを突き合わせる）
import hashlib, json, re, sys, collections

SRC = 'G:/マイドライブ/四谷大塚/5年下/quiz_csv/漢字_洗い出し_20261010/'
DST = 'G:/マイドライブ/四谷大塚/kanji-print-app/kanji-data.js'
EXPECT = {  # 回: (語数, sha256先頭16桁)  ← 依頼書(県名を外す・374語版)の表
    1: (22, 'af5b75daade1dc2d'),
    2: (24, '9afe9472cd685fa7'),
    3: (32, '07d972413a513eeb'),
    4: (34, '6eef7f0852c5a8a4'),
    6: (27, 'a8154bdedd6de764'),
    7: (28, '688683b3a3f1f560'),
    8: (23, '45b64d633c29762f'),
    9: (28, '1f673e079dc35c41'),
    11: (24, '9e87ed144f1749fc'),
    12: (20, '32ec4c116fd5cafb'),
    13: (24, 'c6d9798dfbe3ed0b'),
    14: (29, '3d90c481f5f6bb47'),
    16: (17, 'd81c37f3b238d64c'),
    17: (20, 'e29ffa7fb40552f7'),
    18: (16, 'e4a9cfc903abf06c'),
}
NL = '\r\n'
write = '--書く' in sys.argv

def js_val(v):
    return json.dumps(v, ensure_ascii=False)

new_entries = []   # (回, unit名, [entry,...])
for kai in sorted(EXPECT):
    raw = open(SRC + '第%d回_漢字_新.json' % kai, 'rb').read()      # バイナリで読む
    h = hashlib.sha256(raw).hexdigest()[:16]
    n, want = EXPECT[kai]
    assert h == want, '第%d回 sha256 が依頼書と合いません: %s != %s（まず開き直す。同期遅れでも合いません）' % (kai, h, want)
    data = json.loads(raw.decode('utf-8'))
    assert len(data) == n, '第%d回 語数 %d != %d' % (kai, len(data), n)
    units = {d['unit'] for d in data}
    assert len(units) == 1, '第%d回 unit が複数' % kai
    assert all(d['unitKey'] == '第%d回' % kai and d['kai'] == kai for d in data)
    assert all(re.fullmatch(r'h%d_\d{2}' % kai, d['id']) for d in data)
    assert all(d['priority'] in ('高', '中') for d in data)
    new_entries.append((kai, units.pop(), data))

all_ids = [d['id'] for _, _, ds in new_entries for d in ds]
assert len(all_ids) == len(set(all_ids)) == 368, '新しい語は368・id重複なし'

b = open(DST, 'rb').read()                                           # バイナリで読む
s = b.decode('utf-8')
assert s.count('\n') == s.count('\r\n'), 'kanji-data.js は全行 CRLF の前提'
start_tag = 'const KANJI_DATA = [' + NL
i0 = s.index(start_tag) + len(start_tag)
# 最初の夏期講習の語の直前（その語の見出しコメントがあれば、その先頭）まで が歴史
first_kaki = s.index('  {' + NL + '    id: "kaki')
lines_before = s[:first_kaki].split(NL)
cut = first_kaki
while True:
    prev = s[:cut].rstrip(NL)
    last_line_start = prev.rfind(NL) + len(NL)
    ln = prev[last_line_start:]
    if ln.startswith('  //'):
        cut = last_line_start
    else:
        break
old_history = s[i0:cut]
assert 'id: "h' in old_history and 'id: "kaki' not in old_history
end_arr = s.index(NL + '];' + NL, cut) + len(NL)                     # KANJI_DATA の閉じ括弧の手前の改行まで
kaki_part = s[cut:end_arr]
assert len(re.findall(r'^    id: "kaki', kaki_part, re.M)) == 375, '夏期講習は375語のはず'
assert 'id: "k' not in re.sub(r'id: "kaki', '', kaki_part)

def entry_text(d):
    keys = ['id', 'unit', 'unitKey', 'word', 'kana', 'mean', 'kai', 'priority', 'level'] + \
           [k for k in d if k not in ('id', 'unit', 'unitKey', 'word', 'kana', 'mean', 'kai', 'priority', 'level')]
    body = (',' + NL).join('    %s: %s' % (k, js_val(d[k])) for k in keys)
    return '  {' + NL + body + NL + '  },' + NL

hist = ''
for kai, unit, ds in new_entries:
    hist += '  // ========================================' + NL
    hist += '  // %s (%d語)' % (unit, len(ds)) + NL
    hist += '  // ========================================' + NL
    hist += ''.join(entry_text(d) for d in ds)

# 単元一覧
um = re.search(r'const KANJI_UNITS = \[' + NL + r'(.*?)\];', s, re.S)
unit_lines = um.group(1).split(NL)
kaki_units = [l for l in unit_lines if '夏期講習復習編' in l]
assert len(kaki_units) == 7
new_units = ['  { key: "第%d回", name: %s, count: %d },' % (kai, js_val(unit), len(ds)) for kai, unit, ds in new_entries]
units_text = NL.join(new_units + kaki_units) + NL

head = s[:i0]
head = re.sub(r'// kosukequiz-battle側 data\.js.*?\r\n// quiz_csv.*?\r\n',
              '// （歴史は2026-10-10に作り直した15回分410語。id は h{回}_{連番}。夏期講習は k…→kaki{N}_{連番} のまま）' + NL
              + '// quiz_csv/漢字_洗い出し_20261010 の 第{回}回_漢字_新.json をそのまま反映したもの' + NL, head, flags=re.S)
rest_after = s[um.end():]
pre_units = s[end_arr:s.index('const KANJI_UNITS = [' + NL)]
out = head + hist + kaki_part + pre_units + 'const KANJI_UNITS = [' + NL + units_text + '];' + s[um.end():]
assert out.count('\n') == out.count('\r\n')

# 検算: 夏期講習の塊が同一か／新しい出力を読み直して数える
assert out[out.index(kaki_part[:60]):].startswith(kaki_part), '夏期講習の塊が変わっている'
ids = re.findall(r'^    id: "([^"]+)"', out, re.M)
cnt = collections.Counter(re.match(r'[a-z]+', i).group(0) for i in ids)
print('出力の語数', len(ids), dict(cnt))
assert cnt['h'] == 368 and cnt['kaki'] == 375 and cnt.get('k', 0) == 0 and len(ids) == len(set(ids))
print('入れかえ前の歴史', len(re.findall(r'^    id: "h\d', old_history, re.M)), '語 →', 368, '語')
if write:
    open(DST, 'wb').write(out.encode('utf-8'))                       # バイナリで書く
    print('書きました', DST)
else:
    print('（検査だけ。--書く を付けると書きます）')
