import Foundation

public struct HijriDate: YmdDate, Hashable, Sendable {
  public let year: Int
  public let month: Int
  public let day: Int

  public init(_ year: Int, _ month: Int, _ day: Int) {
    self.year = year
    self.month = month
    self.day = day
  }

  public func withDay(_ day: Int) -> HijriDate { HijriDate(year, month, day) }
  public func withYear(_ year: Int) -> HijriDate { HijriDate(year, month, day) }
}

public struct YearMonth: Hashable, Sendable {
  public let year: Int
  public let month: Int

  public init(year: Int, month: Int) {
    self.year = year
    self.month = month
  }
}

/// Where a converted date comes from — shown as a small label under results so users know how
/// much to trust it:
/// - `official`    published by the authority itself (Iran's printed/observed calendar, Umm al-Qura)
/// - `calculated`  computed from the authority's crescent-visibility rule (all Fadlallah/Sistani
///                 dates, and Iran's months after its last published one)
/// - `approximate` outside the precomputed range — arithmetic (tabular) calendar, ±1 day
public enum DateSource: String, Sendable {
  case official, calculated, approximate
}

/// The calendar authorities the app can follow, in Settings order — the Shia methods first, Umm
/// al-Qura last as a Sunni reference. Raw values are the ids stored in settings and in
/// data/hijri-tables.json.
public enum MethodId: String, CaseIterable, Sendable {
  case iran, fadlallah, sistani, ummalqura
}

/// The user's explicit choice: Iran's official calendar is the default.
public let defaultMethod = MethodId.iran

/// Manual "Hijri date adjustment" range (days), applied on top of whichever method is chosen.
public let maxAdjustment = 2

/// One method's month starts: the JDN of 1 Muharram of the first table year and one 3-hex-digit
/// group per year, bit k set = month k+1 has 30 days.
public struct MethodTable: Hashable, Sendable {
  public let firstJdn: Int
  public let lengths: String

  public init(firstJdn: Int, lengths: String) {
    self.firstJdn = firstJdn
    self.lengths = lengths
  }
}

/// The month-start tables in use: the bundled copy or a newer one downloaded from the repo
/// (TableUpdates — month starts can be corrected without a new release). The year range never
/// changes: a download must cover exactly the bundled years.
public struct TableData: Hashable, Sendable {
  /// ISO timestamp of the build-hijri-tables run that produced it — the version.
  public let generated: String
  /// Last month whose Iran-official start is from published data (later ones are predicted).
  public let iranLastOfficial: YearMonth
  public let methods: [MethodId: MethodTable]
}

public struct ConversionOptions: Hashable, Sendable {
  public let method: MethodId
  /// Manual shift in days (Settings → Hijri date adjustment), −2…+2. Positive = the Hijri date
  /// shown for a given Gregorian day is later.
  public let adjustment: Int
  /// Not read by the conversions: changes when downloaded month tables replace the ones in use,
  /// so anything remembered on the options recomputes.
  public let tablesVersion: Int

  public init(method: MethodId, adjustment: Int = 0, tablesVersion: Int = 0) {
    self.method = method
    self.adjustment = adjustment
    self.tablesVersion = tablesVersion
  }
}
