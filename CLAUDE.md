# Hijri Converter (محوّل التاريخ) — Gregorian ⇄ Hijri, Shia calendar

A bare **React Native CLI** (TypeScript) app that converts dates between the Gregorian and Hijri
calendars following **Shia calendar authorities**, bilingual (English / Arabic with RTL), light and
dark themes, fully offline. Home (converter) + Settings tabs, onboarding, animated loading screen.

See [`CONTINUE_PROJECT.md`](./CONTINUE_PROJECT.md) for a handoff snapshot if you're picking this up
fresh, [`TODO.md`](./TODO.md) for the phased checklist (source of truth for "what's done"), and
[`help.md`](./help.md) for the command cheat sheet.

**Project skills** (`.claude/skills/`) — check these before the matching kind of work:
- `verify` — **read before running `yarn test` / `yarn typecheck` / a Gradle build.** Don't run any
  of them proactively; the user wants an explicit "test it" / "build it" first.
- `update-hijri-data` — refreshing Iran's official month data, recording a new announcement,
  re-calibrating the crescent rules, regenerating the tables.

**This is bare RN CLI, not Expo** — same as the sibling `lexitoon`, unlike `prayer-times-lb`.
`android/` and `ios/` are real, checked-in native projects you edit directly.

## Stack

- React Native **0.87.1** (New Architecture, Hermes), TypeScript. 0.87.1 rather than the newer
  0.88.0 on purpose: 0.88 was 5 days old when this was scaffolded, and 0.87.1 is what lexitoon
  already builds with on this machine. Native libs are pinned to lexitoon's proven versions
  (reanimated 4.6.0 + worklets 0.12.1, gesture-handler 3.2.1, screens 4.27.0, svg 15.15.5).
- **Yarn 1 (classic) only** — never npm. The RN template pins Yarn 3 via `.yarnrc.yml`; that was
  removed so plain `yarn` behaves like in prayer-times-lb.
- Navigation: `@react-navigation/native` + `native-stack` for the root (Onboarding → Main), and
  **prayer-times-lb's live-drag tab pager** for Main (see "Tabs pager" below). Native headers are
  off everywhere (`headerShown: false`).
- State: `zustand` + `persist` over AsyncStorage ([`src/store/useSettingsStore.ts`](./src/store/useSettingsStore.ts))
  — language, theme mode, calculation method, ±2-day adjustment, onboarding flag. Same pattern as
  prayer-times-lb.
- i18n: `i18next` + `react-i18next`, device language via `react-native-localize`. RTL is
  **JS-driven** through [`useDirection`](./src/hooks/useDirection.ts) (instant switch, no restart),
  exactly like the sibling apps — native `I18nManager` RTL is deliberately off, so every
  direction-sensitive layout mirrors itself via `rowDirection` / `textAlign` / `isRTL`.
- Animation: `react-native-reanimated` v4 (Babel plugin is `'react-native-worklets/plugin'`, not
  the old reanimated one) + `react-native-gesture-handler` (imported first in `index.js`).
- Icons: `lucide-react-native` (SVG, one consistent stroke family — no emoji icons).
- Native splash: `react-native-bootsplash` → hands off to the animated JS
  [`LoadingScreen`](./src/components/LoadingScreen.tsx).
- Path alias: none — relative imports (no babel module-resolver needed in RN CLI).

## Calendar engine — read before touching `src/core/`

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
default they picked (Iran started 1423 on Sat 16 Mar → 7 Muharram). This was flagged to them;
the golden test asserts the example under `fadlallah`. If they want the example to hold by
default, change `DEFAULT_METHOD` in [`src/core/hijri/methods.ts`](./src/core/hijri/methods.ts).

### How it's built

- **Everything is precomputed at build time** by [`scripts/build-hijri-tables.js`](./scripts/build-hijri-tables.js)
  (Node + `astronomy-engine`, a devDependency only) into
  [`src/core/hijri/tables.generated.ts`](./src/core/hijri/tables.generated.ts): per method, the
  JDN of 1 Muharram 1343 + one 12-bit mask per Hijri year (bit = 30-day month), 1343–1500 AH
  (1924–2077). ~3 KB total. The phone never runs astronomy code.
- Crescent rule (all computed methods): from a month's day 1 at civil date S, evaluate the evening
  of day 29 (civil S+28) — visible → next month starts S+29, else the month completes 30 days.
  Self-correcting (an anchor error fades within a month or two).
- Visibility = **Odeh's criterion** (Odeh 2004): at best time Tb = sunset + 4/9·lag,
  `V = ARCV − (−0.1018W³ + 0.7319W² − 6.3226W + 7.1651)` with airless topocentric ARCV (deg) and
  crescent width W (arcmin). Zones: ≥5.65 naked eye; 2–5.65 optical aid, maybe naked eye;
  −0.96–2 optical aid only.
- **Calibration** (`node scripts/build-hijri-tables.js --calibrate`): Iran predictor vs. 573 real
  months (1400–1447 AH) → **V ≥ 2: 91.1% exact, every miss within one day** (9 early / 42 late).
  Fadlallah rule reproduces all 5 known office dates (1423/1, 1432/9, 1435/10, 1446/10, 1447/10).
- Runtime ([`src/core/hijri/`](./src/core/hijri/)): binary search over decoded month starts.
  Outside 1343–1500 AH the **arithmetic (tabular civil) calendar** takes over, *shifted to continue
  seamlessly from each method's table edge* (unshifted, one Gregorian day mapped to "1 Muharram
  1343" twice and round-trips broke — see `seamOffsets` in `convert.ts`). Such dates are labelled
  "Approximate".
- Every conversion goes through an integer **JDN** ([`src/core/calendar.ts`](./src/core/calendar.ts)).
  The Fliegel–Van Flandern formula **must use truncating division** (`Math.trunc`). prayer-times-lb's
  `hijri.ts` uses `Math.floor` there, which drifts 1–2 days by month/leap-cycle position (it gives
  9 Muharram for the user's example); a calibrated epoch hid it for July 2026. Don't copy that file.
- Manual adjustment (−2…+2): Hijri(G) = table(JDN(G) + adj); Gregorian(H) = JDN(H) − adj.
- `DateSource` labels: `official` (Iran published / Umm al-Qura), `calculated` (rule-based),
  `approximate` (tabular fallback).
- Sighting calendars can have **353- or 356-day years** (Iran's real data has them) — only
  arithmetic calendars are limited to 354/355. The integrity test asserts 353–356 on purpose.

### Occasions, eve hint

- [`src/core/occasions.ts`](./src/core/occasions.ts): 44 Twelver occasions (researched against
  Iran's official holidays, Sistani's office/I.M.A.M. lists, Fadlallah's office, WikiShia). Where
  narrations differ, Iran/Lebanon's date is used and the alternative is noted inline.
  `lastDayOfMonth` entries (Imam al-Rida — end of Safar; Imam al-Jawad — end of Dhu al-Qi'dah)
  resolve to the 29th or 30th.
- **Day change = midnight, with an "eve" hint after Maghrib** (user's choice). Maghrib = sun 4.5°
  below the horizon (prayer-times-lb's verified Jafari angle) **at Beirut**, no location permission
  ([`src/core/maghrib.ts`](./src/core/maghrib.ts)). Test asserts Al Sirat's published Beirut
  Maghrib (2026-07-12 20:11) within a minute.

## UI architecture

- **Tabs pager** ([`MainTabs.tsx`](./src/navigation/MainTabs.tsx)): ported from prayer-times-lb —
  all pages side by side, the row live-translates with the finger, snaps on release/fling.
  `failOffsetY` keeps vertical drags (scrolling, wheels) from starting a tab swipe. **In Arabic the
  row and the tab bar mirror together** (first tab on the right) — lexitoon proved that mirroring
  only one of them feels inconsistent. Screens reach tabs via `useTabPager().goToTab()`.
- **Wheel picker** ([`WheelPicker.tsx`](./src/components/picker/WheelPicker.tsx)): native date
  pickers can't show Hijri months. A **plain ScrollView, not a FlatList** — the wheels sit inside
  the Home screen's vertical ScrollView, and a same-direction VirtualizedList nested there
  triggers RN's "VirtualizedLists should never be nested inside plain ScrollViews" error (the
  first on-device run showed it). Lists are ≤ ~200 rows; rows are `memo`ized by emphasis level so
  a centered-index change re-renders only 3–5 rows. Static selection band + SVG fades, **not**
  per-row Reanimated styles. Settles on momentum end or, for slow drags, 120 ms after release.
  `adjustable` accessibility role with increment/decrement. Content has 2 rows of padding, so
  scroll offset `i·h` centers row i; initial position is applied once both `onLayout` and
  `onContentSizeChange` have fired (Android ignores an earlier `scrollTo`).
- **Converter = draft + Convert button** ([`ConverterSection.tsx`](./src/components/home/ConverterSection.tsx)),
  per the user (2026-10-20): **don't convert while the wheels turn.** The wheels edit a *draft*
  (a JDN + direction); **Convert** scrolls Home to the result card
  ([`HomeScrollContext`](./src/components/home/HomeScrollContext.tsx) — `measureLayout` against
  one content view wrapping every section, so its offset *is* the scroll position), shows
  [`ResultSkeleton`](./src/components/home/ResultSkeleton.tsx) + "Converting…" for
  `MIN_CONVERTING_MS` (550 ms), then applies and fades the result in. The lookup itself takes
  well under 1 ms — the minimum duration is there so the feedback is readable and the scroll
  finishes first. The result card always shows the last *applied* conversion and, when the
  wheels/direction moved since, an "showing the previous result" note. Switching direction keeps
  the draft's day; changing method/adjustment re-labels the applied result instantly. The busy
  Convert button uses `PressableScale dimWhenDisabled={false}` (busy ≠ unavailable).
- **Loading**: bootsplash (night `#110D2E`, 120 dp emblem) → `LoadingScreen`, whose first frame is
  identical, so `BootSplash.hide({ fade: false })` is invisible; then arrows spin, stars twinkle,
  min 1.2 s (`MIN_LOADING_VISIBLE_MS` in `App.tsx`). Respects reduced motion.
- **Onboarding**: 4 slides, original animated SVG art ([`Illustrations.tsx`](./src/components/onboarding/Illustrations.tsx)),
  horizontal FlatList `inverted` in Arabic, language switch on the first screen, replayable from
  Settings (`replay` param → goBack instead of reset).
- Counted phrases ("3 years and 2 months", "٣ سنوات وشهران") come from
  [`src/i18n/plural.ts`](./src/i18n/plural.ts), **not** i18next plurals — those need
  `Intl.PluralRules`, which Hermes doesn't reliably provide, and Arabic needs 6 CLDR forms.
- Arabic UI shows Arabic-Indic digits via `localizeDigits()`; Gregorian month names are Levantine
  (كانون الثاني…), as Lebanese calendars print them.

## Design system ("Lunar Indigo")

Generated with the `ui-ux-pro-max` skill (installed globally at `~/.claude/skills/ui-ux-pro-max`
for this project; it recommended "spiritual purple + warm gold"). Tokens in
[`src/theme/colors.ts`](./src/theme/colors.ts) — indigo primary `#4B3AC0` / dark `#A99CFF`, gold
accent, hero gradient `#2B1F7A → #5A47D6`. All text pairs ≥ 4.5:1. System fonts (proper Arabic
shaping for free). 4/8 dp spacing, 48 dp touch targets, body ≥ 16.

**App icon**: original — gold crescent (Hijri) holding a small sun (Gregorian) inside two
conversion arrows, on the indigo tile. Geometry lives in **two places that must stay in sync**:
[`AppLogo.tsx`](./src/components/brand/AppLogo.tsx) and [`scripts/generate-icons.js`](./scripts/generate-icons.js)
(which writes `assets/brand/*.svg` + every Android/iOS icon). Native splash is regenerated from
`assets/brand/splash-logo.svg` (command in help.md).

## Known gotchas hit during setup

- **RN CLI init bugs** (same as lexitoon): Kotlin sources landed in `java/com/com.devlance.hijriconverter/`
  (fixed to `java/com/devlance/hijriconverter/`), and `package.json` "name" was the package id.
- RN 0.87 removed `StatusBar` `backgroundColor`/`translucent` props (edge-to-edge is the default)
  and `StyleSheet.absoluteFillObject` (use `StyleSheet.absoluteFill`, now a plain object).
- **Never wrap `Pressable` with `Animated.createAnimatedComponent`** — it silently stops receiving
  touches on RN 0.87 + Reanimated 4 + Fabric (lexitoon's hard-won lesson). Use
  [`PressableScale`](./src/components/ui/PressableScale.tsx) (plain Pressable, animated child).
- Android draws by **elevation before zIndex** — an overlapping element (the converter's arrow
  bubble) needs a higher `elevation` than the cards it overlaps.
- `MainActivity.onCreate` uses `RNScreensFragmentFactory` + `RNBootSplash.init` (react-native-screens
  ≥ 4.16 variant from the bootsplash docs). Don't drop either.
- **"ninja: error: Stat(…): Filename longer than 260 characters"** on the first build. The
  New-Architecture codegen object paths embed the project path twice
  (`…/.cxx/RelWithDebInfo/<hash>/arm64-v8a/rngesturehandler_codegen_autolinked_build/CMakeFiles/…/D_/workspace/me/Gregorian-hijri-date-converter/node_modules/react-native-gesture-handler/shared/shadowNodes/…`,
  393 chars). CMake only hash-shortens object paths when the result fits in 250 chars, and this
  project's path is 22 chars longer than lexitoon's — just enough to break it. Windows
  `LongPathsEnabled` is already 1 on this machine, but the SDK's default CMake 3.22.1 bundles Ninja
  1.10.2, which ignores it. **Fix: `android/app/build.gradle` pins `externalNativeBuild.cmake.version
  "3.31.6"` (Ninja 1.12.1, long-path aware)**; it was installed with
  `sdkmanager "cmake;3.31.6"` and AGP auto-downloads it elsewhere. Don't remove the pin.
- `.gitattributes` forces LF on `android/gradlew` (this machine has `core.autocrlf=true`).

### Found on the first emulator run (2026-10-20)

- **Never size an `<Svg>` background with `width="100%"`/`height="100%"`** (or `%` inside it).
  On Android it was resolved once and didn't follow its parent as content grew — the Today card's
  gradient stopped at ~85% width / short of the bottom, leaving text and the watermark hanging
  outside it. Use [`GradientFill`](./src/components/ui/GradientFill.tsx) (measures the parent with
  onLayout, draws at pixel size) and give the parent a solid fallback `backgroundColor`.
- **Don't toggle `backgroundColor` on a rounded view to show a selected state inside a ripple
  `Pressable`** — the tab bar's pill rendered as a square after switching tabs (Fabric, Android).
  The pill now keeps a permanently painted, rounded highlight layer and only toggles its
  `opacity`; the tab buttons use a pressed-opacity instead of `android_ripple`. Other rounded
  views (cards, tiles, chips) survived theme switches fine — this was specific to that combination.
- **Same-direction VirtualizedList inside a ScrollView** → red "VirtualizedLists should never be
  nested…" console error. The wheel picker is a plain ScrollView for this reason (see above).
- **Two library warnings are patched with patch-package** (`patches/`, applied by `postinstall`):
  - `react-native+0.87.1.patch` — adds `./src/private/*` to RN's `exports` (RN's own
    `@react-native/virtualized-lists` imports `src/private/featureflags/…`; Metro warned on every
    bundle). Same patch as lexitoon.
  - `react-native-gesture-handler+3.2.1.patch` — creates the legacy `DrawerLayoutAndroid` wrapper
    lazily, so importing gesture-handler no longer reads RN's deprecated `DrawerLayoutAndroid`
    getter ("DrawerLayoutAndroid is deprecated…" on every launch). Metro loads gesture-handler's
    TS source (`src/`, via its `react-native` field), so that's what the patch edits.
  Re-check both when upgrading RN or gesture-handler; delete a patch once upstream fixes it.
- RN 0.87's LogBox shows warnings only as "Open debugger to view warnings". To read them without a
  debugger: `adb logcat -s ReactNativeJS:V` (every `console.*` lands there).
- **"Rendered more hooks than during the previous render" with `performReactRefresh` in the
  stack is a Fast Refresh artifact**, not an app bug: saving a component that gained/lost hooks
  while the user is interacting makes React try to keep the old instance's state. Reload the app
  (`r` in Metro). A clean relaunch + 10 rapid taps on the converter's direction toggle showed no
  error. Only investigate if it reproduces after a full reload.
- On Windows (no watchman) **Metro can hang after `yarn add` rewrites `node_modules` under it** —
  `/status` stops answering and the app sits on the native splash. Restart it with
  `yarn start --reset-cache` (the `--reset-cache` also matters after patch-package changes).
- On Windows, run Gradle directly (`cd android && ./gradlew …`) — lexitoon found
  `npx react-native run-android`'s Gradle spawn unreliable here. See help.md.

## Commands

```
yarn install            # deps (Yarn 1 only)
yarn start              # Metro
yarn android            # build + install + run (or Gradle directly, see help.md)
yarn test               # Jest — calendar engine golden tests
yarn typecheck          # tsc --noEmit
yarn lint               # eslint
yarn bump [patch|minor|major] [--dry-run]   # version bump (package.json + build.gradle + pbxproj)
node scripts/build-hijri-tables.js [--calibrate]   # regenerate / re-check the month tables
node scripts/generate-icons.js                     # regenerate launcher icons
```

## Conventions to keep following

- Yarn, not npm. Relative imports.
- Every new direction-sensitive layout mirrors by hand via `useDirection()`.
- New user-facing strings go in **both** `src/i18n/locales/en.json` and `ar.json`.
- Colors only from theme tokens; icons only from lucide; touch targets ≥ 48 dp.
- Keep `TODO.md` checkboxes current; keep this file current when a convention or calendar
  constant changes.
