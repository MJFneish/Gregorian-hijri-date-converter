# TODO

Phased checklist — keep it honest; it's the fastest way for a fresh session to see what's real.
v1 (React Native, up to 1.10.0) is done and removed; its history is in git (tag `v1.10.0`).

## v2 — native rewrite (user request, 2026-10-27)

Android (Kotlin + Compose) and iOS (Swift + SwiftUI), every feature on both, tested (Android: unit
tests + emulator; iOS: GitHub Actions), committed, pushed, bumped (`2.0.0-alpha.N`), tagged and
released on GitHub. One APK at the end of the round.

- [x] Phase 1 — Android project skeleton: same app id, signing key and launcher activity as v1
      (installs over 1.10.0 as an update), splash, icons, version tooling (2.0.0-alpha.1)
- [x] Phase 2 — Android calendar engine in Kotlin + every v1 Jest suite ported to JUnit (alpha.2)
- [x] Restructure into `android/` + `ios/`, v1 removed (user: "also do the ios too")
- [x] iOS catch-up — XcodeGen project, `HijriCore` Swift package with the engine (Astronomy
      Engine's C edition for the crescent maths), the same 57 unit tests, CI on macOS (alpha.3)
- [x] Phase 3 — app shell on both: settings + v1 migration (Android, verified by installing over
      the real 1.10.0 APK), month-table updates, strings, theme, loading screen, onboarding, tabs,
      Settings tab, Tools list (tool pages are placeholders until phases 5–6) (alpha.4)
- [x] Phase 4 — Converter on both: Today card (tonight's moon, eve hint, next occasion), wheels,
      draft + Convert, result with the moon, copy, share as image (Android: Compose snapping
      wheels, share via an off-screen graphics layer; iOS: native wheel pickers, ImageRenderer +
      share sheet) (alpha.5)
- [x] Phase 5 — Tools on both: compare offices, occasions (+ share), days between (shared
      DateField + date-picker sheet) (alpha.6)
- [x] Phase 6 — Tools on both: Hijri birthday, fasting days, crescent forecast (computed off
      the main thread) (alpha.7)
- [x] Phase 7 — final parity check on both, docs, 2.0.0, release APK (R8 release build checked on
      the emulator: crescent maths, share, update check; installs over 1.10.0)

## Not done / out of reach here

- iOS can't be built or run on this Windows machine — only on CI (simulator UI smoke tests).
- No App Store / Play Store publishing (needs accounts).
