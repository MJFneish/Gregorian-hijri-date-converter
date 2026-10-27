import XCTest
@testable import HijriCore

/// Settings decoding, the strings, and a port of v1's useTableStore.test.ts (the Android DataTest).
final class AppLogicTests: XCTestCase {
  // MARK: - Settings

  func testStoredSettingsDecodeAsTheyAre() {
    let stored = SettingsJson.decode(
      string: #"{"language":"ar","themeMode":"dark","method":"fadlallah","adjustment":-1,"onboardingDone":true,"birthJdn":2452356}"#,
      deviceLanguage: .en
    )
    XCTAssertEqual(stored, AppSettings(language: .ar, themeMode: .dark, method: .fadlallah, adjustment: -1, onboardingDone: true, birthJdn: 2_452_356))
  }

  func testUnknownOrBrokenValuesFallBackLikeV1sMerge() {
    let odd = SettingsJson.decode(
      string: #"{"language":"fr","themeMode":"sepia","method":"hanafi","adjustment":7.6,"birthJdn":12.5,"onboardingDone":1}"#,
      deviceLanguage: .en
    )
    // 7.6 rounds to 8, clamped to +2 (v1's clampAdjustment); a 1 isn't `true`.
    XCTAssertEqual(odd, AppSettings(language: .en, adjustment: 2))
    XCTAssertEqual(SettingsJson.decode(string: #"{"adjustment":-3}"#, deviceLanguage: .en)?.adjustment, -2)
    XCTAssertEqual(SettingsJson.decode(string: #"{"adjustment":0.5}"#, deviceLanguage: .en)?.adjustment, 1) // Math.round
    XCTAssertEqual(SettingsJson.decode(string: "{}", deviceLanguage: .ar), AppSettings(language: .ar))
    XCTAssertNil(SettingsJson.decode(string: "not json", deviceLanguage: .en))
  }

  func testSettingsRoundTripThroughJson() {
    let s = AppSettings(language: .ar, themeMode: .light, method: .sistani, adjustment: 2, onboardingDone: true, birthJdn: nil)
    XCTAssertEqual(SettingsJson.decode(string: SettingsJson.encodeString(s), deviceLanguage: .en), s)
  }

  // MARK: - Strings

  func testStringsLookUpNestedKeysFillPlaceholdersAndFallBackToEnglish() {
    let en = Strings.of(.en)
    let ar = Strings.of(.ar)
    XCTAssertEqual(en["tabs.settings"], "Settings")
    XCTAssertEqual(ar["tabs.settings"], "الإعدادات")
    XCTAssertEqual(en.t("settings.version", ["version": "2.0.0"]), "Version 2.0.0")
    XCTAssertEqual(en["no.such.key"], "no.such.key")
  }

  // MARK: - Month-table updates

  private final class MemoryStore: KeyValueStore {
    var map: [String: String] = [:]
    func string(forKey key: String) -> String? { map[key] }
    func set(_ value: String, forKey key: String) { map[key] = value }
  }

  private struct Offline: Error {}

  private func remote(_ generated: String) -> String {
    var raw = try! JSONSerialization.jsonObject(with: Data(contentsOf: repoFile("data/hijri-tables.json"))) as! [String: Any]
    raw["generated"] = generated
    return String(decoding: try! JSONSerialization.data(withJSONObject: raw), as: UTF8.self)
  }

  private var calls = 0
  private var now = 1_800_000_000_000
  private let store = MemoryStore()

  @MainActor
  private func updates(_ respond: @escaping () throws -> String) -> TableUpdates {
    TableUpdates(
      store: store,
      fetch: { [unowned self] _ in
        self.calls += 1
        return try respond()
      },
      clock: { [unowned self] in self.now }
    )
  }

  override func setUp() {
    super.setUp()
    setTableData(bundledTables)
  }

  override func tearDown() {
    setTableData(bundledTables)
    super.tearDown()
  }

  @MainActor
  func testAppliesAndStoresANewerDownload() async {
    let newer = remote("2099-01-01T00:00:00Z")
    let u = updates { newer }
    await u.check(force: true)
    XCTAssertEqual(u.status, .updated)
    XCTAssertEqual(u.source, .downloaded)
    XCTAssertEqual(u.version, 1)
    XCTAssertEqual(currentTables().generated, "2099-01-01T00:00:00Z")
    XCTAssertTrue(store.map[TableUpdates.storedKey]!.contains("2099-01-01T00:00:00Z"))
    XCTAssertNotNil(u.lastCheck)
  }

  @MainActor
  func testKeepsTheBundledTablesWhenTheDownloadIsNotNewer() async {
    let same = remote(bundledTables.generated)
    let u = updates { same }
    await u.check(force: true)
    XCTAssertEqual(u.status, .upToDate)
    XCTAssertEqual(u.version, 0)
    XCTAssertEqual(currentTables(), bundledTables)
  }

  @MainActor
  func testRejectsGarbageAndNetworkErrorsWithoutTouchingTheTables() async {
    for respond: () throws -> String in [{ #"{"format": 1}"# }, { throw Offline() }, { "not json" }] {
      let u = updates(respond)
      await u.check(force: true)
      XCTAssertEqual(u.status, .failed)
    }
    XCTAssertEqual(currentTables(), bundledTables)
  }

  @MainActor
  func testChecksAtMostOnceADayUnlessForced() async {
    let same = remote(bundledTables.generated)
    let u = updates { same }
    await u.check(force: true)
    XCTAssertEqual(calls, 1)
    await u.check()
    await u.checkIfDue()
    XCTAssertEqual(calls, 1)
    now += TableUpdates.checkEveryMs + 1
    await u.checkIfDue()
    XCTAssertEqual(calls, 2)
  }

  @MainActor
  func testRestoresAStoredDownloadOnStartupOffline() async {
    store.set(remote("2099-01-01T00:00:00Z"), forKey: TableUpdates.storedKey)
    store.set(String(now - 1000), forKey: TableUpdates.lastCheckKey)
    let u = updates { throw Offline() }
    u.restore()
    await u.checkIfDue()
    XCTAssertEqual(u.source, .downloaded)
    XCTAssertEqual(currentTables().generated, "2099-01-01T00:00:00Z")
    XCTAssertEqual(calls, 0) // checked less than a day ago
  }

  @MainActor
  func testAStoredDownloadNoNewerThanTheBundledTablesIsIgnored() {
    store.set(remote(bundledTables.generated), forKey: TableUpdates.storedKey)
    let u = updates { throw Offline() }
    u.restore()
    XCTAssertEqual(u.source, .bundled)
    XCTAssertEqual(currentTables(), bundledTables)
  }
}
