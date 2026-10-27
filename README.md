# Hijri Converter — محوّل التاريخ

Gregorian ⇄ Hijri date converter following **Shia calendar authorities**, native on Android
(Kotlin + Jetpack Compose) and iOS (Swift + SwiftUI). English and Arabic (RTL), light and dark
themes, works offline.

- **Methods**: Iran's official calendar (default — real published month starts through Shawwal
  1447, calculated after), Sayyed Fadlallah's office (astronomical, shared-night visibility), Sayyed
  Sistani's office (naked-eye at Najaf), and Umm al-Qura for reference. ±2-day manual adjustment.
  Corrected month starts arrive without an app update (`data/hijri-tables.json`).
- **Converter**: today in both calendars with tonight's moon, Shia occasions and the "eve of …" hint
  after Maghrib; a two-way converter with wheel pickers, copy and share-as-image.
- **Tools**: compare offices, occasions, Hijri birthday, fasting days, crescent forecast, days
  between.

| | |
|---|---|
| `android/` | the Android app (Gradle project) + tooling (`yarn` scripts in `android/package.json`) |
| `ios/` | the iOS app (XcodeGen `project.yml`) + the `HijriCore` Swift package (engine, `swift test`) |
| `data/hijri-tables.json` | month tables the installed apps download |

```bash
cd android
yarn install
yarn test                    # Android unit tests
./gradlew.bat assembleDebug  # debug APK
yarn build:apk               # release APK in android/dist/
```

iOS is built and tested by GitHub Actions on macOS (`.github/workflows/ci.yml`); locally on a Mac:
`cd ios && xcodegen generate && open HijriConverter.xcodeproj`, or `cd ios/HijriCore && swift test`.

Docs: [`CLAUDE.md`](./CLAUDE.md) (architecture and the calendar engine), [`TODO.md`](./TODO.md).

Data and credits: Iranian month starts from [qamari](https://github.com/roozbehp/qamari) (CC0);
astronomy by [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT); moon texture from
NASA's Scientific Visualization Studio (LRO, public domain); icons from [Lucide](https://lucide.dev)
(ISC).
