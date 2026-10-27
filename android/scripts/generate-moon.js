#!/usr/bin/env node
/**
 * Renders the full-moon texture behind the converter's moon-phase disc (Android
 * res/drawable-{mdpi,xhdpi,xxhdpi}/moon_texture.png, iOS Assets.xcassets/MoonTexture @1x–@3x) from
 * NASA's Lunar Reconnaissance Orbiter colour mosaic — the CGI Moon Kit's `lroc_color_2k.jpg`
 * (android/scripts/data/, public domain; credit: NASA's Scientific Visualization
 * Studio, https://svs.gsfc.nasa.gov/4720). The equirectangular map is projected orthographically
 * onto the near side as seen from Earth: north up, Mare Crisium near the right limb, Tycho low in
 * the middle.
 *
 * No phase is baked in. The app shades the night side at runtime for the exact day
 * (MoonDisc in each app), so one texture serves every day of the month.
 *
 * Usage (in android/):  yarn generate:moon
 */
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(__dirname, 'data', 'lroc_color_2k.jpg');
const ANDROID_RES = path.join(root, 'android', 'app', 'src', 'main', 'res');
const ANDROID_DENSITY = { 1: 'mdpi', 2: 'xhdpi', 3: 'xxhdpi' };
const IOS_IMAGESET = path.join(root, 'ios', 'HijriConverter', 'Assets.xcassets', 'MoonTexture.imageset');

/** Disc diameter at @1x in px — MoonDisc's default `size` (dp), so each density gets exact pixels. */
const BASE_SIZE = 96;
const SCALES = [1, 2, 3];
/** Sub-samples per pixel along each axis: area-averages the 2k map and anti-aliases the limb. */
const SUPERSAMPLE = 4;

// Tone: the mosaic is a flat albedo map, i.e. already what a full moon looks like. These only
// nudge it toward how the Moon reads in photos and weather apps.
/** Fraction of the map's own colour kept (its maria tints are exaggerated at this size). */
const SATURATION = 0.35;
/** > 1 deepens the maria against the highlands. */
const GAMMA = 1.18;
/** The 99.5th-percentile brightness maps to this (keeps the bright ray craters from clipping). */
const WHITE_POINT = 0.96;
/** Faint warm cast of moonlight. */
const TINT = [1.0, 0.985, 0.94];
/** Brightness at the limb relative to the centre — a hint of volume (the real Moon is nearly flat). */
const LIMB = 0.88;

async function loadMap() {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Bilinear sample of the equirectangular map at (lon, lat) in radians → [r, g, b] in 0–1. */
function sampleMap(map, lon, lat, out) {
  const { data, width, height } = map;
  const u = ((lon / Math.PI + 1) / 2) * width - 0.5;
  const v = (0.5 - lat / Math.PI) * height - 0.5;
  const x0 = Math.floor(u);
  const y0 = Math.max(0, Math.min(height - 2, Math.floor(v)));
  const fx = u - x0;
  const fy = Math.max(0, Math.min(1, v - y0));
  const xa = ((x0 % width) + width) % width;
  const xb = (xa + 1) % width;
  for (let c = 0; c < 3; c++) {
    const p = (x, y) => data[(y * width + x) * 3 + c];
    const top = p(xa, y0) * (1 - fx) + p(xb, y0) * fx;
    const bottom = p(xa, y0 + 1) * (1 - fx) + p(xb, y0 + 1) * fx;
    out[c] = (top * (1 - fy) + bottom * fy) / 255;
  }
}

/** Projects the near side into a size×size RGBA float buffer (colour + coverage). */
function project(map, size) {
  const pixels = new Float32Array(size * size * 4);
  const half = size / 2;
  const rgb = [0, 0, 0];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const nx = (px + (sx + 0.5) / SUPERSAMPLE - half) / half;
          const ny = (half - (py + (sy + 0.5) / SUPERSAMPLE)) / half;
          const rr = nx * nx + ny * ny;
          if (rr > 1) continue;
          const nz = Math.sqrt(1 - rr);
          sampleMap(map, Math.atan2(nx, nz), Math.asin(ny), rgb);
          const shade = LIMB + (1 - LIMB) * Math.sqrt(nz);
          r += rgb[0] * shade;
          g += rgb[1] * shade;
          b += rgb[2] * shade;
          hits++;
        }
      }
      const i = (py * size + px) * 4;
      if (hits > 0) {
        pixels[i] = r / hits;
        pixels[i + 1] = g / hits;
        pixels[i + 2] = b / hits;
      }
      pixels[i + 3] = hits / (SUPERSAMPLE * SUPERSAMPLE);
    }
  }
  return pixels;
}

/** Brightness that 99.5% of the disc stays under — the tone curve's white reference. */
function brightReference(pixels) {
  const lum = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 1) lum.push(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
  }
  lum.sort((a, b) => a - b);
  return lum[Math.floor(lum.length * 0.995)];
}

function toPng(pixels, size, white) {
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (let c = 0; c < 3; c++) {
      const desaturated = lum + (pixels[i + c] - lum) * SATURATION;
      const toned = Math.pow(Math.max(0, desaturated / white), GAMMA) * WHITE_POINT * TINT[c];
      out[i + c] = Math.round(Math.max(0, Math.min(1, toned)) * 255);
    }
    out[i + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 });
}

async function main() {
  const map = await loadMap();
  fs.mkdirSync(IOS_IMAGESET, { recursive: true });
  // One white reference for every density, so the files match exactly.
  const white = brightReference(project(map, BASE_SIZE * 2));
  for (const scale of SCALES) {
    const size = BASE_SIZE * scale;
    const png = await toPng(project(map, size), size, white).toBuffer();
    const androidFile = path.join(ANDROID_RES, `drawable-${ANDROID_DENSITY[scale]}`, 'moon_texture.png');
    const iosFile = path.join(IOS_IMAGESET, `moon@${scale}x.png`);
    for (const file of [androidFile, iosFile]) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, png);
    }
    console.log(`moon @${scale}x  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
  }
  fs.writeFileSync(
    path.join(IOS_IMAGESET, 'Contents.json'),
    JSON.stringify(
      {
        images: SCALES.map(scale => ({ filename: `moon@${scale}x.png`, idiom: 'universal', scale: `${scale}x` })),
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n',
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
