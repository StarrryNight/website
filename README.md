# Personal Portfolio

Plain HTML, CSS and JavaScript. No frameworks, no dependencies. The published
site is static files — nothing on it needs Node to run.

**To change the site you edit `content/`, then run one command:**

```bash
npm install     # once only - pulls in KaTeX, used at build time
node build.mjs
```

That regenerates `index.html`, `life.html`, `timeline.html`, `blog.html`,
`blog/*.html`, `projects/*.html` and the whole `images/` folder.
Do not hand-edit those — they get overwritten. Edit `content/` instead.

To preview: `python3 -m http.server 8080`, then open http://localhost:8080

---

## The content folder

```
content/
  site.txt            your name, tagline, location, email, social links
  about.txt           the About paragraphs and the tech list
  portrait.jpg        your face, shown in About
  timeline.txt        work history
  testimonials.txt    quotes
  life.txt            the Life page heading and intro line

  hero/               drop hero images here
  life/               drop gallery photos here
  projects/           drop project images (+ optional .txt) here
  blog/               drop .md posts (+ a cover image) here
```

### Adding a project

Drop an image into `content/projects/` named:

```
2026 - 01 - Kalman Filter for Ball Estimation.png
 ↑      ↑    ↑
 year   order (optional)   title
```

The year drives the filter buttons. The order number sorts projects within a
year — leave it out and it sorts last. Run `node build.mjs` and it appears.

**To make the card link somewhere,** add a text file with the same name:

```
content/projects/2026 - 01 - Kalman Filter for Ball Estimation.txt
```
```
link: https://github.com/you/repo
```

**To give the project its own page** (and the "Open project" button that
appears on hover), put a summary and a body in that same file:

```
summary: One line that sits under the title.

## The problem

Write in markdown. Headings, - bullets, 1. numbered lists,
**bold**, > quotes and [links](https://example.com) all work.
```

A project with a body gets a page. One with only a `link:` opens that link.
One with neither is just an image.

### Adding a gallery photo

Drop it into `content/life/`. The filename becomes the caption:

```
09 - Match day.jpg   →   caption "Match day"
Match day.jpg        →   caption "Match day"
```

The leading number only controls the order and is stripped from the caption.

### Adding a blog post

Put `my-post.md` in `content/blog/`, and optionally an image with the same
name (`my-post.jpg`) to use as the cover:

```
title: My post title
date: 14 August 2026
tags: Process, Design
summary: One sentence shown on the cards.

Write the body in markdown.
```

Posts sort by date, newest first. Newer/older links are generated.

### Hero images

Drop them into `content/hero/`. They cycle in filename order, so name them
`01.jpg`, `02.jpg` and so on. Change the timing with `hero_interval` in
`site.txt`.

### Timeline and testimonials

`content/timeline.txt` — one role per block, blank line between blocks:

```
2026 — now | Machine Learning Researcher | de Boer Lab
- A bullet point.
- Another one.
```

`content/testimonials.txt` — the quote, then the attribution:

```
The quote text goes here.
— Ada Whitfield, Product Lead, Northwind
```

---

## Markdown and LaTeX

Blog posts and project pages are Markdown. Paste it in and rebuild.

```
# ## ###          headings
- item            bullets
1. item           numbered
> quote           blockquote
**bold** *italic* `code`
[text](url)       link
![alt](file.png)  image
---               rule

| a | b |         table - the |---| row is required
| --- | --- |
| 1 | 2 |
```

Fenced code blocks work too, with an optional language after the opening fence.

### LaTeX

`$inline$` and `$$display$$`:

```
The state is $x_k = [p_x, p_y, v_x, v_y]^T$, and the gain is

$$K_k = P H^T (H P H^T + R)^{-1}$$
```

Maths is rendered by **KaTeX at build time**, so the published page contains
finished markup. No JavaScript runs in the browser to draw it, and it works
offline and with JS turned off. `css/katex.min.css` and `css/fonts/` are copied
out of `node_modules` by the build, and are linked only on pages that actually
contain maths.

Write a literal dollar sign as `\$`. If KaTeX cannot parse a formula, the build
prints a warning and that one formula falls back to inline code instead of
failing the build.

## Design

All of it is in `css/style.css`, organised by section, with colour and spacing
custom properties at the top. `js/main.js` has three behaviours and nothing
else: the mobile menu, the hero image swap, and the project filter/arrows.

Monochrome. System font stack, so no webfont request. No animation anywhere —
the hero swaps images outright, the strip jumps rather than glides, and
nothing fades in on scroll. The hero holds still under `prefers-reduced-motion`
and pauses while the tab is in the background.

## Still placeholders

- **Hero images** and **blog covers** — generated greyscale SVGs.
- **The four blog posts** — invented.
- **The three testimonials** — invented. Do not publish these as-is.
- **The three 2026 project pages** — scaffolds with headings to fill in.
- **The eight gallery photos and their captions** — invented.

`node gen-placeholders.mjs` regenerates the greyscale placeholders if you want
different ones. It is the only other file that needs Node.

## Publishing

It's static — any host works. Run `node build.mjs` first, then drag the folder
onto Netlify, push to GitHub Pages, or run `npx vercel`.
