package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.gregorianMonthLength
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.spanBetween
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.i18n.formatNumber
import com.devlance.hijriconverter.i18n.joinParts
import com.devlance.hijriconverter.i18n.spanPhrase
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SegmentOption
import com.devlance.hijriconverter.ui.components.SegmentedControl
import com.devlance.hijriconverter.ui.components.negativeMargin
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.picker.CalendarKind
import com.devlance.hijriconverter.ui.picker.DatePickerSheet
import com.devlance.hijriconverter.ui.picker.Ymd
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions

private enum class Field { From, To }

/**
 * Tools → Days between: the days between two dates, plus the same span in years/months/days of the
 * chosen calendar — handy for ages in Hijri years. Defaults to "since 1 Muharram of this Hijri
 * year".
 */
@Composable
fun DaysBetweenScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()

  var calendar by remember { mutableStateOf(CalendarKind.Hijri) }
  var toJdn by remember { mutableIntStateOf(todayJdn()) }
  var fromJdn by remember { mutableIntStateOf(jdnOfHijri(HijriDate(hijriOfJdn(todayJdn(), opts).year, 1, 1), opts)) }
  var editing by remember { mutableStateOf<Field?>(null) }

  val isHijri = calendar == CalendarKind.Hijri
  fun toYmd(jdn: Int): Ymd =
    if (isHijri) hijriOfJdn(jdn, opts).let { Ymd(it.year, it.month, it.day) } else jdnToGregorian(jdn).let { Ymd(it.year, it.month, it.day) }
  fun fromYmd(v: Ymd): Int = if (isHijri) jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) else gregorianToJdn(v.year, v.month, v.day)
  fun format(jdn: Int): String = if (isHijri) formatHijri(hijriOfJdn(jdn, opts), lang) else formatGregorian(jdnToGregorian(jdn), lang)

  val a = minOf(fromJdn, toJdn)
  val b = maxOf(fromJdn, toJdn)
  val days = b - a
  val span = remember(a, b, calendar, opts) {
    if (isHijri) {
      spanBetween(hijriOfJdn(a, opts), hijriOfJdn(b, opts), { y, m -> hijriMonthLength(y, m, opts.method) }) { y, m, d ->
        jdnFromHijri(HijriDate(y, m, d), opts.method)
      }
    } else {
      spanBetween(jdnToGregorian(a), jdnToGregorian(b), ::gregorianMonthLength) { y, m, d -> gregorianToJdn(y, m, d) }
    }
  }
  val weeks = days / 7
  val weeksText = if (weeks > 0) {
    joinParts(listOfNotNull(countPhrase(CountUnit.Week, weeks, lang), if (days % 7 > 0) countPhrase(CountUnit.Day, days % 7, lang) else null), lang)
  } else {
    null
  }

  PageScreen(title = s["between.title"], subtitle = s["tools.daysBetween.description"]) {
    Card {
      SegmentedControl(
        listOf(SegmentOption(CalendarKind.Hijri, s["common.hijri"]), SegmentOption(CalendarKind.Gregorian, s["common.gregorian"])),
        calendar,
        { calendar = it },
      )
      Column(Modifier.padding(top = Spacing.lg)) {
        DateField(s["between.from"], format(fromJdn), { editing = Field.From }, minHeight = 56.dp)
        // The swap button overlaps both fields.
        Box(
          Modifier
            .fillMaxWidth()
            .negativeMargin(vertical = 10.dp)
            .zIndex(2f),
          contentAlignment = Alignment.Center,
        ) {
          Box(
            Modifier
              .size(36.dp)
              .pressable(
                onClick = {
                  val from = fromJdn
                  fromJdn = toJdn
                  toJdn = from
                },
                label = s["between.swap"],
              )
              .clip(CircleShape)
              .background(c.card)
              .border(1.dp, c.border, CircleShape),
            contentAlignment = Alignment.Center,
          ) { Icon(Lucide.ArrowDownUp, c.primary, 16.dp) }
        }
        DateField(
          s["between.to"],
          format(toJdn),
          { editing = Field.To },
          onToday = if (toJdn != todayJdn()) ({ toJdn = todayJdn() }) else null,
          minHeight = 56.dp,
        )
      }

      Column(
        Modifier
          .padding(top = Spacing.lg)
          .fillMaxWidth()
          .clip(RoundedCornerShape(Radius.md))
          .background(c.primarySoft)
          .padding(vertical = Spacing.lg, horizontal = Spacing.md)
          .semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Text(formatNumber(days, lang), style = Type.displayMedium, color = c.primary, textAlign = TextAlign.Center)
        Text(s["between.daysLabel"], style = Type.bodyStrong, color = c.text, textAlign = TextAlign.Center)
        Text(spanPhrase(span, lang), style = Type.body, color = c.text, textAlign = TextAlign.Center, modifier = Modifier.padding(top = Spacing.sm))
        if (weeksText != null) Text("≈ $weeksText", style = Type.caption, color = c.textMuted, textAlign = TextAlign.Center)
        if (fromJdn > toJdn) {
          Text(s["between.reversed"], style = Type.caption, color = c.textMuted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = Spacing.xs))
        }
      }
    }
  }

  val field = editing
  DatePickerSheet(
    visible = field != null,
    title = if (field == Field.To) s["between.to"] else s["between.from"],
    calendar = calendar,
    initial = toYmd(if (field == Field.To) toJdn else fromJdn),
    method = opts.method,
    onConfirm = { v -> if (field == Field.To) toJdn = fromYmd(v) else fromJdn = fromYmd(v) },
    onClose = { editing = null },
  )
}
