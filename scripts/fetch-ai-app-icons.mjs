#!/usr/bin/env node
/**
 * Fetch full-color brand logos into assets/icons/ai-apps/
 * Sources: @lobehub/icons-static-svg color variants, official brand CDNs, Simple Icons, Wikimedia Commons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../assets/icons/ai-apps');
const LOBE_CDN = 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons';
const SIMPLE_ICONS = 'https://cdn.simpleicons.org';

/** Manually maintained icons — skipped on fetch and preserved during cleanup */
const MANUAL_ICONS = new Set(['chatgpt.png', 'midjourney.png']);

const GOOGLE_FAVICON = (domain, size = 128) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;

/** @type {Array<{ out: string, source: string, kind: 'url'|'inline', url?: string, svg?: string, monochrome?: boolean }>} */
const ICONS = [
  {
    out: 'google.png',
    source: 'Google official (googleg_standard_color_128dp)',
    kind: 'url',
    url: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
  },
  {
    out: 'gemini.svg',
    source: 'LobeHub Icons (gemini-color.svg)',
    kind: 'url',
    url: `${LOBE_CDN}/gemini-color.svg`,
  },
  {
    out: 'perplexity.svg',
    source: 'Simple Icons (white Perplexity for black tile)',
    kind: 'url',
    url: `${SIMPLE_ICONS}/perplexity/ffffff`,
    monochrome: true,
  },
  {
    out: 'claude.svg',
    source: 'LobeHub Icons (claude-color.svg)',
    kind: 'url',
    url: `${LOBE_CDN}/claude-color.svg`,
  },
  {
    out: 'behance.svg',
    source: 'Simple Icons (white Behance for brand-blue tile)',
    kind: 'url',
    url: `${SIMPLE_ICONS}/behance/ffffff`,
    monochrome: true,
  },
  {
    out: 'pinterest.svg',
    source: 'Simple Icons (Pinterest brand red)',
    kind: 'url',
    url: `${SIMPLE_ICONS}/pinterest/E60023`,
  },
  {
    out: 'krea.svg',
    source: 'LobeHub Icons (krea.svg, black mark)',
    kind: 'url',
    url: `${LOBE_CDN}/krea.svg`,
    monochrome: true,
  },
  {
    out: 'higgsfield.png',
    source: 'Higgsfield official (higgsfield.ai/icon.png)',
    kind: 'url',
    url: 'https://higgsfield.ai/icon.png',
  },
  {
    out: 'suno.svg',
    source: 'Simple Icons (white Suno for black tile)',
    kind: 'url',
    url: `${SIMPLE_ICONS}/suno/ffffff`,
    monochrome: true,
  },
  {
    out: 'magnific.png',
    source: 'Magnific (magnific.ai favicon via Google)',
    kind: 'url',
    url: GOOGLE_FAVICON('magnific.ai'),
  },
  {
    out: 'kling.ico',
    source: 'Kling official (klingai.com favicon)',
    kind: 'url',
    url: 'https://klingai.com/favicon.ico',
  },
  {
    out: 'mesh-ai.png',
    source: 'Meshy official (www.meshy.ai favicon)',
    kind: 'url',
    url: 'https://www.meshy.ai/favicon.ico',
  },
];

function fetchUrl(url, redirectCount = 0) {
  const MAX_REDIRECTS = 5;
  const TIMEOUT_MS = 20000;
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 LAYV-icon-fetch' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error(`Too many redirects for ${url}`));
            res.resume();
            return;
          }
          const next = new URL(res.headers.location, url).href;
          if (next === url) {
            reject(new Error(`Redirect loop for ${url}`));
            res.resume();
            return;
          }
          res.resume();
          fetchUrl(next, redirectCount + 1).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      },
    );
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout for ${url}`));
    });
    req.on('error', reject);
  });
}

function normalizeSvg(svg) {
  let out = svg.trim();
  if (!out.includes('xmlns=')) {
    out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  out = out
    .replace(/\sheight="1em"/g, '')
    .replace(/\swidth="1em"/g, '')
    .replace(/\sstyle="flex:none;line-height:1"/g, '');
  return out;
}

/** Reject monochrome SVGs (single currentColor / black fill only). */
function assertColorSvg(svg, file) {
  const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const styleFills = [...svg.matchAll(/fill:\s*(#[0-9a-f]{3,8})/gi)].map((m) => m[1].toLowerCase());
  const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const gradients = [...svg.matchAll(/fill="url\(#/g)];
  const hexes = [...svg.matchAll(/#[0-9a-f]{3,8}/gi)].map((m) => m[0].toLowerCase());

  const neutral = new Set(['none', 'currentcolor', '#000', '#000000', 'black', '#fff', '#ffffff', 'white']);
  const meaningfulFills = fills.filter((f) => !neutral.has(f));
  const meaningfulStyleFills = styleFills.filter((f) => !neutral.has(f));
  const meaningfulStops = stops.filter((s) => s !== 'currentcolor');
  const meaningfulHexes = hexes.filter((h) => !neutral.has(h));

  const isColor =
    meaningfulFills.length > 0 ||
    meaningfulStyleFills.length > 0 ||
    meaningfulStops.length > 0 ||
    gradients.length > 0 ||
    meaningfulHexes.length > 0;

  if (!isColor) {
    throw new Error(`${file}: SVG looks monochrome (no brand colors detected)`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const f of fs.readdirSync(OUT_DIR)) {
    if (MANUAL_ICONS.has(f)) continue;
    fs.unlinkSync(path.join(OUT_DIR, f));
  }

  for (const icon of ICONS) {
    const dest = path.join(OUT_DIR, icon.out);
    let data;
    if (icon.kind === 'url') {
      data = await fetchUrl(icon.url);
      if (icon.out.endsWith('.svg')) {
        const normalized = normalizeSvg(data.toString('utf8'));
        if (!icon.monochrome) {
          assertColorSvg(normalized, icon.out);
        }
        data = Buffer.from(normalized, 'utf8');
      }
    } else {
      data = Buffer.from(icon.svg, 'utf8');
      if (!icon.monochrome) {
        assertColorSvg(icon.svg, icon.out);
      }
    }
    fs.writeFileSync(dest, data);
    console.log(`✓ ${icon.out} ← ${icon.source}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
