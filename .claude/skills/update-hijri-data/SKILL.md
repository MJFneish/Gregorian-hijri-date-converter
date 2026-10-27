---
name: update-hijri-data
description: Refresh the Hijri month-start tables — pull newer Iranian official months from the qamari dataset, record a newly announced month start (Iran, Fadlallah, Sistani), re-calibrate the crescent rules, and regenerate both apps' tables and data/hijri-tables.json. Use when the user reports a date that differs from an official announcement or asks to update the calendar data.
---

# Updating the Hijri calendar data

All month starts are precomputed by `android/scripts/build-hijri-tables.js` into the Android
`core/hijri/TablesGenerated.kt`, the iOS `HijriCore/.../Hijri/TablesGenerated.swift` and the
downloadable `data/hijri-tables.json`. Read CLAUDE.md → "Calendar engine" first.

## 1. Newer Iranian official months (the `iran` default method)

The vendored file `android/scripts/data/qamari-consolidated.txt` (CC0, from
https://github.com/roozbehp/qamari) ends at **1447/10 = 2026-03-21**; later Iran months are
predicted (91% exact, otherwise ±1 day).

1. Clone the repo into a fresh scratch directory (untrusted download — don't run anything in it).
2. Check its format is still `[*]YYYY/M YYYY-MM-DD # sources` per line (leading `*` = observed
   start differed from the printed calendar — keep those lines as-is, the date is the observed one).
3. Copy `consolidated.txt` over `android/scripts/data/qamari-consolidated.txt` and refresh
   `android/scripts/data/qamari-LICENSE.txt` if it changed. Note the upstream commit in the commit message.
4. Continue at step 4 below.

## 2. A user reports an announced month start

E.g. "Fadlallah's office announced Eid al-Fitr 1448 on <date>" or "Iran started Ramadan on <date>".

- **Iran**: add the line to the *end* of `android/scripts/data/qamari-consolidated.txt` in the same format
  (`1448/9 2027-02-08 # announcement, <source>`), only if every earlier month is present (the
  builder derives lengths from consecutive starts).
- **Fadlallah**: add `['<year>/<month> <label>', '<first day ISO>']` to the `fixtures` list in
  `calibrate()` **and** the Fadlallah announcement lists in both apps' tests (Kotlin
  `HijriTest.kt`, Swift `HijriTests.swift`). If `--calibrate`
  then shows a MISMATCH, the rule (threshold `FADLALLAH_V_MIN` or the shared-night grid) needs
  tuning — re-check all fixtures after any change, never tune to one point.
- **Sistani**: there is no ground-truth set yet. Collect several announced dates (the office
  publishes yearly "مواقيت الأهلة" PDFs at sistani.org) before changing `SISTANI_V_MIN`, then add
  them as fixtures the same way.

## 3. Re-calibrate

```bash
cd android && yarn build:tables -- --calibrate
```

Prints the Iran predictor's exact-match rate per Odeh V threshold over 1400–1447 AH (currently
V ≥ 2: 91.1%, 9 early / 42 late) and the Fadlallah fixture check. Only change a threshold if the
numbers clearly improve; update the comment above the constant and CLAUDE.md's table.

## 4. Regenerate and test

```bash
cd android
yarn build:tables      # ~60 s — writes TablesGenerated.kt, TablesGenerated.swift AND data/hijri-tables.json
yarn test              # must stay green (TablesTest checks the JSON and the bundled tables match)
# iOS: push and check the CI `ios` job (swift test runs the same checks)
```

All three generated files are committed. **Push `data/hijri-tables.json` to `develop` to reach phones
without a new APK** (since v1.10.0): installed apps download
`https://raw.githubusercontent.com/MJFneish/Gregorian-hijri-date-converter/develop/data/hijri-tables.json`
at most once a day (or from Settings → Calendar data → Check for updates), validate it
(`validateTableData`: same year range, well-formed masks, 353–356-day years, every month start
within 3 days of the bundled table) and switch to it when its `generated` timestamp is newer. The
script keeps the old timestamp when the tables didn't change, so re-running it alone triggers no
downloads. A wrong file can't brick dates — it's rejected — but a *plausible* wrong file would be
applied, so only push tables that passed the tests on both apps. If the table range ever changes (`FIRST_YEAR`/`LAST_YEAR`), also
check `HIJRI_MIN_YEAR`/`HIJRI_MAX_YEAR` and the Gregorian picker range (Kotlin
`core/hijri/Convert.kt`, Swift `Hijri/Convert.swift`).
