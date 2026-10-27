// swift-tools-version:5.9
// The Hijri Converter engine and app logic for the iOS app: a step-by-step port of the Android
// app's Kotlin engine (android/app/src/main/java/com/devlance/hijriconverter/core and data), with
// the same unit tests (the user's 2002-03-22 example, every published Iranian month start, Umm
// al-Qura vs ICU, the crescent forecast reproducing the build-time tables, the moon, …).
//
// CAstronomy is Astronomy Engine's single-file C edition (v2.1.19, MIT) — the library and version
// the month tables are built with; it has no Swift edition. Only the crescent forecast uses it.
import PackageDescription

let package = Package(
  name: "HijriCore",
  platforms: [.iOS(.v17), .macOS(.v14)],
  products: [
    .library(name: "HijriCore", targets: ["HijriCore"]),
  ],
  targets: [
    .target(name: "CAstronomy", path: "Sources/CAstronomy", exclude: ["LICENSE"]),
    .target(
      name: "HijriCore",
      dependencies: ["CAstronomy"],
      resources: [.copy("Resources")]
    ),
    .testTarget(
      name: "HijriCoreTests",
      dependencies: ["HijriCore", "CAstronomy"]
    ),
  ]
)
