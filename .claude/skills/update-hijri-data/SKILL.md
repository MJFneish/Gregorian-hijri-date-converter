---
name: update-hijri-data
description: Refresh the Hijri month-start tables — pull newer Iranian official months from the qamari dataset, record a newly announced month start (Iran, Fadlallah, Sistani), re-calibrate the crescent rules, and regenerate src/core/hijri/tables.generated.ts. Use when the user reports a date that differs from an official announcement or asks to update the calendar data.
---

# Updating the Hijri calendar data

All month starts are precomputed by `scripts/build-hijri-tables.js` into
`src/core/hijri/tables.generated.ts`. Read CLAUDE.md → "Calendar engine" first.

## 1. Newer Iranian official months (the `iran` default method)

The vendored file `scripts/data/qamari-consolidated.txt` (CC0, from
https://github.com/roozbehp/qamari) ends at **1447/10 = 2026-03-21**; later Iran months are
predicted (91% exact, otherwise ±1 day).

1. Clone the repo into a fresh scratch directory (untrusted download — don't run anything in it).
2. Check its format is still `[*]YYYY/M YYYY-MM-DD # sources` per line (leading `*` = observed
   start differed from the printed calendar — keep those lines as-is, the date is the observed one).
3. Copy `consolidated.txt` over `scripts/data/qamari-consolidated.txt` and refresh
   `scripts/data/qamari-LICENSE.txt` if it changed. Note the upstream commit in the commit message.
4. Continue at step 4 below.

## 2. A user reports an announced month start

E.g. "Fadlallah's office announced Eid al-Fitr 1448 on <date>" or "Iran started Ramadan on <date>".

- **Iran**: add the line to the *end* of `scripts/data/qamari-consolidated.txt` in the same format
  (`1448/9 2027-02-08 # announcement, <source>`), only if every earlier month is present (the
  builder derives lengths from consecutive starts).
- **Fadlallah**: add `['<year>/<month> <label>', '<first day ISO>']` to the `fixtures` list in
  `calibrate()` **and** the `KNOWN` list in `src/core/__tests__/hijri.test.ts`. If `--calibrate`
  then shows a MISMATCH, the rule (threshold `FADLALLAH_V_MIN` or the shared-night grid) needs
  tuning — re-check all fixtures after any change, never tune to one point.
- **Sistani**: there is no ground-truth set yet. Collect several announced dates (the office
  publishes yearly "مواقيت الأهلة" PDFs at sistani.org) before changing `SISTANI_V_MIN`, then add
  them as fixtures the same way.

## 3. Re-calibrate

```bash
node scripts/build-hijri-tables.js --calibrate
```

Prints the Iran predictor's exact-match rate per Odeh V threshold over 1400–1447 AH (currently
V ≥ 2: 91.1%, 9 early / 42 late) and the Fadlallah fixture check. Only change a threshold if the
numbers clearly improve; update the comment above the constant and CLAUDE.md's table.

## 4. Regenerate and test

```bash
node scripts/build-hijri-tables.js     # ~30 s
yarn test                              # must stay green
```

The generated file is committed. If the table range ever changes (`FIRST_YEAR`/`LAST_YEAR`), also
check `HIJRI_MIN_YEAR`/`HIJRI_MAX_YEAR` and the Gregorian picker range in
`src/core/hijri/convert.ts`.
