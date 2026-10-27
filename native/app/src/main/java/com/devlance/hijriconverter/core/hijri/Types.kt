package com.devlance.hijriconverter.core.hijri

import com.devlance.hijriconverter.core.YmdDate

data class HijriDate(override val year: Int, override val month: Int, override val day: Int) : YmdDate

data class YearMonth(val year: Int, val month: Int)

/**
 * Where a converted date comes from — shown as a small label under results so users know how
 * much to trust it:
 * - [Official]    published by the authority itself (Iran's printed/observed calendar, Umm al-Qura)
 * - [Calculated]  computed from the authority's crescent-visibility rule (all Fadlallah/Sistani
 *                 dates, and Iran's months after its last published one)
 * - [Approximate] outside the precomputed range — arithmetic (tabular) calendar, ±1 day
 */
enum class DateSource(val key: String) {
  Official("official"),
  Calculated("calculated"),
  Approximate("approximate"),
}

/**
 * The calendar authorities the app can follow. How each table is produced (data sources, crescent
 * rules, calibration numbers) is documented in scripts/build-hijri-tables.js and CLAUDE.md.
 * Display order in Settings — the Shia methods first, Umm al-Qura last as a Sunni reference.
 */
enum class MethodId(val id: String) {
  Iran("iran"),
  Fadlallah("fadlallah"),
  Sistani("sistani"),
  UmmAlQura("ummalqura");

  companion object {
    /** The id as stored in settings and in data/hijri-tables.json, or null if unknown. */
    fun fromId(id: String?): MethodId? = entries.firstOrNull { it.id == id }
  }
}

/** The user's explicit choice: Iran's official calendar is the default. */
val DEFAULT_METHOD = MethodId.Iran

/** Manual "Hijri date adjustment" range (days), applied on top of whichever method is chosen. */
const val MAX_ADJUSTMENT = 2

/** One method's month starts: the JDN of 1 Muharram [TABLE_FIRST_YEAR] and one 3-hex-digit group
 * per year, bit k set = month k+1 has 30 days. */
data class MethodTable(val firstJdn: Int, val lengths: String)

/**
 * The month-start tables in use. Starts as the copy bundled in the APK; a newer one downloaded
 * from the repo can replace it (data/TableUpdates.kt — month starts can be corrected without a
 * new APK). The year range never changes: a download must cover exactly the bundled years.
 */
data class TableData(
  /** ISO timestamp of the build-hijri-tables run that produced it — the version. */
  val generated: String,
  /** Last month whose Iran-official start is from published data (later ones are predicted). */
  val iranLastOfficial: YearMonth,
  val methods: Map<MethodId, MethodTable>,
)

data class ConversionOptions(
  val method: MethodId,
  /** Manual shift in days (Settings → Hijri date adjustment), −2…+2. Positive = the Hijri date
   * shown for a given Gregorian day is later. */
  val adjustment: Int = 0,
  /** Not read by the conversions: changes when downloaded month tables replace the ones in use,
   * so anything remembered on the options recomputes. */
  val tablesVersion: Int = 0,
)
