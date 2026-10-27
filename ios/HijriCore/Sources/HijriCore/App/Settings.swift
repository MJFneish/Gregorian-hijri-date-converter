import Foundation

public enum ThemeMode: String, Sendable {
  case system, light, dark
}

/// Everything the user chooses, persisted on the phone — the same fields and JSON shape as the
/// Android app (and v1's settings store): language, themeMode, method, adjustment, onboardingDone,
/// birthJdn.
public struct AppSettings: Hashable, Sendable {
  public var language: Lang
  public var themeMode: ThemeMode
  /// Which authority's calendar to follow (Settings → Calculation method).
  public var method: MethodId
  /// Manual Hijri shift in days, −maxAdjustment…+maxAdjustment.
  public var adjustment: Int
  public var onboardingDone: Bool
  /// Tools → Hijri birthday: the user's birth date as a JDN (stored on the phone only), or nil.
  public var birthJdn: Int?

  public init(
    language: Lang,
    themeMode: ThemeMode = .system,
    method: MethodId = defaultMethod,
    adjustment: Int = 0,
    onboardingDone: Bool = false,
    birthJdn: Int? = nil
  ) {
    self.language = language
    self.themeMode = themeMode
    self.method = method
    self.adjustment = adjustment
    self.onboardingDone = onboardingDone
    self.birthJdn = birthJdn
  }

  /// The conversion options these settings select, for the tables in use (`tablesVersion`).
  public func conversion(tablesVersion: Int) -> ConversionOptions {
    ConversionOptions(method: method, adjustment: adjustment, tablesVersion: tablesVersion)
  }
}

/// v1: Math.round, then clamp to ±maxAdjustment.
public func clampAdjustment(_ value: Double) -> Int {
  min(maxAdjustment, max(-maxAdjustment, jsRound(value)))
}

/// The settings as JSON. Decoding guards against values a future/older build wrote that this one
/// doesn't know (v1's `merge`): unknown language → the phone's, unknown method → the default,
/// adjustment rounded and clamped, birthJdn only when it's a whole number.
public enum SettingsJson {
  public static func encode(_ s: AppSettings) -> [String: Any] {
    [
      "language": s.language.rawValue,
      "themeMode": s.themeMode.rawValue,
      "method": s.method.rawValue,
      "adjustment": s.adjustment,
      "onboardingDone": s.onboardingDone,
      "birthJdn": s.birthJdn.map { $0 as Any } ?? NSNull(),
    ]
  }

  public static func encodeString(_ s: AppSettings) -> String {
    let data = try! JSONSerialization.data(withJSONObject: encode(s), options: [.sortedKeys])
    return String(decoding: data, as: UTF8.self)
  }

  public static func decode(_ o: [String: Any], deviceLanguage: Lang) -> AppSettings {
    func number(_ key: String) -> Double? {
      guard let n = o[key] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return nil }
      let d = n.doubleValue
      return d.isFinite ? d : nil
    }
    let birth = number("birthJdn").flatMap { d in d == d.rounded() && abs(d) < Double(Int32.max) ? Int(d) : nil }
    return AppSettings(
      language: (o["language"] as? String).flatMap(Lang.init(rawValue:)) ?? deviceLanguage,
      themeMode: (o["themeMode"] as? String).flatMap(ThemeMode.init(rawValue:)) ?? .system,
      method: (o["method"] as? String).flatMap(MethodId.init(rawValue:)) ?? defaultMethod,
      adjustment: number("adjustment").map(clampAdjustment) ?? 0,
      onboardingDone: (o["onboardingDone"] as? NSNumber).map { CFGetTypeID($0) == CFBooleanGetTypeID() && $0.boolValue } ?? false,
      birthJdn: birth
    )
  }

  public static func decode(string: String, deviceLanguage: Lang) -> AppSettings? {
    guard let data = string.data(using: .utf8),
          let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    return decode(o, deviceLanguage: deviceLanguage)
  }
}
