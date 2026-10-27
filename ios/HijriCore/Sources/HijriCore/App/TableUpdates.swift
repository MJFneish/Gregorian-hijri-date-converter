import Foundation
import Observation

/// Where downloaded tables are kept between launches (UserDefaults in the app).
public protocol KeyValueStore: AnyObject {
  func string(forKey key: String) -> String?
  func set(_ value: String, forKey key: String)
}

public enum CheckStatus: String, Sendable {
  case idle, checking, updated, upToDate, failed
}

public enum TableSource: Sendable {
  case bundled, downloaded
}

/// Month-start updates without a new release (user request, 2026-10-26). The build script also
/// writes the tables to data/hijri-tables.json; once that's pushed to GitHub, installed apps
/// download it (at most once a day, or from Settings → Calendar data), validate it hard
/// (`validateTableData`), and switch to it if it's newer than what they use. The download is kept
/// for offline starts. Same logic as the Android app's TableUpdates.
///
/// `fetch` returns the body of a successful (2xx) response and throws otherwise.
@MainActor
@Observable
public final class TableUpdates {
  public static let tablesUrl = "https://raw.githubusercontent.com/MJFneish/Gregorian-hijri-date-converter/develop/data/hijri-tables.json"
  public static let storedKey = "tables-remote"
  public static let lastCheckKey = "tables-last-check"
  public static let checkEveryMs = 24 * 3_600_000

  /// Bumped whenever the tables in use change — part of the conversion options, so anything
  /// remembered on them recomputes.
  public private(set) var version = 0
  public private(set) var source = TableSource.bundled
  /// `generated` timestamp of the tables in use.
  public private(set) var generated = bundledTables.generated
  /// Last time the repo answered (epoch ms), or nil.
  public private(set) var lastCheck: Int?
  public private(set) var status = CheckStatus.idle

  @ObservationIgnored private let store: KeyValueStore
  @ObservationIgnored private let fetch: (String) async throws -> String
  @ObservationIgnored private let clock: () -> Int

  public init(store: KeyValueStore, fetch: @escaping (String) async throws -> String, clock: @escaping () -> Int = nowMillis) {
    self.store = store
    self.fetch = fetch
    self.clock = clock
  }

  /// At startup, before the first frame: switch to a stored download that is newer than the
  /// bundled tables, and read when the app last checked. Synchronous (a few KB).
  public func restore() {
    if let text = store.string(forKey: Self.storedKey),
       let data = text.data(using: .utf8),
       let raw = try? JSONSerialization.jsonObject(with: data),
       let tables = validateTableData(raw),
       tables.generated > currentTables().generated {
      setTableData(tables)
      version += 1
      source = .downloaded
      generated = tables.generated
    }
    lastCheck = store.string(forKey: Self.lastCheckKey).flatMap { Int($0) }
  }

  /// After `restore`: download if a day has passed since the last check.
  public func checkIfDue() async {
    if lastCheck == nil || clock() - lastCheck! > Self.checkEveryMs { await check() }
  }

  /// Download and apply if newer. `force` ignores the once-a-day limit (the Settings button).
  public func check(force: Bool = false) async {
    if status == .checking { return }
    if !force, let lastCheck, clock() - lastCheck < Self.checkEveryMs { return }
    status = .checking
    do {
      let text = try await fetch(Self.tablesUrl)
      guard let data = text.data(using: .utf8) else { throw URLError(.cannotParseResponse) }
      let raw = try JSONSerialization.jsonObject(with: data)
      let now = clock()
      store.set(String(now), forKey: Self.lastCheckKey)
      guard let tables = validateTableData(raw) else {
        status = .failed
        lastCheck = now
        return
      }
      if tables.generated > currentTables().generated {
        store.set(text, forKey: Self.storedKey)
        setTableData(tables)
        version += 1
        source = .downloaded
        generated = tables.generated
        status = .updated
      } else {
        status = .upToDate
      }
      lastCheck = now
    } catch {
      status = .failed
    }
  }
}

/// GET `url` as text (10 s timeout, no cached copy); throws on a network error or a non-2xx reply.
public func httpGetText(_ url: String) async throws -> String {
  var request = URLRequest(url: URL(string: url)!, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
  request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
  let (data, response) = try await URLSession.shared.data(for: request)
  guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
    throw URLError(.badServerResponse)
  }
  return String(decoding: data, as: UTF8.self)
}
