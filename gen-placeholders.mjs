/**
 * Generates the placeholder SVGs in /public/images.
 * Rerun with `node scripts/gen-placeholders.mjs` after changing the recipes below.
 * To use a real photo, just drop it in with the same base name and update the
 * path in content/site.ts (e.g. '/images/hero-1.jpg').
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'images');
mkdirSync(OUT, { recursive: true });

// Greyscale only — the site is monochrome, and coloured placeholders
// make an unfinished template look like a brochure.
const palettes = [
  ['#171718', '#3A3A3C', '#6E6E72'],
  ['#1F1F21', '#4A4A4D', '#87878B'],
  ['#141415', '#2E2E30', '#5B5B5F'],
  ['#232325', '#535356', '#94949A'],
  ['#191919', '#414143', '#787880'],
  ['#101011', '#333335', '#666669'],
];

const rand = (seed) => {
  let s = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0) * 31, 7);
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
};

/** Soft gradient field with drifting blobs and a grain overlay. */
function scene({ w, h, seed, palette, label }) {
  const r = rand(seed);
  const [a, b, c] = palette;
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const cx = Math.round(r() * w);
    const cy = Math.round(r() * h);
    const rr = Math.round((0.18 + r() * 0.3) * Math.min(w, h));
    const fill = [b, c, a][i % 3];
    return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${fill}" opacity="${(0.2 + r() * 0.35).toFixed(2)}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g-${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="60%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
    <filter id="blur-${seed}"><feGaussianBlur stdDeviation="${Math.round(Math.min(w, h) / 9)}"/></filter>
    <filter id="grain-${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.09"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g-${seed})"/>
  <g filter="url(#blur-${seed})">${blobs}</g>
  <rect width="${w}" height="${h}" filter="url(#grain-${seed})" opacity="0.5"/>
</svg>`;
}

/** Head-and-shoulders silhouette, for the portrait and testimonial avatars. */
function portrait({ size, seed, palette, label }) {
  const [a, b, c] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 100 125" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="p-${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="125" fill="url(#p-${seed})"/>
  <circle cx="50" cy="48" r="21" fill="${c}" opacity="0.85"/>
  <path d="M12 125 C12 92 30 78 50 78 C70 78 88 92 88 125 Z" fill="${c}" opacity="0.85"/>
</svg>`;
}

const files = [];
const write = (name, svg) => {
  writeFileSync(join(OUT, name), svg);
  files.push(name);
};

// Hero — full-bleed, rotates
for (let i = 1; i <= 4; i++) {
  write(`hero-${i}.svg`, scene({ w: 1920, h: 1200, seed: `hero${i}`, palette: palettes[(i - 1) % palettes.length], label: `Hero image ${i}` }));
}

// Blog covers — landscape
for (let i = 1; i <= 4; i++) {
  write(`blog-${i}.svg`, scene({ w: 1600, h: 1200, seed: `blog${i}`, palette: palettes[(i + 2) % palettes.length], label: `Blog cover ${i}` }));
}

// 2026 projects — swap these for real screenshots
write('kalman.svg', scene({ w: 1600, h: 1200, seed: 'kalman', palette: palettes[1], label: 'Kalman filter project' }));
write('rover.svg', scene({ w: 1600, h: 1200, seed: 'rover', palette: palettes[3], label: 'Mars rover project' }));
write('imu.svg', scene({ w: 1600, h: 1200, seed: 'imu', palette: palettes[5], label: 'IMU integration project' }));

// Life gallery
for (let i = 1; i <= 8; i++) {
  write(`life-${i}.svg`, scene({ w: 1200, h: 900, seed: `life${i}`, palette: palettes[i % palettes.length], label: `Life photo ${i}` }));
}

console.log(`Wrote ${files.length} files to public/images:\n  ${files.join('\n  ')}`);
