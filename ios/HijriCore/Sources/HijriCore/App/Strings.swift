import Foundation

/// The app's texts in one language, from Resources/i18n/<lang>.json (v1's i18next files, the same
/// copies as the Android app's assets): nested keys addressed with dots ("settings.language"),
/// `{{name}}` placeholders. The app's language is its own setting, independent of the phone's, and
/// switches instantly — so texts are looked up here rather than through Localizable.strings.
/// Missing keys fall back to English.
public final class Strings: @unchecked Sendable {
  public let lang: Lang
  private let table: [String: String]
  private let fallback: Strings?

  private init(lang: Lang, table: [String: String], fallback: Strings?) {
    self.lang = lang
    self.table = table
    self.fallback = fallback
  }

  public subscript(key: String) -> String {
    table[key] ?? fallback?[key] ?? key
  }

  /// `t("home.eveOf", ["date": …])` — v1's `t(key, { date })`.
  public func t(_ key: String, _ args: [String: Any] = [:]) -> String {
    var text = self[key]
    for (name, value) in args {
      text = text.replacingOccurrences(of: "{{\(name)}}", with: "\(value)")
    }
    return text
  }

  private static let lock = NSLock()
  private static var cache: [Lang: Strings] = [:]

  public static func of(_ lang: Lang) -> Strings {
    lock.lock()
    defer { lock.unlock() }
    return load(lang)
  }

  private static func load(_ lang: Lang) -> Strings {
    if let cached = cache[lang] { return cached }
    let fallback = lang == .en ? nil : load(.en)
    let url = Bundle.module.url(forResource: lang.rawValue, withExtension: "json", subdirectory: "Resources/i18n")!
    let json = try! JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
    var out: [String: String] = [:]
    func flatten(_ o: [String: Any], _ prefix: String) {
      for (key, value) in o {
        if let nested = value as? [String: Any] {
          flatten(nested, "\(prefix)\(key).")
        } else {
          out["\(prefix)\(key)"] = "\(value)"
        }
      }
    }
    flatten(json, "")
    let strings = Strings(lang: lang, table: out, fallback: fallback)
    cache[lang] = strings
    return strings
  }
}
