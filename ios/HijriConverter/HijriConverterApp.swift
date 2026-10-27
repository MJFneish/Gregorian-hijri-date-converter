import HijriCore
import SwiftUI

/// The app's entry point. The screens arrive with the next phase; this shows the engine is linked.
@main
struct HijriConverterApp: App {
  var body: some Scene {
    WindowGroup {
      ZStack {
        Color(red: 0x11 / 255, green: 0x0D / 255, blue: 0x2E / 255).ignoresSafeArea()
        VStack(spacing: 8) {
          Text("Hijri Converter")
            .font(.title2.bold())
          Text(formatHijri(hijriOfJdn(todayJdn(), ConversionOptions(method: defaultMethod)), .en))
            .accessibilityIdentifier("todayHijri")
          Text("v\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
            .font(.footnote)
        }
        .foregroundStyle(.white)
      }
    }
  }
}
