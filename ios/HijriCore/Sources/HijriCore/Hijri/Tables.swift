import Foundation

public let tableFirstYear = GeneratedTables.firstYear
public let tableLastYear = GeneratedTables.lastYear

public let bundledTables = TableData(
  generated: GeneratedTables.generated,
  iranLastOfficial: GeneratedTables.iranLastOfficial,
  methods: GeneratedTables.methods
)

/// The month-start tables in use: the bundled copy, or a validated newer download
/// (`setTableData`). Every lookup below reads them, so swapping moves every date at once.
public final class HijriTables: @unchecked Sendable {
  public static let shared = HijriTables()

  private let lock = NSLock()
  private var _current = bundledTables
  /// Decoded month starts per method: `starts[i]` is the JDN of day 1 of the i-th month counted
  /// from 1 Muharram of the first table year, plus one sentinel entry at the end (the day after the
  /// last month). Decoded lazily and cached — ~1,900 ints per method.
  private var cache: [MethodId: [Int]] = [:]

  public var current: TableData {
    lock.lock()
    defer { lock.unlock() }
    return _current
  }

  /// Switch to another (validated) table set. Callers re-render via the tables version.
  public func set(_ data: TableData) {
    lock.lock()
    defer { lock.unlock() }
    _current = data
    cache.removeAll()
  }

  func monthStarts(_ method: MethodId) -> [Int] {
    lock.lock()
    defer { lock.unlock() }
    if let starts = cache[method] { return starts }
    let starts = decode(_current.methods[method]!)
    cache[method] = starts
    return starts
  }
}

public func currentTables() -> TableData { HijriTables.shared.current }

public func setTableData(_ data: TableData) { HijriTables.shared.set(data) }

public func iranLastOfficial() -> YearMonth { HijriTables.shared.current.iranLastOfficial }

private func hexGroup(_ lengths: [UInt8], _ year: Int) -> Int {
  var value = 0
  for i in 0 ..< 3 {
    let c = lengths[year * 3 + i]
    let digit: Int
    switch c {
    case 48 ... 57: digit = Int(c) - 48 // 0-9
    case 97 ... 102: digit = Int(c) - 87 // a-f
    default: digit = 0
    }
    value = value * 16 + digit
  }
  return value
}

private func decode(_ table: MethodTable) -> [Int] {
  let bytes = Array(table.lengths.utf8)
  let years = bytes.count / 3
  var starts = [Int](repeating: 0, count: years * 12 + 1)
  var jdn = table.firstJdn
  for y in 0 ..< years {
    let bits = hexGroup(bytes, y)
    for m in 0 ..< 12 {
      starts[y * 12 + m] = jdn
      jdn += bits & (1 << m) != 0 ? 30 : 29
    }
  }
  starts[years * 12] = jdn
  return starts
}

/// Most a downloaded month start may differ from the bundled one — anything further is garbage.
private let maxDriftDays = 3
private let tableYears = GeneratedTables.lastYear - GeneratedTables.firstYear + 1

/// A JSON value that is a whole number (v1's `Number.isInteger`), else nil. Strings and booleans
/// don't count (JSONSerialization hands both numbers and booleans over as NSNumber).
private func wholeNumber(_ value: Any?) -> Int? {
  guard let n = value as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return nil }
  let d = n.doubleValue
  guard d.isFinite, d == d.rounded(), abs(d) < Double(Int32.max) else { return nil }
  return Int(d)
}

/// "2026-10-26T10:38:09Z" — ASCII digits only.
private func isGeneratedTimestamp(_ s: String) -> Bool {
  let chars = Array(s.utf8)
  guard chars.count == 20 else { return false }
  for (i, c) in chars.enumerated() {
    switch i {
    case 4, 7: if c != 45 { return false } // -
    case 10: if c != 84 { return false } // T
    case 13, 16: if c != 58 { return false } // :
    case 19: if c != 90 { return false } // Z
    default: if !(48 ... 57).contains(c) { return false }
    }
  }
  return true
}

/// Checks a downloaded table set (data/hijri-tables.json, parsed with JSONSerialization) before it
/// may replace the bundled one: format 1, the same year range, every method present with a
/// well-formed mask, every year 353–356 days (sighting calendars can have 353/356 — see the
/// integrity test), and every month start within `maxDriftDays` of the bundled table's. Nil when
/// anything is off.
public func validateTableData(_ raw: Any?) -> TableData? {
  guard let r = raw as? [String: Any] else { return nil }
  guard wholeNumber(r["format"]) == 1,
        wholeNumber(r["firstYear"]) == GeneratedTables.firstYear,
        wholeNumber(r["lastYear"]) == GeneratedTables.lastYear else { return nil }
  guard let generated = r["generated"] as? String, isGeneratedTimestamp(generated) else { return nil }
  guard let iran = r["iranLastOfficial"] as? [String: Any],
        let iranYear = wholeNumber(iran["year"]),
        let iranMonth = wholeNumber(iran["month"]),
        (GeneratedTables.firstYear ... GeneratedTables.lastYear).contains(iranYear),
        (1 ... 12).contains(iranMonth) else { return nil }
  guard let methodsRaw = r["methods"] as? [String: Any] else { return nil }
  var methods: [MethodId: MethodTable] = [:]
  for method in MethodId.allCases {
    guard let m = methodsRaw[method.rawValue] as? [String: Any],
          let firstJdn = wholeNumber(m["firstJdn"]),
          let lengths = m["lengths"] as? String else { return nil }
    let bytes = Array(lengths.utf8)
    guard bytes.count == tableYears * 3,
          bytes.allSatisfy({ (48 ... 57).contains($0) || (97 ... 102).contains($0) }) else { return nil }
    for y in 0 ..< tableYears {
      let thirties = hexGroup(bytes, y).nonzeroBitCount
      if thirties < 5 || thirties > 8 { return nil } // 348 + thirties = 353..356 days
    }
    let table = MethodTable(firstJdn: firstJdn, lengths: lengths)
    let starts = decode(table)
    let bundled = decode(bundledTables.methods[method]!)
    for i in starts.indices where abs(starts[i] - bundled[i]) > maxDriftDays {
      return nil
    }
    methods[method] = table
  }
  return TableData(generated: generated, iranLastOfficial: YearMonth(year: iranYear, month: iranMonth), methods: methods)
}

private func indexOf(_ year: Int, _ month: Int) -> Int {
  (year - GeneratedTables.firstYear) * 12 + (month - 1)
}

public func isYearInTable(_ year: Int) -> Bool {
  (GeneratedTables.firstYear ... GeneratedTables.lastYear).contains(year)
}

/// JDN of 1 <month> <year>, or nil outside the table.
public func tableMonthStart(_ method: MethodId, _ year: Int, _ month: Int) -> Int? {
  isYearInTable(year) ? HijriTables.shared.monthStarts(method)[indexOf(year, month)] : nil
}

public func tableMonthLength(_ method: MethodId, _ year: Int, _ month: Int) -> Int? {
  guard isYearInTable(year) else { return nil }
  let starts = HijriTables.shared.monthStarts(method)
  let i = indexOf(year, month)
  return starts[i + 1] - starts[i]
}

/// First day of a method's table and the day after its last day (JDN).
public struct TableBounds: Sendable {
  public let start: Int
  public let end: Int
}

public func tableBounds(_ method: MethodId) -> TableBounds {
  let starts = HijriTables.shared.monthStarts(method)
  return TableBounds(start: starts[0], end: starts[starts.count - 1])
}

/// Hijri date for a JDN, or nil when the JDN falls outside the table. Binary search.
public func tableLookup(_ method: MethodId, _ jdn: Int) -> HijriDate? {
  let starts = HijriTables.shared.monthStarts(method)
  if jdn < starts[0] || jdn >= starts[starts.count - 1] { return nil }
  var lo = 0
  var hi = starts.count - 2
  while lo < hi {
    let mid = (lo + hi + 1) >> 1
    if starts[mid] <= jdn { lo = mid } else { hi = mid - 1 }
  }
  return HijriDate(GeneratedTables.firstYear + lo / 12, lo % 12 + 1, jdn - starts[lo] + 1)
}
