/**
 * Reads everything in content/ and writes the site.
 *
 *   npm install     (once — pulls in KaTeX)
 *   node build.mjs
 *
 * KaTeX is used here at build time only. Nothing it produces needs a
 * build step to run: the output is plain HTML, CSS and JS, and any
 * maths ships as finished markup rather than a script that renders it.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import katex from 'katex';

const C = 'content';
const IMG = 'images';

/* ── helpers ────────────────────────────────────────────────── */

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slug = (s) => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
const isImage = (f) => IMAGE_EXT.includes(extname(f).toLowerCase());

/** Files in a folder, sorted by name, ignoring dotfiles. */
const listDir = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')).sort() : [];

/** Splits "key: value" header lines from the body that follows. */
/**
 * Meta-only files (site.txt, life.txt): every "key: value" line in the
 * file. Blank lines and # comments anywhere are ignored, so the keys can
 * be grouped and annotated freely.
 */
function parseMeta(text) {
  const meta = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

/**
 * Files with a body: a "key: value" header, then the markdown.
 *
 * Leading blank lines and # comments are skipped, so a file can open with
 * an explanatory comment. Once the first key is read, the header ends at
 * the first line that is not another key — normally the blank line before
 * the body. Everything from there on is the body, untouched, so a body
 * may start with a "## heading" without it being mistaken for a comment.
 */
function parseFile(text) {
  const lines = text.split('\n');
  const meta = {};
  let i = 0;
  let started = false;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!started && (!t || t.startsWith('#'))) continue;
    const m = lines[i].match(/^([a-z_]+):\s*(.*)$/);
    if (!m) break;
    meta[m[1]] = m[2].trim();
    started = true;
  }
  return { meta, body: lines.slice(i).join('\n').trim() };
}

/**
 * Markdown, with LaTeX.
 *
 * Supported: # ## ###, - and 1. lists, > quotes, fenced code, --- rules,
 * | tables |, **bold**, *italic*, `code`, [links](url), ![images](file),
 * and $inline$ / $$display$$ maths.
 *
 * Maths and fenced code are lifted out first, before any escaping or
 * inline formatting runs. Otherwise < > and & inside a formula get
 * HTML-escaped, and * collides with the bold and italic rules.
 */
function markdown(src) {
  const math = [];
  const stash = (tex, display) => {
    let html;
    try {
      html = katex.renderToString(tex.trim(), {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      });
      usesMath = true;
    } catch (err) {
      console.warn('  ! katex could not parse: ' + tex.trim().slice(0, 60));
      html = '<code>' + esc(tex.trim()) + '</code>';
    }
    math.push(html);
    return ' M' + (math.length - 1) + ' ';
  };

  const code = [];
  let text = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, body) => {
    code.push('<pre><code' + (lang ? ' class="language-' + lang + '"' : '') +
              '>' + esc(body.replace(/\n$/, '')) + '</code></pre>');
    return '\n\nC' + (code.length - 1) + '\n\n';
  });

  text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => stash(tex, true))
    .replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, before, tex) => before + stash(tex, false))
    .replace(/\\\$/g, '$');

  const inline = (t) => esc(t)
    .replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  const out = [];
  for (const block of text.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;

    const held = b.match(/^C(\d+)$/);
    if (held) { out.push(code[Number(held[1])]); continue; }

    if (/^---+$/.test(b)) { out.push('<hr>'); continue; }
    if (b.startsWith('### ')) { out.push('<h3>' + inline(b.slice(4)) + '</h3>'); continue; }
    if (b.startsWith('## '))  { out.push('<h2>' + inline(b.slice(3)) + '</h2>'); continue; }
    if (b.startsWith('# '))   { out.push('<h2>' + inline(b.slice(2)) + '</h2>'); continue; }

    const rows = b.split('\n');
    if (/^\|/.test(b) && rows.length > 2 && /^\|?[\s:|-]*-[\s:|-]*$/.test(rows[1])) {
      const head = cells(rows[0]);
      const body = rows.slice(2).filter((r) => r.trim());
      out.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') +
        '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + cells(r).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>');
      continue;
    }

    if (b.startsWith('> ')) {
      out.push('<blockquote>' + inline(rows.map((l) => l.replace(/^>\s?/, '')).join(' ')) + '</blockquote>');
      continue;
    }
    if (/^- /.test(b)) {
      out.push('<ul>' + rows.map((l) => '<li>' + inline(l.replace(/^-\s+/, '')) + '</li>').join('') + '</ul>');
      continue;
    }
    if (/^\d+\. /.test(b)) {
      out.push('<ol>' + rows.map((l) => '<li>' + inline(l.replace(/^\d+\.\s+/, '')) + '</li>').join('') + '</ol>');
      continue;
    }

    // A display formula standing alone is a block, not a paragraph.
    if (/^M\d+$/.test(b)) { out.push(b); continue; }

    out.push('<p>' + inline(rows.join(' ')) + '</p>');
  }

  return out
    .map((l) => '        ' + l)
    .join('\n')
    .replace(/M(\d+)/g, (_, i) => math[Number(i)]);
}

/** Set by markdown() whenever a page actually contains maths. */
let usesMath = false;

/* ── read content ───────────────────────────────────────────── */

const site = parseMeta(readFileSync(join(C, 'site.txt'), 'utf8'));

const aboutRaw = readFileSync(join(C, 'about.txt'), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
const aboutParsed = parseFile(aboutRaw);
const about = {
  stack: (aboutParsed.meta.stack || '').split(',').map((s) => s.trim()).filter(Boolean),
  paragraphs: aboutParsed.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
};

const lifeMeta = parseMeta(readFileSync(join(C, 'life.txt'), 'utf8'));

/** Hero images, in filename order. */
const hero = listDir(join(C, 'hero')).filter(isImage);

/** Gallery: "01 - Match day.jpg" -> caption "Match day". */
const life = listDir(join(C, 'life')).filter(isImage).map((f) => {
  const name = basename(f, extname(f));
  return { file: f, caption: name.replace(/^\d+\s*-\s*/, '') };
});

/**
 * Projects: "2026 - 01 - Kalman Filter.png"
 *   year, sort order, title — the order part is optional.
 * A matching .txt may carry "link:" and "summary:" plus a body.
 * A body means the project gets its own page and a hover button.
 */
const projects = [];
for (const f of listDir(join(C, 'projects'))) {
  if (!isImage(f)) continue;
  const name = basename(f, extname(f));
  const parts = name.split(' - ').map((p) => p.trim());
  const year = parseInt(parts[0], 10);
  if (!year) { console.warn(`  skipped (no year): ${f}`); continue; }

  let order = 99, title;
  if (parts.length > 2 && /^\d+$/.test(parts[1])) {
    order = parseInt(parts[1], 10);
    title = parts.slice(2).join(' - ');
  } else {
    title = parts.slice(1).join(' - ');
  }

  const txt = join(C, 'projects', name + '.txt');
  const extra = existsSync(txt) ? parseFile(readFileSync(txt, 'utf8')) : { meta: {}, body: '' };

  projects.push({
    year, order, title,
    image: f,
    link: extra.meta.link || '',
    summary: extra.meta.summary || '',
    body: extra.body,
    slug: slug(title),
  });
}
projects.sort((a, b) => b.year - a.year || a.order - b.order || a.title.localeCompare(b.title));

/** Blog: slug.md, with slug.<img> beside it as the cover. */
const posts = listDir(join(C, 'blog')).filter((f) => f.endsWith('.md')).map((f) => {
  const name = basename(f, '.md');
  const { meta, body } = parseFile(readFileSync(join(C, 'blog', f), 'utf8'));
  const cover = listDir(join(C, 'blog')).find((g) => isImage(g) && basename(g, extname(g)) === name);
  return { slug: name, cover, body, ...meta };
});
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

/** Timeline: "when | title | where" then "- " bullets. */
const timeline = readFileSync(join(C, 'timeline.txt'), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('#')).join('\n')
  .split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  .map((block) => {
    const [head, ...rest] = block.split('\n');
    const [when, title, where] = head.split('|').map((s) => s.trim());
    return { when, title, where, points: rest.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()) };
  });

/** Testimonials: the quote, then a final "— Name, Role" line. */
const testimonials = readFileSync(join(C, 'testimonials.txt'), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('#')).join('\n')
  .split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  .map((block) => {
    const lines = block.split('\n');
    const attr = lines[lines.length - 1].replace(/^[—-]\s*/, '');
    const [who, ...role] = attr.split(',');
    return { quote: lines.slice(0, -1).join(' '), name: who.trim(), role: role.join(',').trim() };
  });

/* ── copy images ────────────────────────────────────────────── */

rmSync(IMG, { recursive: true, force: true });
mkdirSync(IMG, { recursive: true });

const out = {};   // content path -> published filename
function publish(dir, file, name) {
  const target = name + extname(file).toLowerCase();
  copyFileSync(join(C, dir, file), join(IMG, target));
  out[dir + '/' + file] = target;
  return target;
}

/* KaTeX's stylesheet and fonts, copied out of node_modules so the
   published site carries no runtime dependency on it. */
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

publishKatex();
hero.forEach((f, i) => publish('hero', f, `hero-${i + 1}`));
life.forEach((l, i) => publish('life', l.file, `life-${i + 1}`));
projects.forEach((p) => { p.out = publish('projects', p.image, `project-${p.slug}`); });
posts.forEach((p) => { if (p.cover) p.out = publish('blog', p.cover, `blog-${p.slug}`); });

/* ── shared chrome ──────────────────────────────────────────── */

const nav = (p) => `      <ul>
        <li><a href="${p}index.html#work">Work</a></li>
        <li><a href="${p}index.html#about">About</a></li>
        <li><a href="${p}timeline.html">Timeline</a></li>
        <li><a href="${p}life.html">Life</a></li>
        <li><a href="${p}blog.html">Writing</a></li>
        <li><a href="${p}index.html#testimonials">Testimonials</a></li>
        <li><a class="contact" href="mailto:${site.email}">Contact</a></li>
      </ul>`;

const header = (p) => `<header class="site-header">
  <div class="wrap">
    <a href="${p}index.html">${esc(site.name)}</a>
    <button class="nav-toggle" type="button" aria-expanded="false">Menu</button>
    <nav class="site-nav">
${nav(p)}
    </nav>
  </div>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="wrap">
    <div class="inner">
      <div class="footer-top">
        <h2 class="heading">Contact</h2>
        <a class="link" href="mailto:${site.email}">${esc(site.email)}</a>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${esc(site.name)}</p>
        <ul>
${site.github ? `          <li><a href="${site.github}">GitHub</a></li>\n` : ''}${site.linkedin ? `          <li><a href="${site.linkedin}">LinkedIn</a></li>\n` : ''}        </ul>
      </div>
    </div>
  </div>
</footer>`;

const page = ({ title, description, prefix = '', body, math = false }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${prefix}css/style.css">${math ? `\n<link rel="stylesheet" href="${prefix}css/katex.min.css">` : ''}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

${header(prefix)}

<main id="main">
${body}
</main>

${footer()}

<script src="${prefix}js/main.js"></script>
</body>
</html>
`;

const pageHead = (heading, lede) => `  <div class="page-head">
    <div class="wrap">
      <div class="inner">
        <h1 class="heading">${esc(heading)}</h1>
${lede ? `        <p class="lede">${esc(lede)}</p>\n` : ''}      </div>
    </div>
  </div>`;

/* ── index.html ─────────────────────────────────────────────── */

const years = [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a);
// Everything at or below the third-newest year is folded into one "~" bucket.
const bucketOf = (y) => (years.indexOf(y) < 2 ? String(y) : String(years[2]));
const buckets = [...new Set(projects.map((p) => bucketOf(p.year)))];

const projectCard = (p) => {
  const hasPage = Boolean(p.body);
  const href = hasPage ? `projects/${p.slug}.html` : p.link;
  const open = href && !hasPage ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `        <li class="project" data-year="${bucketOf(p.year)}">
          <a${href ? ` href="${href}"` : ''}${open}>
            <img src="${IMG}/${p.out}" alt="${esc(p.title)}">
${hasPage ? '            <span class="open">Open project</span>\n' : ''}            <span class="project-label"><h3>${esc(p.title)}</h3><span class="meta">${p.year}</span></span>
          </a>
        </li>`;
};

const indexBody = `  <!-- ── Hero ── -->
  <section class="hero" data-hero data-interval="${site.hero_interval || 6000}">
${hero.map((f, i) => `    <img src="${IMG}/${out['hero/' + f]}" alt="" data-hero-slide${i ? ' hidden' : ''}>`).join('\n')}

    <div class="hero-dots">
${hero.map((f, i) => `      <button type="button" data-hero-dot aria-current="${i === 0}" aria-label="Show image ${i + 1}"></button>`).join('\n')}
    </div>

    <div class="wrap">
      <h1 class="display">${esc(site.name)}</h1>
      <div class="hero-foot">
        <p>${esc(site.tagline)}</p>
        <p class="meta">${esc(site.location)}</p>
      </div>
    </div>
  </section>

  <!-- ── Work ── -->
  <section class="section" id="work">
    <div class="wrap">
      <div class="section-head">
        <div class="section-head-row">
          <h2 class="heading">Work</h2>
          <div class="projects-count">
            <span class="tally" data-track-tally>01 / ${String(projects.length).padStart(2, '0')}</span>
            <span class="projects-arrows">
              <button type="button" data-track-prev aria-label="Previous project">&larr;</button>
              <button type="button" data-track-next aria-label="Next project">&rarr;</button>
            </span>
          </div>
        </div>

        <div class="filters" data-filters>
          <button type="button" data-filter="all" aria-pressed="true">All</button>
${buckets.map((b, i) => `          <button type="button" data-filter="${b}" aria-pressed="false">${b}${i === buckets.length - 1 && buckets.length > 1 ? '~' : ''}</button>`).join('\n')}
        </div>
      </div>
    </div>

    <ul class="projects-track" data-track>
${projects.map(projectCard).join('\n')}
      <li class="spacer" aria-hidden="true"></li>
    </ul>
  </section>

  <!-- ── About ── -->
  <section class="section" id="about">
    <div class="wrap">
      <div class="section-head">
        <div class="section-head-row">
          <h2 class="heading">About</h2>
        </div>
      </div>

      <div class="intro-grid">
        <div class="intro-text">
${about.paragraphs.map((p) => `          <p>${esc(p)}</p>`).join('\n')}

          <ul class="stack">
${about.stack.map((s) => `            <li>${esc(s)}</li>`).join('\n')}
          </ul>

          <div class="actions">
            <a class="button" href="timeline.html">Timeline</a>
            <a class="link" href="life.html">Life gallery</a>
          </div>
        </div>

        <div class="portrait">
          <img src="${IMG}/portrait${extname(site.portrait || 'portrait.jpg')}" alt="${esc(site.name)}">
        </div>
      </div>
    </div>
  </section>

  <!-- ── Writing ── -->
  <section class="section" id="writing">
    <div class="wrap">
      <div class="section-head">
        <div class="section-head-row">
          <h2 class="heading">Writing</h2>
          <a class="link" href="blog.html">All writing</a>
        </div>
      </div>

      <div class="card-grid">
${posts.slice(0, 3).map((p) => postCard(p, '')).join('\n')}
      </div>
    </div>
  </section>

  <!-- ── Testimonials ── -->
  <section class="section" id="testimonials">
    <div class="wrap">
      <div class="section-head">
        <div class="section-head-row">
          <h2 class="heading">Testimonials</h2>
        </div>
      </div>

      <div class="card-grid">
${testimonials.map((t) => `        <figure class="quote">
          <blockquote>${esc(t.quote)}</blockquote>
          <figcaption><span class="who">${esc(t.name)}</span><span class="role">${esc(t.role)}</span></figcaption>
        </figure>`).join('\n')}
      </div>
    </div>
  </section>`;

function postCard(p, prefix) {
  return `        <article class="card">
          <a href="${prefix}blog/${p.slug}.html">
${p.out ? `            <div class="card-thumb"><img src="${prefix}${IMG}/${p.out}" alt=""></div>\n` : ''}            <p class="meta">${esc(p.date)}</p>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary || '')}</p>
          </a>
        </article>`;
}

writeFileSync('index.html', page({
  title: `${site.name} — ${site.role}`,
  description: site.tagline,
  body: indexBody,
}));

/* ── portrait ───────────────────────────────────────────────── */

const portraitFile = listDir(C).find((f) => isImage(f) && basename(f, extname(f)) === 'portrait');
if (portraitFile) {
  copyFileSync(join(C, portraitFile), join(IMG, 'portrait' + extname(portraitFile).toLowerCase()));
} else {
  console.warn('  ! no content/portrait.<jpg|png> — the About photo will 404');
}

/* ── life.html ──────────────────────────────────────────────── */

writeFileSync('life.html', page({
  title: `${lifeMeta.heading || 'Life'} — ${site.name}`,
  description: lifeMeta.lede || '',
  body: `${pageHead(lifeMeta.heading || 'Life', lifeMeta.lede)}

  <section class="section">
    <div class="wrap">
      <ul class="gallery" style="margin-top:0">
${life.map((l, i) => `        <li>
          <figure>
            <img src="${IMG}/${out['life/' + l.file]}" alt="">
            <figcaption class="caption">${esc(l.caption)}</figcaption>
          </figure>
        </li>`).join('\n')}
      </ul>
    </div>
  </section>`,
}));

/* ── timeline.html ──────────────────────────────────────────── */

writeFileSync('timeline.html', page({
  title: `Timeline — ${site.name}`,
  description: 'Where I have worked and what I did there.',
  body: `${pageHead('Timeline', 'Where I have worked and what I did there. Most recent first.')}

  <section class="section">
    <div class="wrap">
      <ol class="timeline" style="margin-top:0">
${timeline.map((t) => `        <li>
          <p class="meta when">${esc(t.when)}</p>
          <div>
            <h2>${esc(t.title)}</h2>
            <p class="where">${esc(t.where)}</p>
            <ul class="points">
${t.points.map((p) => `              <li>${esc(p)}</li>`).join('\n')}
            </ul>
          </div>
        </li>`).join('\n')}
      </ol>
    </div>
  </section>`,
}));

/* ── blog ───────────────────────────────────────────────────── */

writeFileSync('blog.html', page({
  title: `Writing — ${site.name}`,
  description: 'Notes and essays.',
  body: `${pageHead('Writing', 'Notes and essays.')}

  <section class="section">
    <div class="wrap">
      <div class="card-grid" style="margin-top:0">
${posts.map((p) => postCard(p, '')).join('\n')}
      </div>
    </div>
  </section>`,
}));

rmSync('blog', { recursive: true, force: true });
mkdirSync('blog', { recursive: true });

posts.forEach((p, i) => {
  const newer = posts[i - 1];
  const older = posts[i + 1];
  usesMath = false;
  writeFileSync(join('blog', p.slug + '.html'), page({
    title: `${p.title} — ${site.name}`,
    description: p.summary || '',
    prefix: '../',
    get math() { return usesMath; },
    body: `  <article class="post">
    <div class="wrap">
      <a href="../blog.html">&larr; Writing</a>

      <header class="post-header">
        <p class="meta">${esc(p.date)}${p.tags ? ' / ' + esc(p.tags) : ''}</p>
        <h1>${esc(p.title)}</h1>
${p.summary ? `        <p class="lede">${esc(p.summary)}</p>\n` : ''}      </header>

${p.out ? `      <div class="post-cover">
        <img src="../${IMG}/${p.out}" alt="">
      </div>\n` : ''}
      <div class="post-body">
${markdown(p.body)}
      </div>

      <nav class="post-nav">
${newer ? `        <a class="prev" href="${newer.slug}.html"><span class="meta">Newer</span><span class="title">${esc(newer.title)}</span></a>\n` : '        <span></span>\n'}${older ? `        <a class="next" href="${older.slug}.html"><span class="meta">Older</span><span class="title">${esc(older.title)}</span></a>\n` : ''}      </nav>
    </div>
  </article>`,
  }));
});

/* ── project pages ──────────────────────────────────────────── */

rmSync('projects', { recursive: true, force: true });
mkdirSync('projects', { recursive: true });

const withPages = projects.filter((p) => p.body);
withPages.forEach((p, i) => {
  const prev = withPages[i - 1];
  const next = withPages[i + 1];
  usesMath = false;
  writeFileSync(join('projects', p.slug + '.html'), page({
    title: `${p.title} — ${site.name}`,
    description: p.summary || '',
    prefix: '../',
    get math() { return usesMath; },
    body: `  <article class="post">
    <div class="wrap">
      <a href="../index.html#work">&larr; Work</a>

      <header class="post-header">
        <p class="meta">${p.year}</p>
        <h1>${esc(p.title)}</h1>
${p.summary ? `        <p class="lede">${esc(p.summary)}</p>\n` : ''}      </header>

      <div class="post-cover">
        <img src="../${IMG}/${p.out}" alt="">
      </div>

      <div class="post-body">
${markdown(p.body)}
      </div>

      <nav class="post-nav">
${prev ? `        <a class="prev" href="${prev.slug}.html"><span class="meta">Previous</span><span class="title">${esc(prev.title)}</span></a>\n` : '        <span></span>\n'}${next ? `        <a class="next" href="${next.slug}.html"><span class="meta">Next</span><span class="title">${esc(next.title)}</span></a>\n` : ''}      </nav>
    </div>
  </article>`,
  }));
});

console.log(`Built:
  ${projects.length} projects (${withPages.length} with their own page)
  ${posts.length} blog posts
  ${timeline.length} timeline entries
  ${life.length} gallery photos
  ${testimonials.length} testimonials
  ${hero.length} hero images`);
