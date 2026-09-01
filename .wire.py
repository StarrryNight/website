"""Wire KaTeX into build.mjs:

  1. copy katex.min.css and its fonts out of node_modules at build time
  2. render each post/project body first, so usesMath is known before
     page() is called, and pass math: to page()
  3. report at the end whether any maths was rendered
"""
import io

path = 'build.mjs'
s = io.open(path, encoding='utf-8').read()
orig = s

# --- 1. copy the KaTeX stylesheet and fonts alongside the other assets ---

anchor = "hero.forEach((f, i) => publish('hero', f, `hero-${i + 1}`));"
katex_copy = """/* KaTeX's stylesheet and fonts, copied out of node_modules so the
   published site has no runtime dependency on it. */
function publishKatex() {
  const from = join('node_modules', 'katex', 'dist');
  if (!existsSync(from)) {
    console.warn('  ! node_modules/katex missing - run npm install');
    return;
  }
  copyFileSync(join(from, 'katex.min.css'), join('css', 'katex.min.css'));
  mkdirSync(join('css', 'fonts'), { recursive: true });
  for (const f of listDir(join(from, 'fonts'))) {
    copyFileSync(join(from, 'fonts', f), join('css', 'fonts', f));
  }
}

"""
if anchor not in s:
    raise SystemExit('anchor not found: hero.forEach')
s = s.replace(anchor, katex_copy + anchor, 1)

# --- 2. render the body before page(), so usesMath is settled ----------

for marker in ["writeFileSync(join('blog', p.slug + '.html'), page({",
               "writeFileSync(join('projects', p.slug + '.html'), page({")]:
    if marker not in s:
        raise SystemExit('marker not found: ' + marker)
    s = s.replace(marker, "usesMath = false;\n  " + marker, 1)

# page() is given the flag; it is read after the template literal for the
# body has already been evaluated, which is what makes this work.
s = s.replace("    prefix: '../',\n    body: `  <article class=\"post\">",
              "    prefix: '../',\n    get math() { return usesMath; },\n    body: `  <article class=\"post\">")

# --- 3. tell the user what happened -----------------------------------

if 'publishKatex();' not in s:
    s = s.replace("hero.forEach((f, i) => publish('hero', f, `hero-${i + 1}`));",
                  "publishKatex();\nhero.forEach((f, i) => publish('hero', f, `hero-${i + 1}`));", 1)

io.open(path, 'w', encoding='utf-8').write(s)
print('wired' if s != orig else 'no change')
