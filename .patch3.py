"""Swap the plain-text stash markers in build.mjs for private-use codepoints.

'M0' and 'C0' can occur in ordinary prose, so the final put-back could
corrupt real text. \\uE000-\\uE003 are private-use characters that cannot
appear in content and pass through esc() untouched.
"""
import io

path = 'build.mjs'
s = io.open(path, encoding='utf-8').read()
orig = s

pairs = [
    # stash() return value
    ("return ' M' + (math.length - 1) + ' ';",
     "return '\\uE000' + (math.length - 1) + '\\uE001';"),
    # fenced-code return value
    ("return '\\n\\nC' + (code.length - 1) + '\\n\\n';",
     "return '\\n\\n\\uE002' + (code.length - 1) + '\\uE003\\n\\n';"),
    # code block lookup
    ("const held = b.match(/^C(\\d+)$/);",
     "const held = b.match(/^\\uE002(\\d+)\\uE003$/);"),
    # standalone display-maths block
    ("if (/^M\\d+$/.test(b)) { out.push(b); continue; }",
     "if (/^\\uE000\\d+\\uE001$/.test(b)) { out.push(b); continue; }"),
    # final put-back
    (".replace(/M(\\d+)/g, (_, i) => math[Number(i)]);",
     ".replace(/\\uE000(\\d+)\\uE001/g, (_, i) => math[Number(i)]);"),
]

missing = []
for old, new in pairs:
    if old not in s:
        missing.append(old)
        continue
    s = s.replace(old, new)

if missing:
    print('NOT FOUND:')
    for m in missing:
        print('   ', repr(m))
    raise SystemExit(1)

io.open(path, 'w', encoding='utf-8').write(s)
print('patched' if s != orig else 'no change')
