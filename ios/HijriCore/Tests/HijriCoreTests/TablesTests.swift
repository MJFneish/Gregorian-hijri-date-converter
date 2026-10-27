import XCTest
@testable import HijriCore

/// Port of v1's tables.test.ts — the downloadable copy (data/hijri-tables.json) and swapping tables.
final class TablesTests: XCTestCase {
  private func remoteJson() -> [String: Any] {
    let data = try! Data(contentsOf: repoFile("data/hijri-tables.json"))
    return try! JSONSerialization.jsonObject(with: data) as! [String: Any]
  }

  private func method(_ raw: [String: Any], _ id: String) -> [String: Any] {
    (raw["methods"] as! [String: Any])[id] as! [String: Any]
  }

  private func setMethod(_ raw: inout [String: Any], _ id: String, _ value: [String: Any]?) {
    var methods = raw["methods"] as! [String: Any]
    methods[id] = value
    raw["methods"] = methods
  }

  /// A copy of the bundled tables with one year's Iran month mask replaced.
  private func withYearMask(_ year: Int, _ mutate: (Int) -> Int, generated: String = "2099-01-01T00:00:00Z") -> [String: Any] {
    var raw = remoteJson()
    var iran = method(raw, "iran")
    let lengths = Array(iran["lengths"] as! String)
    let i = (year - tableFirstYear) * 3
    let bits = mutate(Int(String(lengths[i ..< i + 3]), radix: 16)!)
    let digits = String(bits, radix: 16)
    let hex = String(repeating: "0", count: max(0, 3 - digits.count)) + digits
    iran["lengths"] = String(lengths[0 ..< i]) + hex + String(lengths[(i + 3)...])
    setMethod(&raw, "iran", iran)
    raw["generated"] = generated
    return raw
  }

  override func tearDown() {
    setTableData(bundledTables)
    super.tearDown()
  }

  func testTheDownloadableTablesMatchTheBundledOnesExactly() throws {
    // Rerun the build script and commit all its outputs when this fails.
    let data = try XCTUnwrap(validateTableData(remoteJson()))
    XCTAssertEqual(data.generated, bundledTables.generated)
    XCTAssertEqual(data.iranLastOfficial, bundledTables.iranLastOfficial)
    XCTAssertEqual(data.methods, bundledTables.methods)
  }

  func testAnythingMalformedOrImplausibleIsRejected() {
    let bad: [(String, (inout [String: Any]) -> Void)] = [
      ("format", { $0["format"] = 2 }),
      ("year range", { $0["lastYear"] = 1501 }),
      ("timestamp", { $0["generated"] = "yesterday" }),
      ("Arabic-Indic digits in the timestamp", { $0["generated"] = "٢٠٩٩-01-01T00:00:00Z" }),
      ("missing method", { raw in self.setMethod(&raw, "sistani", nil) }),
      ("short mask", { raw in
        var iran = self.method(raw, "iran")
        iran["lengths"] = String((iran["lengths"] as! String).dropFirst(3))
        self.setMethod(&raw, "iran", iran)
      }),
      ("not hex", { raw in
        var iran = self.method(raw, "iran")
        iran["lengths"] = "z" + String((iran["lengths"] as! String).dropFirst())
        self.setMethod(&raw, "iran", iran)
      }),
      ("Iran cutoff", { $0["iranLastOfficial"] = ["year": 1447, "month": 13] }),
      ("drift", { raw in
        var fadlallah = self.method(raw, "fadlallah")
        fadlallah["firstJdn"] = (fadlallah["firstJdn"] as! Int) + 5
        self.setMethod(&raw, "fadlallah", fadlallah)
      }),
      ("firstJdn as a string", { raw in
        var iran = self.method(raw, "iran")
        iran["firstJdn"] = String(iran["firstJdn"] as! Int)
        self.setMethod(&raw, "iran", iran)
      }),
      ("format as a boolean", { $0["format"] = true }),
    ]
    XCTAssertNil(validateTableData(nil))
    XCTAssertNil(validateTableData("nope"))
    for (label, mutate) in bad {
      var raw = remoteJson()
      mutate(&raw)
      XCTAssertNil(validateTableData(raw), label)
    }
    // A year with only 4 thirty-day months would be 352 days — impossible.
    XCTAssertNil(validateTableData(withYearMask(1448, { _ in 0b0000_0000_1111 })))
  }

  func testADownloadedCorrectionMovesTheMonthStartEverywhere() throws {
    // Find a 29-day month followed by a 30-day one in Iran's 1448 and swap them, as if the office
    // had announced the next month a day later than predicted.
    let lengths = Array(method(remoteJson(), "iran")["lengths"] as! String)
    let i = (1448 - tableFirstYear) * 3
    let bits = Int(String(lengths[i ..< i + 3]), radix: 16)!
    let k = try XCTUnwrap((0 ..< 11).first { m in (bits >> m) & 1 == 0 && (bits >> (m + 1)) & 1 == 1 })
    let shorter = k + 1, moved = k + 2, after = k + 3 // 1-based months
    let before = jdnFromHijri(HijriDate(1448, moved, 1), .iran)
    let afterStart = jdnFromHijri(HijriDate(1448, after, 1), .iran)

    let corrected = try XCTUnwrap(validateTableData(withYearMask(1448, { b in (b | (1 << k)) & ~(1 << (k + 1)) })))
    setTableData(corrected)
    XCTAssertEqual(currentTables().generated, "2099-01-01T00:00:00Z")
    XCTAssertEqual(jdnFromHijri(HijriDate(1448, moved, 1), .iran), before + 1)
    XCTAssertEqual(hijriFromJdn(before, .iran), HijriDate(1448, shorter, 30))
    // The month after is unchanged: the two lengths were only swapped.
    XCTAssertEqual(jdnFromHijri(HijriDate(1448, after, 1), .iran), afterStart)
  }

  func testIransOfficialCalculatedCutoffMovesWithTheData() throws {
    var raw = remoteJson()
    raw["generated"] = "2099-01-01T00:00:00Z"
    raw["iranLastOfficial"] = ["year": 1448, "month": 5]
    XCTAssertEqual(hijriSource(HijriDate(1448, 5, 1), .iran), .calculated)
    setTableData(try XCTUnwrap(validateTableData(raw)))
    XCTAssertEqual(hijriSource(HijriDate(1448, 5, 1), .iran), .official)
    XCTAssertEqual(hijriSource(HijriDate(1448, 6, 1), .iran), .calculated)
  }
}
