# 🛠 Help — Hijri Converter (bare React Native CLI)

Quick command reference and troubleshooting cheat sheet. This project is **bare React Native
CLI** (like `lexitoon`, unlike the Expo-based `prayer-times-lb`) — `android/` and `ios/` are real,
checked-in native projects; there is no `expo prebuild`.

> ⚠️ **Yarn only** (Yarn 1 / classic) — never use `npm` in this repo.

---

## 🚀 Daily commands

```bash
yarn install        # install deps
yarn start          # Metro bundler
yarn android        # build + install + run on a connected device/emulator
yarn ios            # build + install + run (macOS + Xcode only)
yarn test           # jest — calendar engine golden tests (~10 s)
yarn typecheck      # tsc --noEmit
yarn lint           # eslint
```

```bash
yarn start --reset-cache          # Metro with a cleared bundler cache
npx react-native doctor           # diagnose toolchain/env issues
```

---

## 🔢 Version bumping

Nothing auto-increments on local builds — bump before a store release
(`versionCode` must be higher than the last Play Store upload):

```bash
yarn bump                    # build number only: android versionCode +1 (+ iOS CURRENT_PROJECT_VERSION)
yarn bump patch              # 1.0.0 -> 1.0.1  + build number
yarn bump minor              # 1.0.0 -> 1.1.0  + build number
yarn bump major              # 1.0.0 -> 2.0.0  + build number
yarn bump patch --dry-run    # preview without writing anything
```

Updates `package.json` (source of truth — Settings → About shows it), `android/app/build.gradle`
(`versionCode` / `versionName`) and `ios/HijriConverter.xcodeproj/project.pbxproj`
(`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`) in place — see `scripts/bump-version.js`.

---

## 🌙 Calendar data

```bash
node scripts/build-hijri-tables.js --calibrate   # accuracy of the crescent rules vs. real data (no writes)
node scripts/build-hijri-tables.js               # regenerate src/core/hijri/tables.generated.ts (~30 s)
yarn test                                        # always run after regenerating
```

Updating Iran's official data (newer months) or recording a new announcement: see
`.claude/skills/update-hijri-data/SKILL.md`.

---

## 🎨 Icons & splash

```bash
node scripts/generate-icons.js     # launcher icons (Android legacy/adaptive/monochrome + iOS 1024) + assets/brand/*.svg

# native splash, from the emblem the script above writes
yarn react-native-bootsplash generate assets/brand/splash-logo.svg \
  --platforms=android,ios --background=110D2E --logo-width=120 --assets-output=assets/bootsplash
```

Keep `--background` equal to `brand.night` and `--logo-width` equal to `LOGO_SIZE` in
`src/components/LoadingScreen.tsx`, or the native → JS hand-off visibly jumps. The generator
re-writes `AndroidManifest.xml` / `styles.xml` formatting — check `git diff` after running it.

---

## 📵 "Unable to load script" / Metro connection issues

```bash
yarn start                        # make sure Metro is running
adb reverse tcp:8081 tcp:8081     # forward device → Metro over USB
adb devices                       # check the device is attached (not "offline")
adb kill-server && adb start-server   # if it shows "offline"
```

---

## 🪟 Windows: building without `yarn android`

lexitoon found that `npx react-native run-android` can fail on this machine with
`'gradlew.bat' is not recognized` (a Node child-process quirk). Build with Gradle directly:

```bash
cd android && ./gradlew installDebug && cd ..          # debug build on the connected device (then `yarn start`)
cd android && ./gradlew assembleRelease && cd ..       # standalone APK → android/app/build/outputs/apk/release/
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a && cd ..   # faster: phone ABI only
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.devlance.hijriconverter/.MainActivity
```

Gradle needs JDK 17 (`JAVA_HOME=C:\Program Files\Java\jdk-17` on this machine).

**"ninja: error: Stat(…): Filename longer than 260 characters"** — Windows path limit hit by the
native codegen build (this repo's path is long). Already fixed: `android/app/build.gradle` pins
CMake **3.31.6** (Ninja 1.12, long-path aware). Requirements if it ever comes back:

```bash
sdkmanager "cmake;3.31.6"                         # (AGP also auto-downloads it)
reg query HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled   # must be 0x1
cd android && ./gradlew clean && cd ..            # drop the stale .cxx built with the old Ninja
```

---

## 🔑 Release keystores (Android)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
# CN=Hijri Converter, OU=DV, O=Devlance, L=Beirut, ST=Beirut, C=LB
```

Place it under `android/app/` and wire it in `android/app/build.gradle` → `signingConfigs`. Until
then, release builds are signed with the template's `debug.keystore` (fine for side-loading, not
for the Play Store). `*.keystore` (except `debug.keystore`) is git-ignored — back it up elsewhere.

```bash
cd android && ./gradlew bundleRelease && cd ..      # AAB  → android/app/build/outputs/bundle/release/
cd android && ./gradlew signingReport && cd ..      # SHA-1 / SHA-256 fingerprints
```

---

## 🧹 Cleaning / cache nukes

From least to most destructive:

```bash
yarn start --reset-cache                                        # Metro bundler cache
cd android && ./gradlew clean && cd ..                          # Gradle build outputs
rm -rf android/app/build android/.gradle android/.cxx android/build
rm -rf ~/.gradle/caches ~/.gradle/daemon                        # global Gradle caches
rm -rf node_modules && yarn install                             # dependency reset
```

```bash
cd ios && pod install && cd ..          # after any native iOS dependency change (macOS only)
```

---

## 📡 Android wireless debugging (adb over Wi-Fi)

1. On the phone: **Developer Options → Wireless Debugging → Pair device with pairing code**
2. `adb pair <ip>:<port>` (ip:port + code from the pairing dialog)
3. `adb connect <ip>:<port>` (ip:port shown at the **top** of the Wireless Debugging screen)
4. `adb disconnect` when done

---

## 🔗 Useful links

- React Native — <https://reactnative.dev/docs/getting-started>
- React Navigation — <https://reactnavigation.org/docs/getting-started>
- Reanimated v4 — <https://docs.swmansion.com/react-native-reanimated/>
- react-native-bootsplash — <https://github.com/zoontek/react-native-bootsplash>
- qamari (Iranian lunar calendar data, CC0) — <https://github.com/roozbehp/qamari>
- astronomy-engine — <https://github.com/cosinekitty/astronomy>
