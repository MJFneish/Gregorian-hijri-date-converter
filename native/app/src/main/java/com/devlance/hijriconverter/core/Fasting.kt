package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.jdnOfHijri

/**
 * Recommended (mustahab) fasting days in Twelver jurisprudence, for Tools → Fasting days.
 * Researched (2026-10-26) in the marjas' own texts: Sayyed Sistani's Islamic Laws r.1716 and
 * Minhaj 1063–1066, Sayyed Khamenei's رساله نماز و روزه 976–980, Sayyed Fadlallah's treatise
 * (أنواع الصوم) — see CLAUDE.md "Fasting days". The main list is what those sources share; the
 * three [SISTANI_ONLY] reasons are in Sistani's list only (still recommended under Khamenei's
 * general rule that any day not forbidden or discouraged is). Never suggested: Ramadan
 * (obligatory), Eid al-Fitr and Eid al-Adha (forbidden), Ashura (discouraged — shown as
 * "abstain in mourning until after Asr" instead).
 */
enum class FastReason(val key: String) {
  // "Three days each month" (صيام ثلاثة أيام من كل شهر)
  FirstThursday("firstThursday"),
  MiddleWednesday("middleWednesday"),
  LastThursday("lastThursday"),
  WhiteDays("whiteDays"),
  Mabath("mabath"),
  Mawlid("mawlid"),
  DahwAlArd("dahwAlArd"),
  Ghadir("ghadir"),
  Mubahala("mubahala"),
  Arafah("arafah"),
  // Sayyed Sistani's list only
  DhulHijjahDays("dhulHijjahDays"),
  MuharramDays("muharramDays"),
  ShawwalDays("shawwalDays"),
  // Not a fast: Ashura
  AshuraAbstain("ashuraAbstain"),
}

val SISTANI_ONLY: Set<FastReason> = setOf(FastReason.DhulHijjahDays, FastReason.MuharramDays, FastReason.ShawwalDays)

/** Months recommended as a whole (all of it or any day): Rajab and Sha'ban. */
val WHOLE_MONTHS: List<Int> = listOf(7, 8)

private const val THURSDAY = 4
private const val WEDNESDAY = 3

/** Why a Hijri day is a recommended fast — empty when it isn't (or fasting is not allowed). */
fun fastReasons(hijri: HijriDate, weekday: Int, monthLength: Int): List<FastReason> {
  val month = hijri.month
  val day = hijri.day
  if (month == 9) return emptyList() // Ramadan: obligatory, not "recommended"
  if ((month == 10 && day == 1) || (month == 12 && day == 10)) return emptyList() // the two Eids: forbidden
  if (month == 1 && day == 10) return listOf(FastReason.AshuraAbstain)
  val reasons = ArrayList<FastReason>()
  if (weekday == THURSDAY && day <= 7) reasons.add(FastReason.FirstThursday)
  // "The first Wednesday of the middle ten days" (11th–20th) is always the 11th–17th.
  if (weekday == WEDNESDAY && day in 11..17) reasons.add(FastReason.MiddleWednesday)
  if (weekday == THURSDAY && day > monthLength - 7) reasons.add(FastReason.LastThursday)
  if (day in 13..15) reasons.add(FastReason.WhiteDays)
  if (month == 7 && day == 27) reasons.add(FastReason.Mabath)
  if (month == 3 && day == 17) reasons.add(FastReason.Mawlid)
  if (month == 11 && day == 25) reasons.add(FastReason.DahwAlArd)
  if (month == 12 && day == 18) reasons.add(FastReason.Ghadir)
  if (month == 12 && day == 24) reasons.add(FastReason.Mubahala)
  if (month == 12 && day == 9) reasons.add(FastReason.Arafah)
  if (month == 12 && day <= 8) reasons.add(FastReason.DhulHijjahDays)
  if (month == 1 && (day == 1 || day == 3 || day == 7)) reasons.add(FastReason.MuharramDays)
  if (month == 10 && day in 4..9) reasons.add(FastReason.ShawwalDays)
  return reasons
}

data class FastingDay(
  val day: DayInfo,
  val reasons: List<FastReason>,
  /** 0 = today. */
  val inDays: Int,
)

/** Every day from `fromJdn` up to (not including) `toJdn` with a reason, in date order. */
fun fastingDays(fromJdn: Int, toJdn: Int, opts: ConversionOptions): List<FastingDay> {
  val out = ArrayList<FastingDay>()
  for (jdn in fromJdn until toJdn) {
    val day = dayInfo(jdn, opts)
    val reasons = fastReasons(day.hijri, day.weekday, hijriMonthLength(day.hijri.year, day.hijri.month, opts.method))
    if (reasons.isNotEmpty()) out.add(FastingDay(day, reasons, jdn - fromJdn))
  }
  return out
}

/** JDN of day 1 of the Hijri month `months` after the one containing `fromJdn`. */
fun monthsAhead(fromJdn: Int, months: Int, opts: ConversionOptions): Int {
  val hijri = dayInfo(fromJdn, opts).hijri
  val index = hijri.year * 12 + (hijri.month - 1) + months
  return jdnOfHijri(HijriDate(Math.floorDiv(index, 12), Math.floorMod(index, 12) + 1, 1), opts)
}
