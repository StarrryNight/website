# Personal Portfolio

Live at **https://lausingsamuel.com**

Plain HTML, CSS and JavaScript. No framework. The published site is static files;
nothing on it needs Node to run. Node is only used to generate it.

**To change the site you edit `content/`, then run one command:**

```bash
npm install     # once only - pulls in KaTeX, used at build time
node build.mjs
```

That regenerates `index.html`, `blog.html`, `timeline.html`, `life.html`,
`404.html`, `blog/*.html`, `projects/*.html` and the whole `images/` folder.
**Do not hand-edit those, they get overwritten.** Edit `content/` instead.

Preview with `python3 -m http.server 8080`, then open http://localhost:8080

Deploy with `vercel --prod`. Vercel runs the build itself, but building locally
first lets you check it before it goes public.

`css/style.css` and `js/main.js` are **not** generated. Edit them directly and
just refresh; they carry a `?v=` cache stamp so you never get a stale copy.

---

## The content folder

```
content/
  site.txt            name, tagline, location, email, socials, resume link
  about.txt           About paragraphs, tech list, education, "looking for"
  portrait.jpg        your face, shown in About
  timeline.txt        work history and education
  life.txt            the Life page heading and intro line
  testimonials.txt    quotes (currently .off, so the section is hidden)

  hero/               hero images, shown in filename order
  life/               gallery photos, filename becomes the caption
  projects/           project image + optional .txt
  blog/               .md posts + a cover image each
  media/              anything embedded in a body (images, video)
```

### Adding a project

Drop an image into `content/projects/` named:

```
2026 - 04 - Project Name.png
 |     |     |
 |     |     the title, and the page URL
 |     sort order within the year (lower is first)
 year, drives which filter bucket it lands in
```

Add a `.txt` beside it with the same stem for anything more:

```
summary: One line, shown under the title on the project page.
category: Robotics, Machine Learning        # one or more, comma separated
link: https://...                           # live demo, shown as "Visit project"
source: https://...                         # repo or PR, shown as "Source"
status: Ongoing                             # optional, shows a pulsing badge
crop: center 30%                            # optional, overrides the card crop

Body starts here, in markdown. A project with a body gets its own page and a
hover button on its card. Summary only means it stays a plain card.
```

### Adding a gallery photo

Filename is the caption:

```
content/life/07 - Won ramen.jpg   ->   caption "Won ramen"
```

### Adding a blog post

```
content/blog/my-post.md          the post
content/blog/my-post.png         its cover, same stem
```

```
title: My Post
date: 14 August 2026
tags: Robotics, State Estimation
summary: One line, shown on the card.

Body in markdown.
```

The filename is the URL, so `discrete_filters.md` becomes
`/blog/discrete_filters.html`. Posts sort by date, newest first.

### Hero images

`content/hero/`, in filename order. Add or remove one and the dots follow. The
rotation speed is `hero_interval` in `site.txt`, in milliseconds.

Crops are per position, in `css/style.css`:

```css
.hero img:nth-of-type(1) { object-position: center 65%; }
```

Higher percentage moves the photo down in the frame, lower moves it up. These
target **positions, not files**, so reordering the hero means moving the rules.

### Timeline and testimonials

`timeline.txt`, one role per block:

```
Sep 2025 — now | Software Lead | UBC Thunderbots
- A bullet.
- Another bullet.
```

`testimonials.txt` works the same way. It is currently renamed
`testimonials.txt.off`, which hides the section and its nav link entirely.
Rename it back to bring it in.

---

## Markdown and LaTeX

Blog posts and project bodies are markdown:

```
# ## ###          headings
- item            bullets, indent for a nested list
1. item           numbered
> quote           blockquote
**bold** *italic* `code`
[text](url)       link
![alt](file.png)  image or video from content/media/
---               rule

| a | b |         table, the |---| row is required
| --- | --- |
| 1 | 2 |
```

Fenced code blocks work, with an optional language after the fence.

About paragraphs are plain text, but `[text](url)` works there too so a sentence
can carry a link.

### Video

Drop the file in `content/media/`, embed it like an image:

```
![Caption](demo.mp4)
```

`.mp4`, `.webm`, `.mov` and `.m4v` are accepted, but **`.mov` will not play in
most browsers**. Convert first:

```bash
ffmpeg -i in.mov -c:v libx264 -crf 23 out.mp4
```

### LaTeX

`$inline$` and `$$display$$`:

```
The state is $x_k = [p_x, p_y, v_x, v_y]^T$, and the gain is

$$K_k = P H^T (H P H^T + R)^{-1}$$
```

Rendered by **KaTeX at build time**, so the published page contains finished
markup. No JavaScript draws it in the browser, and it works offline and with JS
off. `css/katex.min.css` and `css/fonts/` are copied out of `node_modules` by the
build and only linked on pages that actually contain maths.

Write a literal dollar sign as `\$`. If KaTeX cannot parse a formula the build
warns and that one formula falls back to inline code rather than failing.

---

## Design

Monochrome, one typeface (IBM Plex Sans, self-hosted in `css/fonts/`, no external
request). Motion is deliberately small: a hero crossfade, hover transitions, and
sections settling in once as you scroll. All of it disabled under
`prefers-reduced-motion`.

Favicon is a gear: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`.

---

## Still placeholders

- `content/blog/discrete_filters.md` is a stub, and its cover
  `discrete_filters.svg` is the last generated image on the site.
- Six projects have no body, so no page: Tabs Closer, Acne Detector, Underwater
  Claw, Rage Detector, FPL Predictor, F.U.R.I.N.A.
- No `og:` or `twitter:` meta tags, and no `url` in `site.txt`, so a shared link
  has no preview card.
- No `robots.txt` or `sitemap.xml`.

---

## Publishing

```bash
node build.mjs && vercel --prod
```

`vercel.json` pins `framework: null` and `outputDirectory: "."`. Without it Vercel
uses the project's stale Next.js preset, builds fine, then fails looking for a
`.next` directory.
