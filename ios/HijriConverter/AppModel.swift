import HijriCore
import Observation
import SwiftUI

/// UserDefaults as the table updater's store.
final class DefaultsStore: KeyValueStore {
  private let defaults: UserDefaults

  init(_ defaults: UserDefaults) { self.defaults = defaults }

  func string(forKey key: String) -> String? { defaults.string(forKey: key) }
  func set(_ value: String, forKey key: String) { defaults.set(value, forKey: key) }
}

/// The app's persisted state — settings and the month-table updates — saved to UserDefaults on
/// every change and loaded synchronously at launch, so the first frame already has the user's
/// language, theme and method. (No v1 import here: v1 never shipped on iOS.)
@MainActor
@Observable
final class AppModel {
  private static let settingsKey = "settings"

  private(set) var settings: AppSettings
  let tables: TableUpdates
  @ObservationIgnored private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    // UI tests start from a clean install.
    if ProcessInfo.processInfo.arguments.contains("-uiTestReset"), let domain = Bundle.main.bundleIdentifier {
      defaults.removePersistentDomain(forName: domain)
    }
    self.defaults = defaults
    let deviceLanguage: Lang = Locale.preferredLanguages.first?.hasPrefix("ar") == true ? .ar : .en
    settings = defaults.string(forKey: Self.settingsKey)
      .flatMap { SettingsJson.decode(string: $0, deviceLanguage: deviceLanguage) }
      ?? AppSettings(language: deviceLanguage)
    tables = TableUpdates(store: DefaultsStore(defaults), fetch: httpGetText)
    tables.restore()
    Task { [tables] in await tables.checkIfDue() }
  }

  func update(_ transform: (inout AppSettings) -> Void) {
    transform(&settings)
    defaults.set(SettingsJson.encodeString(settings), forKey: Self.settingsKey)
  }

  /// The user's method + adjustment for the tables in use — key remembered conversions on the whole
  /// value, so a downloaded table update recomputes them.
  var conversion: ConversionOptions { settings.conversion(tablesVersion: tables.version) }
}
