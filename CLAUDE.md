# Hijri Converter (محوّل التاريخ) — Gregorian ⇄ Hijri, Shia calendar

Converts dates between the Gregorian and Hijri calendars following **Shia calendar authorities**,
bilingual (English / Arabic with RTL), light and dark themes, fully offline (plus an optional daily
download of corrected month starts). Three tabs — Converter · Tools · Settings — onboarding and an
animated loading screen.

**Since v2 there are two native apps, no React Native:**
- [`android/`](./android/) — Kotlin + Jetpack Compose (the Gradle project), plus all tooling
  (`android/package.json`, `android/scripts/`).
- [`ios/`](./ios/) — Swift + SwiftUI: an XcodeGen spec (`ios/project.yml`; the `.xcodeproj` is
  generated, not committed), the app in `ios/HijriConverter/` and the engine as a Swift package in
  `ios/HijriCore/` (unit-tested with `swift test`).
- [`data/hijri-tables.json`](./data/hijri-tables.json) stays at the repo root: installed apps
  (incl. v1.10.0) download it from exactly that URL — never move or rename it.

v1 (React Native CLI 0.87, TypeScript) was removed when v2 was ported; it's in git history
(last release tag **v1.10.0**) — `git show v1.10.0:src/...` to read it.

**Every feature is built on both platforms** (user's rule for projects with `android/` and `ios/`):
Kotlin for Android, Swift for iOS, tested on both. This machine is Windows with no Xcode, so **iOS is
built and tested only on GitHub Actions macOS runners** (`.github/workflows/ci.yml`: `swift test`,
then an XcodeGen + `xcodebuild test` UI smoke test whose screenshots are uploaded as an artifact).
Say so when an iOS part can only be checked there.

See [`TODO.md`](./TODO.md) for the phased checklist (source of truth for "what's done").

**Project skills** (`.claude/skills/`) — check these before the matching kind of work:
- `verify` — **read before running tests, a Gradle build or an emulator run.**
- `update-hijri-data` — refreshing Iran's official month data, recording a new announcement,
  re-calibrating the crescent rules, regenerating the tables.

## Layout and stack

### Android (`android/`)

- Kotlin 2.2.10, AGP 8.12, Gradle 9.3.1, Compose BOM 2025.08.00, min SDK 24 / target 36 (same
  toolchain as prayer-times-lb's v2). `version.properties` is the version source of truth.
- `app/src/main/java/com/devlance/hijriconverter/`:
  `core/` (the engine — pure Kotlin, unit-tested on the JVM), `data/` (settings, v1 migration,
  month-table updates), `i18n/` (`Strings`, `Plural`), `ui/` (Compose: `AppRoot` navigation,
  `theme/`, `components/`, `brand/`, `onboarding/`, `screens/`).
- **Updating over v1 must keep working:** same application id `com.devlance.hijriconverter`, same
  signing key (`app/debug.keystore` — the RN template key every v1 release carries), same launcher
  activity name (`.MainActivity`). On first launch `data/LegacyMigration.kt` imports v1's settings
  and downloaded tables from AsyncStorage (SQLite `RKStorage`, table `catalystLocalStorage`, keys
  `hijri-converter-settings` = zustand `{state, version}`, `hijri-tables-remote`,
  `hijri-tables-last-check`). Verified on the emulator by installing the real 1.10.0 APK, changing
  every setting, then installing v2 over it.
- Strings are v1's i18next files as assets (`app/src/main/assets/i18n/`), looked up by `Strings`
  (dot keys, `{{placeholders}}`). The app language is independent of the phone's; Compose
  `LocalLayoutDirection` follows it, so RTL flips instantly.
- Icons: lucide (v1's set), generated as path data by `scripts/build-icons.js` for both apps
  (`ui/components/LucideIcons.kt`, drawn by `Icon`).
- Engine dependency: Astronomy Engine's Kotlin build from **JitPack**
  (`com.github.cosinekitty:astronomy:v2.1.19`, `exclusiveContent` in `settings.gradle.kts`) for the
  crescent forecast — the same library and version the tables are built with.
- Tests: JVM unit tests (`yarn test` in android/) incl. icu4j as the ICU reference.

### iOS (`ios/`)

- SwiftUI, iOS 17+. `HijriCore` (Swift package): the engine and the app logic (settings, strings,
  month-table updates) with the same unit tests as Android, plus `CAstronomy`, Astronomy Engine's
  single-file C edition (v2.1.19, MIT) as a C target — there is no Swift edition.
- Bundle id `com.devlance.hijriconverter` (v1's). `project.yml` carries MARKETING_VERSION /
  CURRENT_PROJECT_VERSION, kept equal to `android/version.properties` by `yarn bump`.
- Strings: the same i18n JSON files (`HijriCore/Sources/HijriCore/Resources/i18n/`); CI checks the
  Android and iOS copies are identical. RTL via `\.layoutDirection` from the app language.

### Tooling (`android/package.json`, Yarn 1 only — never npm)

```
cd android
yarn install            # tooling deps (astronomy-engine, sharp, lucide-static)
yarn test               # Android unit tests (Gradle)
yarn bump pre|patch|minor|major|release [--dry-run]   # both apps' versions
yarn build:apk          # release APK -> android/dist/HijriConverter-v<version>-build<code>.apk
yarn release --notes <file.md> [--apk]  # GitHub release of the current version (API, no gh)
yarn build:tables [-- --calibrate]      # regenerate / re-check the month tables (Kotlin, Swift, JSON)
yarn build:icons        # lucide icons -> Kotlin + Swift
yarn generate:icons     # launcher icons, iOS app icon + launch logo, brand SVGs
yarn generate:moon      # moon texture -> Android drawables + iOS asset catalog
./gradlew.bat assembleDebug   # debug APK for the emulator
```

**Release routine** (the user's standing order): each feature is built on both apps, tested
(Android: unit tests + emulator; iOS: CI), committed and pushed; then `yarn bump` (feature → minor,
fix → patch; `pre` during the v2 port), the bump committed, tagged `v<version>` and pushed, and a
GitHub release titled with the version (`yarn release`). One APK at the end of a round of features.

## Calendar engine — read before touching `core/` (Kotlin) or `HijriCore` (Swift)

Both apps implement the same engine, ported from v1's TypeScript **step by step**: truncating
integer division in the JDN formulas (Longs where JS doubles would overflow an Int), JS
`Math.round` (= floor(x + 0.5)) and `toFixed` rounding (exact binary value, half away from zero),
JS `Date`'s truncated milliseconds in the crescent maths, JS Astronomy Engine's `AngleBetween`.
Don't "tidy" those into idiomatic rounding without the golden tests.

### Methods (user decisions, 2026-10-20)

The user is a Lebanese Shia user who asked for **Shia dates, not Sunni**, and supplied one ground
truth: **2002-03-22 = Friday 8 Muharram 1423**. Research showed Lebanese Shia don't share one
calendar, so the app offers a method switch (Settings → Calculation method):

| Method id | Authority | How the table is produced | 2002-03-22 |
|---|---|---|---|
| `iran` (**default — user's explicit choice**) | Iran official (Leader's office / Istihlal committee; telescopes accepted) | Real month starts from the CC0 [`qamari`](https://github.com/roozbehp/qamari) dataset through **1447/10 (2026-03-21)**; predicted after with Odeh V ≥ 2 at any of 6 Iranian cities | 7 Muharram |
| `fadlallah` | Sayyed Fadlallah's office | Pure calculation: crescent naked-eye visible (Odeh V ≥ 2) **anywhere sharing part of the night with Beirut** | **8 Muharram ✓** |
| `sistani` | Sayyed Sistani's office | Naked-eye sighting, same horizon → Odeh V ≥ 5.65 at Najaf (approximation, ±1 day) | 7 Muharram |
| `ummalqura` | Saudi Umm al-Qura (Sunni, reference only) | ICU `islamic-umalqura` at build time | 8 Muharram |

**Important nuance for the user**: their example (8 Muharram) matches **Fadlallah**, not the Iran
default they picked (Iran started 1423 on Sat 16 Mar → 7 Muharram). This was flagged to them; the
golden test asserts the example under `fadlallah`. To make the example hold by default, change
`DEFAULT_METHOD` (Kotlin `core/hijri/Types.kt`, Swift `Hijri/Types.swift`).

### How it's built

- **The month tables are precomputed at build time** by
  [`android/scripts/build-hijri-tables.js`](./android/scripts/build-hijri-tables.js) (Node +
  `astronomy-engine`) into `TablesGenerated.kt`, `TablesGenerated.swift` and
  `data/hijri-tables.json`: per method, the JDN of 1 Muharram 1343 + one 12-bit mask per Hijri year
  (bit = 30-day month), 1343–1500 AH (1924–2077). ~3 KB. Conversions never run astronomy on the
  phone (only the crescent forecast does).
- Crescent rule (all computed methods): from a month's day 1 at civil date S, evaluate the evening
  of day 29 (civil S+28) — visible → next month starts S+29, else the month completes 30 days.
- Visibility = **Odeh's criterion** (Odeh 2004): at best time Tb = sunset + 4/9·lag,
  `V = ARCV − (−0.1018W³ + 0.7319W² − 6.3226W + 7.1651)` with airless topocentric ARCV (deg) and
  crescent width W (arcmin). Zones: ≥5.65 naked eye; 2–5.65 optical aid, maybe naked eye;
  −0.96–2 optical aid only.
- **Calibration** (`yarn build:tables -- --calibrate`): Iran predictor vs. 573 real months
  (1400–1447 AH) → **V ≥ 2: 91.1% exact, every miss within one day** (9 early / 42 late).
  Fadlallah rule reproduces all 5 known office dates (1423/1, 1432/9, 1435/10, 1446/10, 1447/10).
- Lookup: binary search over decoded month starts. Outside 1343–1500 AH the **arithmetic (tabular
  civil) calendar** takes over, *shifted to continue seamlessly from each method's table edge*
  (unshifted, one Gregorian day mapped to "1 Muharram 1343" twice — see `seamOffsets`). Such dates
  are labelled "Approximate".
- Every conversion goes through an integer **JDN**. The Fliegel–Van Flandern formula **must use
  truncating division**. prayer-times-lb's v1 `hijri.ts` floored there, which drifts 1–2 days by
  month/leap-cycle position. Don't copy that.
- Manual adjustment (−2…+2): Hijri(G) = table(JDN(G) + adj); Gregorian(H) = JDN(H) − adj.
- `DateSource`: `official` (Iran published / Umm al-Qura), `calculated` (rule-based),
  `approximate` (tabular fallback).
- Sighting calendars can have **353- or 356-day years** (Iran's real data has them) — only
  arithmetic calendars are limited to 354/355. The integrity tests assert 353–356 on purpose.

### Month-start updates without a new release (since v1.10.0)

- The build script writes the tables as **`data/hijri-tables.json`** (`format: 1`, `generated`
  timestamp — reused when the tables didn't change). Apps download it from the repo's `develop`
  branch (`data/TableUpdates.kt` / Swift `TableUpdates`: restore a stored download at startup,
  check if 24 h passed; Settings → Calendar data → "Check for updates" forces one) and apply it
  when **newer** and **valid** (`validateTableData`: same 1343–1500 range, well-formed masks,
  353–356-day years, every month start within 3 days of the bundled one).
- Tables are swappable at runtime; the conversion options carry `tablesVersion`, so anything
  remembered on them recomputes after an update — key conversions on the whole options.
- The table tests fail if `data/hijri-tables.json` and the generated code differ: commit all three.
  Publishing a correction = the `update-hijri-data` skill + push; no app release needed.
- The repo must stay **public** for that URL to work.

### Occasions, eve hint, moon

- `Occasions`: 44 Twelver occasions (Iran's official holidays, Sistani's office/I.M.A.M. lists,
  Fadlallah's office, WikiShia). Where narrations differ, Iran/Lebanon's date is used, the
  alternative noted inline. `lastDayOfMonth` entries resolve to the 29th or 30th.
- **Day change = midnight, with an "eve" hint after Maghrib** (user's choice). Maghrib = sun 4.5°
  below the horizon **at Beirut** (prayer-times-lb's verified Jafari angle), no location permission.
  Test: Al Sirat's published Beirut Maghrib (2026-07-12 20:11) within a minute.
- Moon phase (user request 2026-10-23: realistic, a different shape every day): Meeus eq. 48.4 +
  ch. 47 terms, sampled at **Beirut's Maghrib** of the civil day — day 1 shows a young crescent, the
  14th/15th the full moon. Depends on the Gregorian day only. Principal names only on the day within
  ±12 h of the exact instant; "100%"/"0%" only on full/new days. Drawn as NASA's LRO full-moon
  texture (`yarn generate:moon`, credited in Settings → About) under 11 stacked translucent night
  shadows (terminator = half-ellipse, semi-axis r·|cos ψ|) overhanging the limb by 0.35 dp.

### Tools (each its own page under the Tools tab — the app is a converter, not a calendar)

- **Compare offices**: one day under every method, offset vs. the user's method found by label
  search ±3 days (falling back to next-month starts for a 30th the other office doesn't have), plus
  when each office began its month. The ±adjustment is **not** applied there (raw calendars).
- **Occasions**: today → same Hijri date next year (each occasion once), grouped by Hijri month,
  All / Mourning / Celebrations, countdown, share each as an image.
- **Hijri birthday**: birth date entered in either calendar, stored as a JDN on the phone only;
  next Hijri birthday (a 30th in a 29-day month falls on the 29th), age in Hijri vs Gregorian.
- **Fasting days** — list only, no notifications (user's choice). Rules from the marjas' own texts
  (Sistani *Islamic Laws* r.1716/1707/1715, *Minhaj* 1063–1066; Khamenei رساله نماز و روزه 976–980;
  Fadlallah's treatise): first/middle/last Thursday–Wednesday–Thursday, White Days, Rajab and
  Sha'ban, 27 Rajab, 17 Rabi' al-Awwal, 25 Dhu al-Qi'dah, 18 and 24 Dhu al-Hijjah, Arafah (caution
  when the month start isn't official). "Sistani's list": 1–8 Dhu al-Hijjah, 1/3/7 Muharram, 4–9
  Shawwal. Never: Ramadan, the two Eids, Ashura (shown as "abstain until after Asr").
- **Crescent forecast**: the build script's Odeh rule on the phone — **keep the copies in sync**;
  the tests assert they reproduce the Sistani table and every predicted Iran month (1440–1450)
  exactly. Conjunction time, the 29th/30th evenings for Beirut, Najaf and Iran (best city), and each
  office's expected 1st. Computed off the main thread with a "Calculating…" state.
- **Days between**: days, weeks, and the span in the chosen calendar.
- **Share** sends a picture of the result card (night panel + moon, badges, occasions) with the
  method as a footer and the sentence as the caption.

## UI conventions (both apps)

- **Converter = draft + Convert button** (user, 2026-10-20): **don't convert while the wheels
  turn.** The wheels edit a draft (a JDN + direction); Convert scrolls to the result, shows a
  skeleton + "Converting…" for 550 ms, then applies. The result always shows the last *applied*
  conversion with a "showing the previous result" note when the wheels moved since.
- Wheel pickers (native date pickers can't show Hijri months): 44 dp rows, 5 visible, snapping.
- Tabs: a pager that follows the finger; **in Arabic the pages and the tab bar mirror together**.
  Tool pages slide in from the reading direction's end.
- Loading: the system splash (night `#110D2E`, 120 dp emblem) hands off to an animated loading
  screen whose first frame is identical; min 1.2 s. Respects reduced motion.
- Counted phrases ("3 years and 2 months", "٣ سنوات وشهران") come from `Plural`, not i18next
  plurals. **After a preposition** ("بعد {{days}}") use `countPhrase(…, afterPreposition = true)`:
  Arabic then needs the genitive dual (بعد يومين — "بعد يومان" was a real v1 bug).
- Arabic UI shows Arabic-Indic digits (`localizeDigits`); Gregorian month names are Levantine.
- New strings go in **both** `en.json` and `ar.json`, in both apps' copies (CI compares them).
- Colours only from theme tokens ("Lunar Indigo": indigo primary `#4B3AC0` / dark `#A99CFF`, gold
  accent, hero gradient `#2B1F7A → #5A47D6`, all text pairs ≥ 4.5:1); icons only lucide; touch
  targets ≥ 48 dp/pt; body text ≥ 16.
- **App icon / emblem**: gold crescent holding a small sun inside two conversion arrows on the
  indigo tile. Geometry lives in `android/scripts/generate-icons.js` and both apps' `AppLogo` —
  keep them in sync.

## Gotchas

- **Android regex is ICU**: `\d` matches all Unicode digits (Arabic-Indic too) and `(?U)` throws —
  JVM tests pass either way. Use explicit `[0-9]`.
- Android draws elevation before zIndex — overlapping elements need a higher elevation.
- Windows: a shell whose working directory is inside a folder keeps it from being renamed/deleted.
- Emulators are shared with other Claude sessions: always `adb -s <serial>`, never `adb kill-server`.
  This project uses AVD **Pixel_7** on port **5560** (`emulator -avd Pixel_7 -port 5560`).
- UI Automator can't dump a screen that animates forever (v1's onboarding/loading) — turn animator
  scales off for scripted runs, back on for visual checks.
