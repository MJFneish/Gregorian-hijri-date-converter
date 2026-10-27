---
name: verify
description: This project's verification policy — read before running the Android unit tests, a Gradle build, an emulator run, or waiting on the iOS CI. Covers when to test and which check fits which change, on both apps.
---

# Verification policy for Hijri Converter

Outside feature work, **don't run tests, builds or emulator runs unless the user asks** ("test it",
"build it"). Inside the per-feature release cycle (`~/.claude/CLAUDE.md`, "Personal APK projects"),
testing is part of every feature: unit tests + the emulator for Android, CI for iOS.

## Match the check to the change

- **Calendar engine** (Kotlin `core/**`, Swift `HijriCore`, `android/scripts/build-hijri-tables.js`,
  the generated tables): the unit tests are the right check — `yarn test` in `android/` (~30 s) and
  `swift test` on CI. They hold the golden fixtures: the user's 2002-03-22 example, every published
  Iranian month start, Umm al-Qura vs ICU daily 1990–2050, round-trips for every day of every
  table, the crescent forecast reproducing the Sistani/Iran tables, the Al Sirat Maghrib fixture.
- **Settings / storage / table updates** (`data/**`, Swift `App/`): unit tests (`DataTest`,
  `AppLogicTests`). The v1 → v2 migration can only be checked on the emulator: install the real
  1.10.0 APK (kept outside the repo; rebuild from tag v1.10.0 if lost), change settings, install v2
  over it.
- **i18n strings**: re-read the edited JSON in both languages; both apps' copies must stay
  identical (CI's shared-data job).
- **Android UI**: `./gradlew.bat assembleDebug`, install on emulator-5560 (AVD Pixel_7, port 5560 —
  other sessions use other emulators; always `adb -s emulator-5560`), take the minimum screenshots
  after the feature is done, in English and Arabic, light and dark only where the change touches
  them.
- **iOS UI**: push, wait for the CI `ios` job, download the `ios-screenshots` artifact (GitHub API
  with the git credential token) and look at it. Nothing iOS can be checked on this machine.
- **Release APK**: `yarn build:apk` in `android/` (R8 minification catches what debug builds don't).

## Related

- `update-hijri-data` — refreshing Iran's official data / recording an announcement /
  re-calibrating. That workflow *does* include `--calibrate` and the tests, because regenerated
  data must never ship untested.
