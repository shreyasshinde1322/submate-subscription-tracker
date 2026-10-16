// Generates local marks for the service catalog. Use Simple Icons where a
// brand symbol is available, with a bundled branded monogram for other entries.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as simpleIcons from 'simple-icons';
import { CATALOG } from '../server/catalog/services.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'logos');
const ICON_ALIASES = {
  'apple-music': 'siApplemusic',
  'playstation-plus': 'siPlaystation',
  'github-copilot': 'siGithubcopilot',
  'github-pro': 'siGithub',
  'duolingo-super': 'siDuolingo',
  'youtube-premium': 'siYoutube',
  'youtube-music': 'siYoutubemusic',
  'apple-tv-plus': 'siAppletv',
  '1password': 'si1password',
  nyt: 'siNewyorktimes',
  'washington-post': 'siThewashingtonpost',
};

function simpleIconFor(entry) {
  const exportName = ICON_ALIASES[entry.key] || `si${entry.key.split(/[^a-z0-9]/i).map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join('')}`;
  return simpleIcons[exportName] || null;
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function svgFor(entry) {
  const icon = simpleIconFor(entry);
  if (icon) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${entry.name}">
  <rect x="1" y="1" width="62" height="62" rx="17" fill="#ffffff" stroke="#ece9e2" stroke-width="2"/>
  <g transform="translate(13 13) scale(1.58)"><path fill="#${icon.hex}" d="${icon.path}"/></g>
</svg>
`;
  }
  const textColor = luminance(entry.color) > 0.55 ? '#20242b' : '#ffffff';
  const label = String(entry.mark || entry.name.slice(0, 2)).slice(0, 2);
  const fontSize = label.length > 1 ? 24 : 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${entry.name}">
  <rect x="1" y="1" width="62" height="62" rx="17" fill="${entry.color}" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>
  <text x="32" y="33" fill="${textColor}" font-family="Manrope, DM Sans, Segoe UI, sans-serif" font-size="${fontSize}" font-weight="800" text-anchor="middle" dominant-baseline="central">${label}</text>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });

let brandedCount = 0;
for (const entry of CATALOG) {
  writeFileSync(join(outDir, `${entry.logoKey}.svg`), svgFor(entry), 'utf8');
  if (simpleIconFor(entry)) brandedCount += 1;
}

const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Subscription">
  <rect x="1" y="1" width="62" height="62" rx="17" fill="#8b8a83" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>
  <text x="32" y="33" fill="#ffffff" font-family="Manrope, DM Sans, Segoe UI, sans-serif" font-size="30" font-weight="800" text-anchor="middle" dominant-baseline="central">?</text>
</svg>
`;
writeFileSync(join(outDir, '_fallback.svg'), fallback, 'utf8');

console.log(`Generated ${CATALOG.length} local service marks (${brandedCount} Simple Icons brand paths) plus _fallback.svg in public/logos`);
