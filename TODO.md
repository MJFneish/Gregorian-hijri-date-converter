# TODO — Hijri Converter

Phased build checklist. Check items off as they land; keep this file honest — it's the fastest way
for a fresh Claude session (or the human) to see what's real vs planned. If it disagrees with
`CONTINUE_PROJECT.md`'s prose, trust this file and the actual code.

## Phase 1 — Scaffold ✅
- [x] Bare RN CLI 0.87.1 TS project, package `com.devlance.hijriconverter`, display name
      "Hijri Converter" / launcher label "محوّل التاريخ" on Arabic phones (`values-ar/strings.xml`)
- [x] Fixed CLI scaffold bugs (malformed Kotlin dir, package.json name), Yarn 1 instead of the template's Yarn 3
- [x] Deps pinned to lexitoon's proven native versions; worklets Babel plugin; gesture-handler first in `index.js`
- [x] `scripts/bump-version.js` (`yarn bump [patch|minor|major] [--dry-run]`)
- [x] `.gitattributes` (LF for `android/gradlew`)

## Phase 2 — Calendar engine ✅ (34/34 tests)
- [x] Research: how Shia authorities start months; Iran / Fadlallah / Sistani differences; data sources
- [x] `scripts/build-hijri-tables.js` — Odeh crescent criterion on `astronomy-engine`, `--calibrate` mode
- [x] Iran official month starts vendored (`scripts/data/qamari-consolidated.txt`, CC0) + predictor (91.1% exact)
- [x] Fadlallah shared-night rule (5/5 known office dates incl. the user's 2002-03-22 example)
- [x] Sistani (Najaf naked-eye) and Umm al-Qura (ICU) tables
- [x] Runtime lookup, seam-anchored tabular fallback, ±2-day adjustment, source labels
- [x] Occasions (44 Twelver dates, EN/AR) + last-day-of-month handling
- [x] Beirut Maghrib (4.5°) for the "eve" hint
- [x] Golden tests: user example, every published Iranian month, Umm al-Qura vs ICU daily 1990–2050,
      round-trips for every day of every table, Al Sirat Maghrib fixture

## Phase 3 — App ✅ (typecheck clean, lint 0 errors)
- [x] Theme "Lunar Indigo" light/dark/system (ui-ux-pro-max design system), spacing/typography tokens
- [x] Settings store (zustand + AsyncStorage), i18n EN/AR, `useDirection` instant RTL
- [x] Root stack (Onboarding → Main) + prayer-times-lb-style live-drag tab pager (mirrors in Arabic)
- [x] Home: Today hero card (both calendars, occasion, eve hint after Maghrib, next occasion)
- [x] Home: two-way converter with custom Hijri/Gregorian wheel pickers, result + source badge + occasions
- [x] Home: copy & share
- [x] Home: days-between calculator (days, Y/M/D span in Hijri or Gregorian, weeks)
- [x] Settings: language, appearance, calculation method, ±2 adjustment w/ preview, replay intro, about/version, disclaimer
- [x] Onboarding: 4 slides, original animated SVG illustrations, language switch, skip, dots
- [x] Native splash (bootsplash) → animated JS loading screen (seamless hand-off, min 1.2 s, reduced-motion aware)
- [x] Original app icon (Android legacy + adaptive + monochrome, iOS 1024) via `scripts/generate-icons.js`

## Phase 4 — Docs ✅
- [x] CLAUDE.md, CONTINUE_PROJECT.md, TODO.md, help.md, README.md
- [x] `.claude/skills/verify`, `.claude/skills/update-hijri-data`

## Phase 5 — Verification
- [x] `yarn test` (34/34), `yarn typecheck`, `yarn lint` (0 errors)
- [ ] Android release build (arm64-v8a) — see CONTINUE_PROJECT.md for the result of the first build
- [ ] **On-device run** (emulator or phone): onboarding → loading → converter wheels feel, pager
      swipe incl. Arabic, theme switch, method switch, copy/share, days-between sheet
- [ ] iOS build (needs macOS — not possible from this Windows machine; `pod install` never run)

## Ideas / not built (ask the user before building)
- Month calendar grid (Hijri month view with both dates per day, occasions highlighted)
- Home-screen widget (today's Hijri date + eve state), like prayer-times-lb's
- GPS-based Maghrib for the eve hint (currently Beirut, no permission)
- Downloadable month-start overrides (e.g. after a new Iranian / Fadlallah announcement) — today it's a rebuild
- Day change exactly at Maghrib as an option (user chose midnight + eve hint for now)
