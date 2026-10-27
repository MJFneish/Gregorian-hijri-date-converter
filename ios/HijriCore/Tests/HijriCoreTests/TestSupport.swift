import Foundation
@testable import HijriCore

/// "2002-03-22" -> its date.
func iso(_ text: String) -> GregorianDate {
  let parts = text.split(separator: "-").map { Int($0)! }
  return GregorianDate(parts[0], parts[1], parts[2])
}

/// "2002-03-22" -> its JDN.
func jdnOf(_ text: String) -> Int { gregorianToJdn(iso(text)) }

func opts(_ method: MethodId, _ adjustment: Int = 0) -> ConversionOptions {
  ConversionOptions(method: method, adjustment: adjustment)
}

/// A file of the repository, found from this source file's location (swift test runs in
/// ios/HijriCore; the repo root is the folder holding data/hijri-tables.json).
func repoFile(_ path: String, file: StaticString = #filePath) -> URL {
  var dir = URL(fileURLWithPath: "\(file)").deletingLastPathComponent()
  while !FileManager.default.fileExists(atPath: dir.appendingPathComponent("data/hijri-tables.json").path) {
    let parent = dir.deletingLastPathComponent()
    precondition(parent.path != dir.path, "repository root not found")
    dir = parent
  }
  return dir.appendingPathComponent(path)
}

/// UTC noon of a JDN's civil day, in epoch ms (v1's `Date.UTC(y, m - 1, d, 12)`).
func noonUtc(_ jdn: Int) -> Int { utcMidnightMs(jdnToGregorian(jdn)) + 12 * 3_600_000 }
