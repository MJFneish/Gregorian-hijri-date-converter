# Continue this project

If you're a Claude session picking this up cold, read this first, then `CLAUDE.md`, then
`TODO.md`. This file is a snapshot — trust `TODO.md`'s checkboxes and the actual code over this
file's prose if they disagree.

## What this is

**Hijri Converter / محوّل التاريخ** — a bare React Native CLI (TypeScript) app converting dates
between the Gregorian and Hijri calendars following **Shia** calendar authorities, EN/AR (RTL),
light/dark, offline. Built end-to-end in one session (2026-10-20) from an empty repo while the user
was away, after a short Q&A up front.

## Decisions the user made (don't re-litigate)

| Question | Answer |
|---|---|
| Framework | Bare RN CLI ("react native app with cli"), built "like the previous apps in `me/`" |
| App name / package | "Hijri Converter" (Arabic launcher label "محوّل التاريخ"), `com.devlance.hijriconverter` |
| Default calculation method | **Iran official (Khamenei office)** — even though their own example matches Fadlallah (see below) |
| Method switch in Settings | Yes, all methods (Iran / Fadlallah / Sistani / Umm al-Qura as Sunni reference) |
| When "today" changes | **Midnight, plus an "eve of …" hint after Maghrib** |
| Home extras | Today card, Shia occasions, copy & share, days-between — all four |
| Tabs | Home + Settings, swipeable like prayer-times-lb; Settings like prayer-times-lb with a different primary color |
| Design / colors / icon / onboarding art | Left to Claude ("choose from your decision") → "Lunar Indigo" + gold, original crescent-and-sun icon, original animated SVG art |
| Verification during the session | typecheck + tests + one Android build were explicitly allowed (exception to the global no-proactive-testing rule, this session only) |
| Git | One commit per phase on `develop`, nothing pushed |

**The open tension to mention to the user if dates come up:** their ground truth
(2002-03-22 = Friday 8 Muharram 1423) is reproduced by the **Fadlallah** method. Iran's official
calendar started 1423 a day later (Sat 16 Mar), so with the Iran default the app shows
**7 Muharram** for that day. They chose Iran knowingly after this was shown in a comparison table;
switching the default is one line (`DEFAULT_METHOD` in `src/core/hijri/methods.ts`).

## How the calendar data was obtained (don't re-derive from scratch)

Two background research agents ran at the start:
1. **Shia month determination**: Sistani = naked-eye, same horizon; Khamenei/Iran = telescopes
   accepted, local horizon, Istihlal committee; Fadlallah = calculation, visibility anywhere
   sharing the night. Found the CC0 `qamari` dataset of Iran's official month starts
   (1265/1–1447/10). No npm Hijri package produces Shia dates (all are Umm al-Qura or tabular).
2. **Occasions**: 44 Twelver occasions with Iran/Lebanon dates and noted alternatives.

Then `scripts/build-hijri-tables.js` was written and calibrated: Iran predictor V ≥ 2 → 91.1%
exact over 573 real months; Fadlallah rule → 5/5 known dates. Details in CLAUDE.md.

## State as of this handoff

- **Code-complete** for the requested scope: scaffold, calendar engine, Home (Today card,
  converter, copy/share, days-between), Settings, onboarding, loading screen + native splash,
  icon, docs, bump script, project skills.
- **Verified**: `yarn test` 34/34 (engine), `yarn typecheck` clean, `yarn lint` 0 errors
  (style warnings only).
- **Android build**: BUILD_RESULT_PLACEHOLDER
- **Not verified**: anything visual/interactive on a real device or emulator — no device was
  connected and the user asked for no emulator/screenshots this session. The first `yarn android`
  run is the first time anyone sees the UI. Most likely things to need tuning on-device: wheel
  picker settle feel (`SETTLE_DELAY_MS`, Android `decelerationRate`), the onboarding illustration
  proportions on small screens, and the loading-screen → native-splash hand-off alignment.

## Next steps a fresh session might be asked for

1. Run on a device and polish (see "Not verified" above), then tick TODO Phase 5.
2. Ideas parked in TODO.md (month grid, widget, GPS Maghrib, data overrides) — ask first.
3. Keep Iran's data current — `.claude/skills/update-hijri-data`.

## Unrelated finding for the sibling project

`prayer-times-lb/src/core/hijri.ts` computes the Julian Day Number with `Math.floor` where the
Fliegel–Van Flandern formula needs truncation; the error (1–2 days) varies by month and year and
was hidden by an epoch calibrated on July 2026 only — it gives 9 Muharram for 2002-03-22. Reported
to the user; **not** changed from this project.
