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
- [x] Android release build (arm64-v8a) — BUILD SUCCESSFUL after pinning CMake 3.31.6 (Windows
      260-char path limit in the codegen build; see CLAUDE.md "Known gotchas")
- [x] `yarn bump patch --dry-run` → 1.0.0 → 1.0.1, versionCode 1 → 2; unknown args rejected
- [x] **Emulator run** (Pixel, API 36, debug build, 2026-10-20): loading → Home, Today card,
      wheels (drag + snap), direction switch, result + occasion badge, days-between + sheet, tab
      swipe (EN and mirrored AR), Settings, light/dark switch, Arabic, onboarding replay — all
      working; launch log free of warnings/errors. Fixed along the way: Today card gradient
      overflow, nested-VirtualizedList error, two library warnings (patch-package), square tab
      pill, invisible dark-mode switch, onboarding slide-3 landscape edge, "AH" wrapping alone
- [x] **Emulator run of the 1.1.0 release APK** (Pixel 4a, API 31, all-ABI build, 2026-10-26):
      onboarding skip, Home, convert, copy (toast) and share (sheet + Messages) in EN/light and
      AR/dark — see Phases 6 and 7
- [ ] Physical phone run (release APK) + copy/share sheet on a real device — no phone was
      connected on 2026-10-26; the emulator pass above covers the same flows
- [ ] iOS build (needs macOS — not possible from this Windows machine; `pod install` never run)

## Phase 6 — Moon phase on the converter result (user request, 2026-10-23)
- [x] `src/core/moon.ts`: the real Moon on the evening (Beirut Maghrib) of any day — elongation,
      illumination, waxing/waning, age, phase name (Meeus eq. 48.4 + extra ch. 47 terms, runtime)
- [x] Realistic disc (`MoonDisc`): NASA LRO full-moon texture (`scripts/generate-moon.js`) with the
      night side shaded at the exact phase + soft terminator + earthshine; continuous, not 8 icons
- [x] Result card: night panel with the date larger (28 → 34) and the moon row (phase, % lit, age);
      skeleton reshaped to match; EN/AR strings; NASA credit in Settings → About
- [x] `moon.test.ts` written (vs astronomy-engine, eclipses, a distinct moon every day of 132 Hijri months)
- [x] `yarn test` 174/174 (moon suite included), `yarn typecheck` clean, `yarn lint` 0 errors
      (fixed: `Buffer` undefined in generate-moon.js; 2 new inline-style warnings) — 2026-10-26
- [x] Emulator (release APK): crescent 12 Oct (4%, 2.0 d), first quarter 18 Oct (50%, 8.0 d),
      full 26 Oct (100%, 16.0 d), last quarter 1 Nov in AR/dark (٥٣٪, ٢٢٫٠), waning gibbous
      26 Dec (90%, 17.6 d) — every number matches astronomy-engine at Beirut Maghrib; lit side
      right when waxing / left when waning; RTL mirrors the moon row

## Phase 7 — Share the result as an image (user request, 2026-10-23)
- [x] `ResultPanel` extracted (night panel + moon), reused by the on-screen card and `ShareCard`
- [x] `ShareCard` (app header, result card, method footer) kept mounted off-screen; Share captures
      it (`react-native-view-shot`) and sends it with the caption (`react-native-share`); falls
      back to text-only if the image fails
- [x] Native rebuild + emulator (2026-10-26): the shared JPEG (pulled from the app's cache) is the
      full card, 990×1375 px, in AR/dark; the sheet previews it in EN/light; Messages receives the
      image + caption. Fixed on the way: capture was a 360×48 dp strip (0×0 clipped stage → now
      parked off-screen); stale "busy" for TalkBack on Convert/Share (explicit labels)
- [ ] WhatsApp / Telegram / save to gallery on a real phone (not installed on the emulator)

## Phase 8 — Tools tab + new features (user request, 2026-10-26)
Per feature: build → test (jest/typecheck/lint + emulator) → commit + push → minor bump →
commit + push → GitHub release; one APK build at the very end.
- [x] v1.3.0 — 3 tabs (Converter · Tools · Settings), Home = Today + converter only (no app
      header), `PageScreen` tool pages, Days between moved to Tools, share image without header
- [x] v1.4.0 — Tonight's moon on the Today card
- [x] v1.5.0 — Compare offices (one date under every method)
- [ ] v1.6.0 — Occasions list with countdowns, each shareable as an image
- [ ] v1.7.0 — Hijri birthday (next Hijri birthday + age in Hijri years)
- [ ] v1.8.0 — Recommended fasting days (list only — no notifications, user's choice)
- [ ] v1.9.0 — Crescent forecast (visibility around the next month start)
- [ ] v1.10.0 — Month-start updates without a new APK (JSON in the GitHub repo)

## Ideas / not built (ask the user before building)
- ~~Month calendar grid~~ — declined: the app is a converter, not a calendar (2026-10-26)
- Occasion reminders / notifications — declined for now (fasting list is list-only)
- Home-screen widget (today's Hijri date + eve state), like prayer-times-lb's
- GPS-based Maghrib for the eve hint (currently Beirut, no permission)
- Downloadable month-start overrides (e.g. after a new Iranian / Fadlallah announcement) — today it's a rebuild
- Day change exactly at Maghrib as an option (user chose midnight + eve hint for now)
