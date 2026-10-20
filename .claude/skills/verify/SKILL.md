---
name: verify
description: This project's verification policy — read before running yarn test, yarn typecheck, yarn lint, a Gradle build or an emulator run. Do not run any of these proactively; only when the user explicitly asks to test/verify/build.
---

# Verification policy for Hijri Converter

**Do not run `yarn test`, `yarn typecheck`, `yarn lint`, Gradle builds or emulator runs unless the
user explicitly asks you to test, verify or build.** This is the user's standing preference across
all their projects (it has cost real budget before). Make the change, explain what you did and why
you're confident in it, and stop. Wait for an explicit "test it" / "verify this" / "build it".

## When the user does ask, match the check to the change

- **Calendar engine** (`src/core/**`, `scripts/build-hijri-tables.js`, the generated table):
  `yarn test` is the right and only check (~10 s). It holds the golden fixtures: the user's
  2002-03-22 example, every published Iranian month start, Umm al-Qura vs ICU daily 1990–2050,
  round-trips for every day of every table, the Al Sirat Maghrib fixture. No build needed.
- **Type-only / non-visual changes** (a type, a util, a store field): `yarn typecheck` alone.
- **i18n string changes**: re-read the edited JSON and confirm the key matches its `t('...')` call
  site, in both `en.json` and `ar.json`. Nothing to run.
- **Native changes** (`android/**`, a new native dependency, bootsplash/icon regeneration): one
  Gradle build — `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`
  (release also runs the Metro bundle + Hermes compile, catching broken imports). Not via
  `yarn android` on Windows (see help.md).
- **UI/visual changes**: the only case that needs a device/emulator. Take at most one screenshot
  after all edits are done — never after every intermediate edit. Check both themes and Arabic
  only if the change touches them.

## Related

- `update-hijri-data` — refreshing Iran's official data / recording an announcement /
  re-calibrating. That workflow *does* include running `--calibrate` and `yarn test`, because
  regenerated data must never ship untested.
