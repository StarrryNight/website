"""Give the stash markers collision-proof sentinels.

'M0' / 'C0' can occur in ordinary prose, so the final put-back could
corrupt real text. Private-use codepoints cannot appear in content and
pass through esc() untouched.

Backslashes are built from chr(92) so this file contains no escape
sequences of its own to be mangled in transit.
"""
import io

B = chr(92)          # backslash
ESC = B + 'uE000'    # the text , as it should appear in build.mjs
D = B + 'd'          # the text \d
N = B + 'n'          # the text \n

pairs = [
    ("return ' M' + (math.length - 1) + ' ';",
     "return ' " + ESC + "M' + (math.length - 1) + '" + ESC + " ';"),

    ("return '" + N + N + "C' + (code.length - 1) + '" + N + N + "';",
     "return '" + N + N + ESC + "C' + (code.length - 1) + '" + ESC + N + N + "';"),

    ("const held = b.match(/^C(" + D + "+)$/);",
     "const held = b.match(/^" + ESC + "C(" + D + "+)" + ESC + "$/);"),

    ("if (/^M" + D + "+$/.test(b)) { out.push(b); continue; }",
     "if (/^" + ESC + "M" + D + "+" + ESC + "$/.test(b)) { out.push(b); continue; }"),

    (".replace(/M(" + D + "+)/g, (_, i) => math[Number(i)]);",
     ".replace(/" + ESC + "M(" + D + "+)" + ESC + "/g, (_, i) => math[Number(i)]);"),
]

path = 'build.mjs'
s = io.open(path, encoding='utf-8').read()

missing = [old for old, _ in pairs if old not in s]
if missing:
    print('NOT FOUND:')
    for m in missing:
        print('   ', repr(m))
    raise SystemExit(1)

for old, new in pairs:
    s = s.replace(old, new)

io.open(path, 'w', encoding='utf-8').write(s)
print('patched all 5 markers')
