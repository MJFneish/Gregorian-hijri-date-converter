#!/usr/bin/env node
/**
 * Generates the lucide icons both apps draw (the same set and version v1 used through
 * lucide-react-native), as SVG path data on lucide's 24×24 grid:
 *   android/app/src/main/java/com/devlance/hijriconverter/ui/components/LucideIcons.kt
 *   ios/HijriConverter/Views/LucideIcons.swift
 * Each app strokes them itself (2 units, round caps and joins — lucide's look) at any size/colour.
 *
 * Usage (in android/):
 *   yarn build:icons        (add a PascalCase name to ICONS first)
 *
 * Every lucide element is turned into path data: circle/ellipse -> two arcs, rect -> lines (and
 * arcs for rounded corners), line/polyline/polygon -> M/L; paths are re-emitted with every number
 * separated so no parser has to read SVG's run-together arc flags.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const LUCIDE = path.join(__dirname, '..', 'node_modules', 'lucide-static');
const KOTLIN_OUTPUT = path.join(
  root, 'android', 'app', 'src', 'main', 'java', 'com', 'devlance', 'hijriconverter', 'ui', 'components', 'LucideIcons.kt',
);
const SWIFT_OUTPUT = path.join(root, 'ios', 'HijriConverter', 'Views', 'LucideIcons.swift');

const ICONS = [
  'ArrowDown', 'ArrowDownUp', 'ArrowLeft', 'ArrowLeftRight', 'ArrowRight', 'BadgeCheck', 'BookOpen', 'Cake', 'Calculator',
  'CalendarCheck2', 'CalendarClock', 'CalendarDays', 'CalendarHeart', 'CalendarRange', 'Check', 'ChevronLeft',
  'ChevronRight', 'Circle', 'CircleCheck', 'CircleDashed', 'CloudDownload', 'Contrast', 'Copy', 'Flower2',
  'GitCompareArrows', 'HeartCrack', 'Hourglass', 'Info', 'Languages', 'LayoutGrid', 'Lock', 'Minus', 'Moon', 'MoonStar',
  'Plus', 'RefreshCw', 'Scale', 'Settings2', 'Share2', 'Sparkles', 'Star', 'Sun', 'Sunset', 'Telescope', 'TriangleAlert',
  'UtensilsCrossed',
];

const kebab = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
const NODES = JSON.parse(fs.readFileSync(path.join(LUCIDE, 'icon-nodes.json'), 'utf8'));

function iconNode(name) {
  const node = NODES[kebab(name)];
  if (!node) throw new Error(`lucide icon ${name} (${kebab(name)}) not found in lucide-static`);
  return node;
}

const n = v => Number(v);
const fmt = v => String(Math.round(v * 1000) / 1000);

function ellipse(cx, cy, rx, ry) {
  return `M${fmt(cx - rx)} ${fmt(cy)}a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(2 * rx)} 0a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(-2 * rx)} 0`;
}

function rect({ x = 0, y = 0, width, height, rx, ry }) {
  const [X, Y, W, H] = [n(x), n(y), n(width), n(height)];
  let r = Math.min(n(rx ?? ry ?? 0), W / 2);
  let s = Math.min(n(ry ?? rx ?? 0), H / 2);
  if (!r || !s) return `M${fmt(X)} ${fmt(Y)}h${fmt(W)}v${fmt(H)}h${fmt(-W)}Z`;
  return (
    `M${fmt(X + r)} ${fmt(Y)}h${fmt(W - 2 * r)}a${fmt(r)} ${fmt(s)} 0 0 1 ${fmt(r)} ${fmt(s)}` +
    `v${fmt(H - 2 * s)}a${fmt(r)} ${fmt(s)} 0 0 1 ${fmt(-r)} ${fmt(s)}` +
    `h${fmt(-(W - 2 * r))}a${fmt(r)} ${fmt(s)} 0 0 1 ${fmt(-r)} ${fmt(-s)}` +
    `v${fmt(-(H - 2 * s))}a${fmt(r)} ${fmt(s)} 0 0 1 ${fmt(r)} ${fmt(-s)}Z`
  );
}

function points(list, close) {
  const nums = list.trim().split(/[\s,]+/).map(Number);
  let d = '';
  for (let i = 0; i < nums.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${fmt(nums[i])} ${fmt(nums[i + 1])}`;
  return close ? `${d}Z` : d;
}

/**
 * Re-emits path data with every number separated. SVG lets arc flags run into the next number
 * ("a5 5 0 0012 5" = flags 0,0 then x 12), which not every path parser reads correctly.
 */
function normalize(d) {
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let i = 0;
  let out = '';
  let command = null;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const number = () => {
    skip();
    const m = d.slice(i).match(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
    if (!m) throw new Error(`bad path data at ${i}: ${d}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = () => {
    skip();
    const c = d[i++];
    if (c !== '0' && c !== '1') throw new Error(`bad arc flag at ${i - 1}: ${d}`);
    return Number(c);
  };
  for (;;) {
    skip();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) command = d[i++];
    if (!command) throw new Error(`path data must start with a command: ${d}`);
    const lower = command.toLowerCase();
    const count = ARGS[lower];
    if (count === undefined) throw new Error(`unsupported path command ${command}: ${d}`);
    const args = lower === 'a' ? [number(), number(), number(), flag(), flag(), number(), number()] : Array.from({ length: count }, number);
    out += command + args.map(fmt).join(' ');
    if (lower === 'z') command = null;
    // A moveto followed by more pairs is an implicit lineto.
    else if (lower === 'm') command = command === 'm' ? 'l' : 'L';
  }
  return out;
}

function toPath([tag, a]) {
  switch (tag) {
    case 'path':
      return normalize(a.d);
    case 'circle':
      return ellipse(n(a.cx), n(a.cy), n(a.r), n(a.r));
    case 'ellipse':
      return ellipse(n(a.cx), n(a.cy), n(a.rx), n(a.ry));
    case 'rect':
      return rect(a);
    case 'line':
      return `M${fmt(n(a.x1))} ${fmt(n(a.y1))}L${fmt(n(a.x2))} ${fmt(n(a.y2))}`;
    case 'polyline':
      return points(a.points, false);
    case 'polygon':
      return points(a.points, true);
    default:
      throw new Error(`unsupported lucide element <${tag}>`);
  }
}

const version = JSON.parse(fs.readFileSync(path.join(LUCIDE, 'package.json'), 'utf8')).version;
const icons = ICONS.map(name => ({ name, paths: iconNode(name).map(toPath) }));
const lowerFirst = name => name[0].toLowerCase() + name.slice(1);

const NL = '\n';

const kotlin = [
  'package com.devlance.hijriconverter.ui.components',
  '',
  `// GENERATED by android/scripts/build-icons.js from lucide-static ${version} (ISC) — do not edit by hand.`,
  '',
  "/** The lucide icons the app uses, as path data on lucide's 24×24 grid. Draw one with [Icon]. */",
  'enum class Lucide(vararg val paths: String) {',
  ...icons.flatMap(({ name, paths }) => [`  ${name}(`, ...paths.map(d => `    "${d}",`), '  ),']),
  '}',
  '',
].join(NL);

const swift = [
  `// GENERATED by android/scripts/build-icons.js from lucide-static ${version} (ISC) — do not edit by hand.`,
  '',
  "/// The lucide icons the app uses, as path data on lucide's 24×24 grid. Draw one with `LucideIcon`.",
  'enum Lucide: CaseIterable {',
  ...icons.map(({ name }) => `  case ${lowerFirst(name)}`),
  '',
  '  var paths: [String] {',
  '    switch self {',
  ...icons.flatMap(({ name, paths }) => [
    `    case .${lowerFirst(name)}:`,
    '      return [',
    ...paths.map(d => `        "${d}",`),
    '      ]',
  ]),
  '    }',
  '  }',
  '}',
  '',
].join(NL);

for (const [file, text] of [[KOTLIN_OUTPUT, kotlin], [SWIFT_OUTPUT, swift]]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
console.log(`wrote ${path.relative(root, KOTLIN_OUTPUT)} and ${path.relative(root, SWIFT_OUTPUT)} (${ICONS.length} icons, lucide ${version})`);
