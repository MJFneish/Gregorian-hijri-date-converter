package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.gregorianMonthName
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.weekdayName
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Calendar
import java.util.TimeZone

/** The app's language — its own setting, independent of the phone's. */
enum class Lang(val code: String) {
  EN("en"),
  AR("ar");

  companion object {
    fun fromCode(code: String?): Lang? = entries.firstOrNull { it.code == code }
  }
}

private const val ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩"

/** Non-breaking space: keeps "1448 AH" / "١٤٤٨ هـ" together when a long date wraps. */
private const val NBSP = '\u00A0'

/** Arabic UI shows Arabic-Indic digits (١٤٢٣), like prayer-times-lb does. */
fun localizeDigits(value: String, lang: Lang): String =
  if (lang != Lang.AR) value else buildString(value.length) {
    for (c in value) append(if (c in '0'..'9') ARABIC_INDIC[c - '0'] else c)
  }

fun localizeDigits(value: Int, lang: Lang): String = localizeDigits(value.toString(), lang)

fun formatHijri(date: HijriDate, lang: Lang): String {
  val month = hijriMonthName(date.month, lang)
  return if (lang == Lang.AR) {
    localizeDigits("${date.day} $month ${date.year}${NBSP}هـ", lang)
  } else {
    "${date.day} $month ${date.year}${NBSP}AH"
  }
}

fun formatGregorian(date: GregorianDate, lang: Lang): String {
  val month = gregorianMonthName(date.month, lang)
  return if (lang == Lang.AR) {
    localizeDigits("${date.day} $month ${date.year}${NBSP}م", lang)
  } else {
    "${date.day} $month ${date.year}"
  }
}

fun formatWeekday(date: GregorianDate, lang: Lang): String = weekdayName(weekdayOfJdn(gregorianToJdn(date)), lang)

/** "62%" / "٦٢٪". */
fun formatPercent(percent: Int, lang: Lang): String =
  if (lang == Lang.AR) "${localizeDigits(percent, lang)}٪" else "$percent%"

/** JS `Number.prototype.toFixed`: rounds the exact binary value half away from zero, no grouping,
 * '.' as the separator whatever the phone's locale. */
fun toFixed(value: Double, digits: Int): String = BigDecimal(value).setScale(digits, RoundingMode.HALF_UP).toPlainString()

/** One decimal place: "7.4" / "٧٫٤". */
fun formatDecimal(value: Double, lang: Lang): String {
  val s = toFixed(value, 1)
  return if (lang == Lang.AR) localizeDigits(s.replace('.', '٫'), lang) else s
}

/** Local wall-clock time, 24h "18:42" (Arabic digits in Arabic). */
fun formatTime(epochMs: Long, lang: Lang, zone: TimeZone = TimeZone.getDefault()): String {
  val c = Calendar.getInstance(zone).apply { timeInMillis = epochMs }
  val hh = c.get(Calendar.HOUR_OF_DAY).toString().padStart(2, '0')
  val mm = c.get(Calendar.MINUTE).toString().padStart(2, '0')
  return localizeDigits("$hh:$mm", lang)
}

/** "2026-10-26" — for file names and logs, not for display. */
fun isoDate(date: GregorianDate): String =
  "${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}"
