package com.devlance.hijriconverter.i18n

import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.YmdSpan
import com.devlance.hijriconverter.core.localizeDigits
import kotlin.math.abs

/**
 * Counted phrases ("3 years", "٣ سنوات") built by hand: Arabic needs all six CLDR forms
 * (zero/one/two/few/many/other) to read naturally, plus the genitive dual after a preposition.
 */
enum class CountUnit { Year, Month, Week, Day }

private class ArabicForms(val one: String, val two: String, val few: String, val many: String, val other: String)

private val AR = mapOf(
  CountUnit.Year to ArabicForms("سنة واحدة", "سنتان", "{n} سنوات", "{n} سنة", "{n} سنة"),
  CountUnit.Month to ArabicForms("شهر واحد", "شهران", "{n} أشهر", "{n} شهرًا", "{n} شهر"),
  CountUnit.Week to ArabicForms("أسبوع واحد", "أسبوعان", "{n} أسابيع", "{n} أسبوعًا", "{n} أسبوع"),
  CountUnit.Day to ArabicForms("يوم واحد", "يومان", "{n} أيام", "{n} يومًا", "{n} يوم"),
)

/** The dual after a preposition (بعد يومين، إلى يومين، بـيومين) — genitive, not the nominative يومان. */
private val AR_DUAL_GENITIVE = mapOf(
  CountUnit.Year to "سنتين",
  CountUnit.Month to "شهرين",
  CountUnit.Week to "أسبوعين",
  CountUnit.Day to "يومين",
)

private val EN = mapOf(
  CountUnit.Year to ("year" to "years"),
  CountUnit.Month to ("month" to "months"),
  CountUnit.Week to ("week" to "weeks"),
  CountUnit.Day to ("day" to "days"),
)

/** "9,780" / "٩٬٧٨٠". */
fun formatNumber(n: Int, lang: Lang): String {
  val digits = abs(n.toLong()).toString()
  val separator = if (lang == Lang.AR) '٬' else ','
  val grouped = buildString {
    digits.forEachIndexed { i, c ->
      if (i > 0 && (digits.length - i) % 3 == 0) append(separator)
      append(c)
    }
  }
  return localizeDigits((if (n < 0) "-" else "") + grouped, lang)
}

private fun arabicForm(forms: ArabicForms, n: Int): String {
  val mod100 = n % 100
  return when {
    n == 1 -> forms.one
    n == 2 -> forms.two
    mod100 in 3..10 -> forms.few
    mod100 in 11..99 -> forms.many
    else -> forms.other
  }
}

/**
 * "3 days" / "٣ أيام". Pass `afterPreposition` when the phrase follows بعد / إلى / بـ in the
 * template ("بعد {{days}}"): Arabic then needs the genitive dual (يومين, not يومان).
 */
fun countPhrase(unit: CountUnit, n: Int, lang: Lang, afterPreposition: Boolean = false): String {
  if (lang == Lang.AR) {
    val forms = AR.getValue(unit)
    if (n == 0) return "${localizeDigits(0, Lang.AR)} ${forms.other.replace("{n} ", "")}"
    if (n == 2 && afterPreposition) return AR_DUAL_GENITIVE.getValue(unit)
    return arabicForm(forms, n).replace("{n}", formatNumber(n, Lang.AR))
  }
  val (one, many) = EN.getValue(unit)
  return "${formatNumber(n, Lang.EN)} ${if (n == 1) one else many}"
}

/** Joins non-zero parts: "2 years, 3 months and 5 days" / "سنتان و٣ أشهر و٥ أيام". */
fun joinParts(parts: List<String>, lang: Lang): String {
  if (parts.size <= 1) return parts.joinToString("")
  if (lang == Lang.AR) return parts.joinToString(" و")
  return "${parts.dropLast(1).joinToString(", ")} and ${parts.last()}"
}

/** "25 years, 7 months and 3 days" / "٢٥ سنة و٧ أشهر و٣ أيام"; zero parts are left out. */
fun spanPhrase(span: YmdSpan, lang: Lang): String {
  val parts = listOfNotNull(
    if (span.years > 0) countPhrase(CountUnit.Year, span.years, lang) else null,
    if (span.months > 0) countPhrase(CountUnit.Month, span.months, lang) else null,
    if (span.days > 0) countPhrase(CountUnit.Day, span.days, lang) else null,
  )
  return if (parts.isNotEmpty()) joinParts(parts, lang) else countPhrase(CountUnit.Day, 0, lang)
}
