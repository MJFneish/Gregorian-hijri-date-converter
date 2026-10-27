#!/usr/bin/env node
/**
 * Generates the launcher icons (Android legacy + adaptive + monochrome, iOS 1024), the iOS launch
 * logo and the brand SVGs (android/scripts/brand/) from one emblem definition. Original artwork — a gold crescent (Hijri)
 * holding a small sun (Gregorian), circled by two conversion arrows on a night-indigo tile.
 *
 * Usage (in android/):  yarn generate:icons
 *
 * The emblem geometry mirrors the apps' AppLogo (android ui/brand/AppLogo.kt, ios
 * HijriConverter/Views/AppLogo.swift) — keep all three in sync. Android's splash icon
 * (res/drawable-<density>/splash_logo.png, a 288 dp canvas with the 120 dp emblem) was rendered from
 * brand/splash-logo.svg.
 */
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..', '..');
const brandDir = path.join(__dirname, 'brand');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');
const assetsDir = path.join(root, 'ios', 'HijriConverter', 'Assets.xcassets');
const iosIconDir = path.join(assetsDir, 'AppIcon.appiconset');
const launchLogoDir = path.join(assetsDir, 'LaunchLogo.imageset');

const GOLD = '#F2C468';
const GOLD_LIGHT = '#FFE3A3';
const MOONLIGHT = '#E9E5FF';
const TILE_FROM = '#2B1F7A';
const TILE_TO = '#5A47D6';

// --- emblem geometry (100x100 viewBox) — same numbers as AppLogo.tsx ---
const CRESCENT_PATH = 'M50.13 20 A30 30 0 1 0 77.75 61.42 A25 25 0 1 1 50.13 20 Z';
const SUN = { cx: 68, cy: 38, r: 6.5, rayFrom: 9.5, rayTo: 13 };
const ARROW_RADIUS = 44;

function polar(deg, r = ARROW_RADIUS) {
  const a = (deg * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}
function arrowArc(fromDeg, toDeg) {
  const p0 = polar(fromDeg);
  const p1 = polar(toDeg);
  const arc = `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${ARROW_RADIUS} ${ARROW_RADIUS} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  const a = (toDeg * Math.PI) / 180;
  const t = { x: -Math.sin(a), y: Math.cos(a) };
  const len = 7;
  const spread = (32 * Math.PI) / 180;
  const back = rot => ({
    x: p1.x - len * (t.x * Math.cos(rot) - t.y * Math.sin(rot)),
    y: p1.y - len * (t.x * Math.sin(rot) + t.y * Math.cos(rot)),
  });
  const l = back(spread);
  const r = back(-spread);
  const head = `M${l.x.toFixed(2)} ${l.y.toFixed(2)} L${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L${r.x.toFixed(2)} ${r.y.toFixed(2)}`;
  return { arc, head };
}
const ARROWS = [arrowArc(205, 290), arrowArc(25, 110)];

/** Emblem markup. `mono` = single flat color (Android 13 themed icon). */
function emblem({ mono = null } = {}) {
  const crescentFill = mono ?? 'url(#gold)';
  const light = mono ?? MOONLIGHT;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = SUN.cx + SUN.rayFrom * Math.cos(a);
    const y1 = SUN.cy + SUN.rayFrom * Math.sin(a);
    const x2 = SUN.cx + SUN.rayTo * Math.cos(a);
    const y2 = SUN.cy + SUN.rayTo * Math.sin(a);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${light}" stroke-width="2.2" stroke-linecap="round"/>`;
  }).join('');
  const arrows = ARROWS.map(
    a =>
      `<path d="${a.arc}" stroke="${light}" stroke-opacity="0.92" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
      `<path d="${a.head}" stroke="${light}" stroke-opacity="0.92" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ).join('');
  return `<path d="${CRESCENT_PATH}" fill="${crescentFill}"/><circle cx="${SUN.cx}" cy="${SUN.cy}" r="${SUN.r}" fill="${light}"/>${rays}${arrows}`;
}

const defs = `<defs>
  <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TILE_FROM}"/><stop offset="1" stop-color="${TILE_TO}"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#7A68F0" stop-opacity="0.55"/><stop offset="1" stop-color="#7A68F0" stop-opacity="0"/></radialGradient>
</defs>`;

const svg = (body, { size = 100 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${defs}${body}</svg>`;

const tileBg = shape =>
  shape === 'circle'
    ? `<circle cx="50" cy="50" r="50" fill="url(#tile)"/><circle cx="50" cy="50" r="50" fill="url(#glow)"/>`
    : shape === 'square'
      ? `<rect width="100" height="100" fill="url(#tile)"/><rect width="100" height="100" fill="url(#glow)"/>`
      : `<rect width="100" height="100" rx="22" fill="url(#tile)"/><rect width="100" height="100" rx="22" fill="url(#glow)"/>`;

const SOURCES = {
  // Legacy launcher icons: emblem at 68% on a rounded / circular tile.
  legacy: svg(`${tileBg('rounded')}<g transform="translate(16 16) scale(0.68)">${emblem()}</g>`),
  legacyRound: svg(`${tileBg('circle')}<g transform="translate(16 16) scale(0.68)">${emblem()}</g>`),
  // Adaptive icon layers (108dp canvas; the launcher masks to ~72dp, so keep the emblem in the
  // central 66% safe zone).
  adaptiveBackground: svg(tileBg('square')),
  adaptiveForeground: svg(`<g transform="translate(19 19) scale(0.62)">${emblem()}</g>`),
  adaptiveMonochrome: svg(`<g transform="translate(19 19) scale(0.62)">${emblem({ mono: '#FFFFFF' })}</g>`),
  // iOS: full-bleed square (iOS applies its own mask), no transparency allowed.
  ios: svg(`${tileBg('square')}<g transform="translate(15 15) scale(0.7)">${emblem()}</g>`),
  // Native splash logo: emblem alone (the splash background is the brand night color).
  splash: svg(emblem()),
};

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function png(svgString, size, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svgString), { density: Math.max(72, (72 * size) / 100) })
    .resize(size, size)
    .png()
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(brandDir, { recursive: true });
  fs.writeFileSync(path.join(brandDir, 'icon.svg'), SOURCES.legacy);
  fs.writeFileSync(path.join(brandDir, 'icon-ios.svg'), SOURCES.ios);
  fs.writeFileSync(path.join(brandDir, 'icon-foreground.svg'), SOURCES.adaptiveForeground);
  fs.writeFileSync(path.join(brandDir, 'icon-background.svg'), SOURCES.adaptiveBackground);
  fs.writeFileSync(path.join(brandDir, 'icon-monochrome.svg'), SOURCES.adaptiveMonochrome);
  fs.writeFileSync(path.join(brandDir, 'splash-logo.svg'), SOURCES.splash);

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    await png(SOURCES.legacy, 48 * scale, path.join(dir, 'ic_launcher.png'));
    await png(SOURCES.legacyRound, 48 * scale, path.join(dir, 'ic_launcher_round.png'));
    await png(SOURCES.adaptiveBackground, 108 * scale, path.join(dir, 'ic_launcher_background.png'));
    await png(SOURCES.adaptiveForeground, 108 * scale, path.join(dir, 'ic_launcher_foreground.png'));
    await png(SOURCES.adaptiveMonochrome, 108 * scale, path.join(dir, 'ic_launcher_monochrome.png'));
  }

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
  const anydpi = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);

  // iOS: single 1024 universal icon (Xcode 14+ derives every size from it).
  fs.mkdirSync(iosIconDir, { recursive: true });
  await sharp(Buffer.from(SOURCES.ios), { density: 740 }).resize(1024, 1024).flatten({ background: TILE_FROM }).png().toFile(path.join(iosIconDir, 'icon-1024.png'));
  fs.writeFileSync(
    path.join(iosIconDir, 'Contents.json'),
    JSON.stringify(
      {
        images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n',
  );

  // iOS launch screen: the 120 pt emblem on the night colour (LaunchBackground), like Android's splash.
  for (const scale of [1, 2, 3]) {
    await png(SOURCES.splash, 120 * scale, path.join(launchLogoDir, `launch-logo@${scale}x.png`));
  }
  fs.writeFileSync(
    path.join(launchLogoDir, 'Contents.json'),
    JSON.stringify(
      {
        images: [1, 2, 3].map(scale => ({ filename: `launch-logo@${scale}x.png`, idiom: 'universal', scale: `${scale}x` })),
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n',
  );

  // A large preview for docs / store listing drafts.
  await png(SOURCES.legacy, 512, path.join(brandDir, 'icon-512.png'));
  console.log('icons generated');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
