#!/usr/bin/env node
/**
 * Generates the precomputed Hijri month-start tables for every calculation method the app offers,
 * so the phone never runs astronomy code to convert a date: the Android app's
 * android/app/src/main/java/com/devlance/hijriconverter/core/hijri/TablesGenerated.kt, the iOS app's
 * ios/HijriCore/Sources/HijriCore/Hijri/TablesGenerated.swift and the downloadable
 * data/hijri-tables.json (at the repo root — installed apps fetch it from that exact URL).
 *
 * Usage:
 *   node scripts/build-hijri-tables.js              -> regenerate the table file
 *   node scripts/build-hijri-tables.js --calibrate  -> print accuracy stats vs. real data, write nothing
 *
 * Methods (see CLAUDE.md "Calendar engine" for the reasoning behind each rule):
 *   iran       Iran's official calendar (Leader's office / Istihlal committee). Real month starts
 *              from the CC0 `qamari` dataset (scripts/data/qamari-consolidated.txt) wherever it has
 *              them; after its last entry, predicted with the crescent rule below (telescope
 *              sightings are accepted, so the optical-aid visibility zone counts).
 *   fadlallah  Sayyed Fadlallah's office: the month starts once the crescent is visible to the
 *              naked eye ANYWHERE that shares part of the night with Lebanon (no actual sighting
 *              needed — pure calculation). Matches the user's ground-truth example
 *              (2002-03-22 = Friday 8 Muharram 1423).
 *   sistani    Sayyed Sistani's office: naked-eye sighting only, same horizon — approximated as
 *              naked-eye visibility at Najaf.
 *   ummalqura  Saudi Umm al-Qura (Sunni reference), read from ICU's `islamic-umalqura` calendar.
 *
 * Crescent visibility uses Odeh's criterion (Odeh 2004, "New Criterion for Lunar Crescent
 * Visibility", Experimental Astronomy 18): at best time Tb = sunset + 4/9 * lag,
 *   V = ARCV - (-0.1018 W^3 + 0.7319 W^2 - 6.3226 W + 7.1651)
 * with ARCV the airless topocentric moon-sun altitude difference (deg) and W the topocentric
 * crescent width (arcmin). Zones: V >= 5.65 naked eye; 2 <= V < 5.65 optical aid, maybe naked
 * eye; -0.96 <= V < 2 optical aid only; below that, not visible.
 *
 * Month rule (all three crescent methods): from a month's day 1 at civil date S, check the
 * evening of day 29 (civil date S+28). Visible -> the next month starts at S+29, otherwise the
 * month completes 30 days. That rule is self-correcting, so a one-day error in the anchor fades
 * within a month or two.
 */
const fs = require('fs');
const path = require('path');
const Astronomy = require('astronomy-engine');

/** The repository root (this script lives in android/scripts). */
const root = path.resolve(__dirname, '..', '..');
const KOTLIN_OUTPUT = path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'devlance', 'hijriconverter', 'core', 'hijri', 'TablesGenerated.kt');
const SWIFT_OUTPUT = path.join(root, 'ios', 'HijriCore', 'Sources', 'HijriCore', 'Hijri', 'TablesGenerated.swift');
/** Method id -> its `MethodId` enum entry in the Android app (the iOS enum uses the id itself). */
const KOTLIN_METHOD = { iran: 'Iran', fadlallah: 'Fadlallah', sistani: 'Sistani', ummalqura: 'UmmAlQura' };
// The same tables as JSON, published from the repo: installed apps download it to pick up new
// month starts without a new APK (data/TableUpdates.kt). Commit + push it after a rebuild.
const REMOTE_OUTPUT = path.join(root, 'data', 'hijri-tables.json');
const QAMARI = path.join(__dirname, 'data', 'qamari-consolidated.txt');

const FIRST_YEAR = 1343; // 1 Muharram 1343 = 1924-08-03 (Iran official)
const LAST_YEAR = 1500; // 1500/12 ends in 2077

// Thresholds on Odeh's V, chosen with --calibrate.
// Iran accepts telescope sightings, yet V >= 2 fits its real calendar best: 91.1% of 573 months
// (1400-1447 AH) exact, every miss within one day (9 early / 42 late) — run --calibrate to re-check.
const IRAN_V_MIN = 2;
const FADLALLAH_V_MIN = 2; // "may be seen by naked eye" zone and above
const SISTANI_V_MIN = 5.65; // clearly naked-eye visible

const BEIRUT = { lat: 33.8938, lon: 35.5018 };
const NAJAF = { lat: 32.028, lon: 44.3419 };
// Observation points across Iran — a sighting anywhere in the country counts.
const IRAN_POINTS = [
  { lat: 35.6892, lon: 51.389 }, // Tehran
  { lat: 36.2605, lon: 59.6168 }, // Mashhad
  { lat: 31.3183, lon: 48.6706 }, // Ahvaz
  { lat: 28.9234, lon: 50.8203 }, // Bushehr
  { lat: 29.4963, lon: 60.8629 }, // Zahedan
  { lat: 27.1832, lon: 56.2666 }, // Bandar Abbas
];

// ---------------------------------------------------------------------------------------------
// Julian Day Number helpers (integer days; JDN of a civil date at noon). Uses truncating integer
// division, as the Fliegel-Van Flandern formula requires — Math.floor here would drift by a day.

const idiv = (a, b) => Math.trunc(a / b);

function toJdn(y, m, d) {
  const a = idiv(m - 14, 12);
  return (
    idiv(1461 * (y + 4800 + a), 4) +
    idiv(367 * (m - 2 - 12 * a), 12) -
    idiv(3 * idiv(y + 4900 + a, 100), 4) +
    d -
    32075
  );
}

function fromJdn(jdn) {
  let l = jdn + 68569;
  const n = idiv(4 * l, 146097);
  l = l - idiv(146097 * n + 3, 4);
  const i = idiv(4000 * (l + 1), 1461001);
  l = l - idiv(1461 * i, 4) + 31;
  const j = idiv(80 * l, 2447);
  const d = l - idiv(2447 * j, 80);
  l = idiv(j, 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  return { y, m, d };
}

const isoOf = jdn => {
  const { y, m, d } = fromJdn(jdn);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const jdnOfIso = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return toJdn(y, m, d);
};

// ---------------------------------------------------------------------------------------------
// Crescent visibility (Odeh)

const observerCache = new Map();
function observerFor(p) {
  const key = `${p.lat},${p.lon}`;
  if (!observerCache.has(key)) observerCache.set(key, new Astronomy.Observer(p.lat, p.lon, 0));
  return observerCache.get(key);
}

/** UTC Date for local noon (mean solar time) at longitude `lon` on civil date `jdn`. */
function localNoonUtc(jdn, lon) {
  const { y, m, d } = fromJdn(jdn);
  return new Date(Date.UTC(y, m - 1, d, 12) - (lon / 15) * 3600e3);
}

const conjunctionCache = new Map();
/** Most recent geocentric new moon before `date` (searched in a 35-day window). */
function lastNewMoonBefore(date) {
  const key = Math.floor(date.getTime() / 86400e3);
  if (conjunctionCache.has(key)) return conjunctionCache.get(key);
  const nm = Astronomy.SearchMoonPhase(0, new Date(date.getTime() - 35 * 86400e3), 36);
  let result = null;
  // SearchMoonPhase returns the first new moon after the start; step forward to the latest one
  // that is still before `date`.
  let t = nm;
  while (t && t.date.getTime() < date.getTime()) {
    result = t.date;
    t = Astronomy.SearchMoonPhase(0, new Date(t.date.getTime() + 86400e3), 36);
  }
  conjunctionCache.set(key, result);
  return result;
}

/**
 * Odeh's V for the evening of civil date `jdn` at point `p`, or -Infinity when the crescent
 * cannot exist (moon not yet born at sunset, or it sets before the sun).
 */
function odehV(jdn, p) {
  const obs = observerFor(p);
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, localNoonUtc(jdn, p.lon), 1);
  if (!sunset) return -Infinity;
  const conj = lastNewMoonBefore(sunset.date);
  if (!conj || sunset.date.getTime() - conj.getTime() > 3 * 86400e3) {
    // No new moon within the last 3 days: either it hasn't happened yet (invisible) or we're
    // looking at an old moon (caller error). Both mean "no young crescent this evening".
    return -Infinity;
  }
  const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, -1, sunset, 1);
  if (!moonset) return -Infinity;
  const lagMs = moonset.date.getTime() - sunset.date.getTime();
  if (lagMs <= 0 || lagMs > 6 * 3600e3) return -Infinity;

  const best = new Date(sunset.date.getTime() + (4 / 9) * lagMs);
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, best, obs, true, true);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, best, obs, true, true);
  const sunHor = Astronomy.Horizon(best, obs, sunEq.ra, sunEq.dec); // airless (no refraction)
  const moonHor = Astronomy.Horizon(best, obs, moonEq.ra, moonEq.dec);

  const arcv = moonHor.altitude - sunHor.altitude;
  const arcl = Astronomy.AngleBetween(sunEq.vec, moonEq.vec);
  const moonKm = moonEq.dist * Astronomy.KM_PER_AU;
  const sdArcmin = Math.asin(1737.4 / moonKm) * (180 / Math.PI) * 60;
  const w = sdArcmin * (1 - Math.cos(arcl * (Math.PI / 180)));
  return arcv - (-0.1018 * w ** 3 + 0.7319 * w ** 2 - 6.3226 * w + 7.1651);
}

const maxV = (jdn, points) => points.reduce((best, p) => Math.max(best, odehV(jdn, p)), -Infinity);

/** Grid of points that share part of the night following sunset at Beirut on civil date `jdn`
 * (their own sunset falls before Beirut's dawn). Ordered west -> east, since visibility improves
 * westward — lets the caller stop at the first visible point. */
function sharedNightPoints(jdn) {
  const beirut = observerFor(BEIRUT);
  const bSunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, beirut, -1, localNoonUtc(jdn, BEIRUT.lon), 1);
  const bDawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, beirut, +1, bSunset, 1, -16);
  const points = [];
  for (let lon = -175; lon <= 35; lon += 10) {
    for (let lat = -40; lat <= 60; lat += 10) {
      const p = { lat, lon };
      const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observerFor(p), -1, localNoonUtc(jdn, lon), 1);
      if (sunset && bDawn && sunset.date.getTime() < bDawn.date.getTime()) points.push(p);
    }
  }
  points.push(BEIRUT);
  return { points, bDawn: bDawn ? bDawn.date : null };
}

function fadlallahVisible(jdn) {
  const { points, bDawn } = sharedNightPoints(jdn);
  const conj = bDawn ? lastNewMoonBefore(bDawn) : null;
  if (!conj || bDawn.getTime() - conj.getTime() > 3 * 86400e3) return false;
  for (const p of points) {
    if (odehV(jdn, p) >= FADLALLAH_V_MIN) return true;
  }
  return false;
}

const RULES = {
  iran: jdn => maxV(jdn, IRAN_POINTS) >= IRAN_V_MIN,
  fadlallah: fadlallahVisible,
  sistani: jdn => odehV(jdn, NAJAF) >= SISTANI_V_MIN,
};

// ---------------------------------------------------------------------------------------------
// Data sources

function loadQamari() {
  const starts = new Map(); // "Y/M" -> jdn
  const observedDiffers = new Set();
  for (const raw of fs.readFileSync(QAMARI, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\*?)(\d{4})\/(\d{1,2}) (\d{4}-\d{2}-\d{2})/);
    if (!m) throw new Error(`Unparseable qamari line: ${line}`);
    const key = `${Number(m[2])}/${Number(m[3])}`;
    starts.set(key, jdnOfIso(m[4]));
    if (m[1]) observedDiffers.add(key);
  }
  return { starts, observedDiffers };
}

function ummAlQuraStarts() {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const starts = new Map();
  const from = jdnOfIso('1924-07-01');
  const to = jdnOfIso('2078-01-01');
  for (let jdn = from; jdn <= to; jdn++) {
    const { y, m, d } = fromJdn(jdn);
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).map(p => [p.type, p.value]),
    );
    if (Number(parts.day) === 1) {
      const year = Number(String(parts.year ?? parts.relatedYear).replace(/\D/g, ''));
      starts.set(`${year}/${Number(parts.month)}`, jdn);
    }
  }
  return starts;
}

// ---------------------------------------------------------------------------------------------
// Table building

const monthKeys = () => {
  const keys = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) for (let m = 1; m <= 12; m++) keys.push([y, m]);
  return keys;
};

/** Month lengths (29/30) for every month in range, from a known first start + rule/data. */
function buildLengths(firstStart, { known, rule, label }) {
  const lengths = [];
  let start = firstStart;
  const keys = monthKeys();
  for (let i = 0; i < keys.length; i++) {
    const [y, m] = keys[i];
    const nextKey = m === 12 ? `${y + 1}/1` : `${y}/${m + 1}`;
    let len;
    if (known && known.has(nextKey) && known.has(`${y}/${m}`)) {
      len = known.get(nextKey) - known.get(`${y}/${m}`);
      start = known.get(`${y}/${m}`);
    } else {
      len = rule(start + 28) ? 29 : 30;
    }
    if (len !== 29 && len !== 30) throw new Error(`${label}: ${y}/${m} has ${len} days`);
    lengths.push(len);
    start += len;
    if (i % 120 === 119) process.stdout.write(`  ${label}: ${y}\n`);
  }
  return lengths;
}

/* eslint-disable no-bitwise -- packs month lengths into 12-bit masks */
function encodeLengths(lengths) {
  let out = '';
  for (let i = 0; i < lengths.length; i += 12) {
    let bits = 0;
    for (let k = 0; k < 12; k++) if (lengths[i + k] === 30) bits |= 1 << k;
    out += bits.toString(16).padStart(3, '0');
  }
  return out;
}
/* eslint-enable no-bitwise */

// ---------------------------------------------------------------------------------------------
// Calibration — predicts each month from the *actual* previous start, so every month is an
// independent test of the rule (no error carry-over).

function calibrate() {
  const { starts } = loadQamari();
  const iranTrials = [-0.96, 0, 1, 1.5, 2, 2.5, 3.5, 5.65];
  const counts = Object.fromEntries(iranTrials.map(t => [t, { ok: 0, early: 0, late: 0 }]));
  let total = 0;
  for (let y = 1400; y <= 1447; y++) {
    for (let m = 1; m <= 12; m++) {
      const cur = starts.get(`${y}/${m}`);
      const next = starts.get(m === 12 ? `${y + 1}/1` : `${y}/${m + 1}`);
      if (cur === undefined || next === undefined) continue;
      const v = maxV(cur + 28, IRAN_POINTS);
      total++;
      for (const t of iranTrials) {
        const predicted = cur + (v >= t ? 29 : 30);
        if (predicted === next) counts[t].ok++;
        else if (predicted < next) counts[t].early++;
        else counts[t].late++;
      }
    }
  }
  console.log(`Iran official vs. prediction, ${total} months (1400-1447 AH), per V threshold:`);
  for (const t of iranTrials) {
    const c = counts[t];
    console.log(`  V >= ${String(t).padEnd(5)} exact ${((100 * c.ok) / total).toFixed(1)}%  early ${c.early}  late ${c.late}`);
  }

  // Fadlallah fixtures: [first day of month, the civil date whose evening decides it].
  const fixtures = [
    ['1423/1 (user example)', '2002-03-15'],
    ['1432/9 Ramadan', '2011-08-01'],
    ['1435/10 Eid al-Fitr', '2014-07-28'],
    ['1446/10 Eid al-Fitr', '2025-03-30'],
    ['1447/10 Eid al-Fitr', '2026-03-20'],
  ];
  console.log('\nFadlallah fixtures (must be visible on the eve, NOT visible the evening before):');
  for (const [label, iso] of fixtures) {
    const first = jdnOfIso(iso);
    const eve = fadlallahVisible(first - 1);
    const dayBefore = fadlallahVisible(first - 2);
    console.log(`  ${label.padEnd(24)} ${iso}: eve visible=${eve}  evening before visible=${dayBefore}  ${eve && !dayBefore ? 'OK' : 'MISMATCH'}`);
  }
}

// ---------------------------------------------------------------------------------------------

function main() {
  if (process.argv.includes('--calibrate')) {
    calibrate();
    return;
  }

  const t0 = Date.now();
  const { starts: qamari, observedDiffers } = loadQamari();
  const firstStart = qamari.get(`${FIRST_YEAR}/1`);
  const lastOfficial = [...qamari.keys()].pop();

  console.log('Building ummalqura (ICU)...');
  const uq = ummAlQuraStarts();
  console.log('Building iran (qamari + prediction)...');
  const iran = buildLengths(firstStart, { known: qamari, rule: RULES.iran, label: 'iran' });
  console.log('Building fadlallah...');
  const fadlallah = buildLengths(firstStart, { rule: RULES.fadlallah, label: 'fadlallah' });
  console.log('Building sistani...');
  const sistani = buildLengths(firstStart, { rule: RULES.sistani, label: 'sistani' });
  const ummalqura = buildLengths(uq.get(`${FIRST_YEAR}/1`), { known: uq, rule: () => false, label: 'ummalqura' });

  const methods = {
    iran: { firstJdn: firstStart, lengths: encodeLengths(iran) },
    fadlallah: { firstJdn: firstStart, lengths: encodeLengths(fadlallah) },
    sistani: { firstJdn: firstStart, lengths: encodeLengths(sistani) },
    ummalqura: { firstJdn: uq.get(`${FIRST_YEAR}/1`), lengths: encodeLengths(ummalqura) },
  };

  const iranLastOfficial = { year: Number(lastOfficial.split('/')[0]), month: Number(lastOfficial.split('/')[1]) };
  // Keep the previous timestamp when nothing changed, so phones don't re-download identical data.
  let generated = new Date().toISOString().slice(0, 19) + 'Z';
  if (fs.existsSync(REMOTE_OUTPUT)) {
    const previous = JSON.parse(fs.readFileSync(REMOTE_OUTPUT, 'utf8'));
    const same = JSON.stringify(previous.methods) === JSON.stringify(methods) &&
      JSON.stringify(previous.iranLastOfficial) === JSON.stringify(iranLastOfficial);
    if (same) generated = previous.generated;
  }

  const header = `// GENERATED by android/scripts/build-hijri-tables.js — do not edit by hand. Regenerate with:
//   yarn build:tables        (in android/)
//
// Each method: firstJdn = Julian Day Number of 1 Muharram ${FIRST_YEAR}; lengths = one 3-hex-digit
// group per Hijri year (${FIRST_YEAR}..${LAST_YEAR}), bit k set = month k+1 has 30 days (else 29).
// iran: official month starts (CC0 qamari dataset) through ${lastOfficial} = ${isoOf(qamari.get(lastOfficial))}, predicted after.
// Months where Iran's observed start differed from its printed calendar: ${[...observedDiffers].join(', ')}.
`;
  const kotlin = `package com.devlance.hijriconverter.core.hijri

${header}
const val TABLE_FIRST_YEAR = ${FIRST_YEAR}
const val TABLE_LAST_YEAR = ${LAST_YEAR}

/** Last month whose Iran-official start comes from real published data (later ones are predicted). */
val IRAN_LAST_OFFICIAL = YearMonth(${iranLastOfficial.year}, ${iranLastOfficial.month})

/** When these tables were generated — compared with the downloadable copy (data/hijri-tables.json). */
const val TABLES_GENERATED = "${generated}"

val METHOD_TABLES: Map<MethodId, MethodTable> = mapOf(
${Object.entries(methods)
  .map(([id, m]) => `  MethodId.${KOTLIN_METHOD[id]} to MethodTable(\n    firstJdn = ${m.firstJdn},\n    lengths = "${m.lengths}",\n  ),`)
  .join('\n')}
)
`;
  fs.mkdirSync(path.dirname(KOTLIN_OUTPUT), { recursive: true });
  fs.writeFileSync(KOTLIN_OUTPUT, kotlin);
  const swift = `${header}
/// The month tables bundled with the app (Tables.swift reads them through \`HijriTables\`).
public enum GeneratedTables {
  public static let firstYear = ${FIRST_YEAR}
  public static let lastYear = ${LAST_YEAR}
  /// Last month whose Iran-official start comes from real published data (later ones are predicted).
  public static let iranLastOfficial = YearMonth(year: ${iranLastOfficial.year}, month: ${iranLastOfficial.month})
  /// When these tables were generated — compared with the downloadable copy (data/hijri-tables.json).
  public static let generated = "${generated}"

  public static let methods: [MethodId: MethodTable] = [
${Object.entries(methods)
  .map(([id, m]) => `    .${id}: MethodTable(\n      firstJdn: ${m.firstJdn},\n      lengths: "${m.lengths}"\n    ),`)
  .join('\n')}
  ]
}
`;
  fs.mkdirSync(path.dirname(SWIFT_OUTPUT), { recursive: true });
  fs.writeFileSync(SWIFT_OUTPUT, swift);
  const remote = { format: 1, generated, firstYear: FIRST_YEAR, lastYear: LAST_YEAR, iranLastOfficial, methods };
  fs.mkdirSync(path.dirname(REMOTE_OUTPUT), { recursive: true });
  fs.writeFileSync(REMOTE_OUTPUT, JSON.stringify(remote, null, 2) + '\n');
  console.log(`wrote ${path.relative(root, KOTLIN_OUTPUT)}, ${path.relative(root, SWIFT_OUTPUT)} and ${path.relative(root, REMOTE_OUTPUT)} (generated ${generated}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main();
