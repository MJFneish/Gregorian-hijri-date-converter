package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.OfficeDate
import com.devlance.hijriconverter.core.compareOffices
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.core.weekdayOfJdn
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SourceBadge
import com.devlance.hijriconverter.ui.components.Tag
import com.devlance.hijriconverter.ui.picker.CalendarKind
import com.devlance.hijriconverter.ui.picker.DatePickerSheet
import com.devlance.hijriconverter.ui.picker.Ymd
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions
import kotlin.math.abs

/**
 * Tools → Compare offices: one day under every office's calendar, measured against the user's
 * chosen one ("a day ahead / behind"), plus when each office started its current month. Lebanese
 * Shia follow different marjas, so the same evening can be the 1st for one and the 30th for
 * another. Opened from the Tools tab (today) or from the converter's result (that day). The
 * ±adjustment isn't applied here: these are the offices' own calendars.
 */
@Composable
fun CompareOfficesScreen(initialJdn: Int?) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val reference = opts.method
  var jdn by remember { mutableIntStateOf(initialJdn ?: todayJdn()) }
  var picking by remember { mutableStateOf(false) }

  // `opts` (not just the method) so a downloaded table update recomputes the rows.
  val rows = remember(jdn, opts) { compareOffices(jdn, opts.method) }
  val spread = rows.maxOf { it.offset } - rows.minOf { it.offset }
  val gregorian = jdnToGregorian(jdn)
  val weekday = weekdayName(weekdayOfJdn(jdn), lang)

  fun offsetText(row: OfficeDate) = if (row.offset == 0) {
    s["compare.same"]
  } else {
    s.t(if (row.offset > 0) "compare.ahead" else "compare.behind", "days" to countPhrase(CountUnit.Day, abs(row.offset), lang, afterPreposition = true))
  }

  PageScreen(title = s["tools.compare.title"], subtitle = s["tools.compare.description"]) {
    DateField(
      label = s["compare.date"],
      value = "$weekday · ${formatGregorian(gregorian, lang)}",
      onClick = { picking = true },
      onToday = if (jdn != todayJdn()) ({ jdn = todayJdn() }) else null,
    )

    val agree = spread == 0
    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .padding(vertical = Spacing.lg)
        .fillMaxWidth()
        .clip(RoundedCornerShape(Radius.md))
        .background(if (agree) c.celebrationSoft else c.accentSoft)
        .padding(Spacing.md),
    ) {
      Icon(if (agree) Lucide.CircleCheck else Lucide.GitCompareArrows, if (agree) c.celebration else c.accent, 18.dp)
      Text(
        if (agree) s["compare.agree"] else s.t("compare.differ", "days" to countPhrase(CountUnit.Day, spread, lang, afterPreposition = true)),
        style = Type.bodyStrong,
        color = if (agree) c.celebration else c.accent,
        modifier = Modifier.weight(1f),
      )
    }

    Card(padding = Spacing.xs) {
      rows.forEachIndexed { index, row ->
        val mine = row.method == reference
        if (index > 0) Divider(modifier = Modifier.padding(horizontal = Spacing.md))
        Column(
          Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(if (mine) c.primarySoft else Color.Transparent)
            .padding(Spacing.md),
        ) {
          Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            Text(s["methods.${row.method.id}.name"], style = Type.caption, color = c.textMuted, modifier = Modifier.weight(1f))
            if (mine) {
              Tag(s["compare.yourChoice"], c.onPrimary, c.primary)
            } else if (row.method == MethodId.UmmAlQura) {
              Tag(s["settings.sunniTag"], c.textMuted, c.surfaceAlt)
            }
          }
          Text(formatHijri(row.hijri, lang), style = Type.title, color = c.text, modifier = Modifier.padding(vertical = Spacing.xs))
          Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            SourceBadge(row.source)
            Spacer(Modifier.weight(1f))
            if (!mine) {
              if (row.offset == 0) {
                Tag(offsetText(row), c.celebration, c.celebrationSoft)
              } else {
                Tag(offsetText(row), c.accent, c.accentSoft)
              }
            }
          }
        }
      }
    }

    SectionLabel(s["compare.monthTitle"])
    Card(padding = Spacing.xs) {
      rows.forEachIndexed { index, row ->
        if (index > 0) Divider(modifier = Modifier.padding(horizontal = Spacing.md))
        Column(Modifier.fillMaxWidth().padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(2.dp)) {
          Text(s["methods.${row.method.id}.short"], style = Type.bodyStrong, color = c.text)
          Text(
            s.t(
              "compare.monthStarted",
              "month" to hijriMonthName(row.hijri.month, lang),
              "date" to "${weekdayName(weekdayOfJdn(row.monthStart), lang)} ${formatGregorian(jdnToGregorian(row.monthStart), lang)}",
              "length" to countPhrase(CountUnit.Day, row.monthLength, lang),
            ),
            style = Type.body,
            color = c.textMuted,
          )
        }
      }
    }

    if (opts.adjustment != 0) {
      Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.lg)) {
        Icon(Lucide.Info, c.textMuted, 16.dp)
        Text(s["compare.adjustmentNote"], style = Type.caption, color = c.textMuted, modifier = Modifier.weight(1f))
      }
    }
  }

  DatePickerSheet(
    visible = picking,
    title = s["compare.date"],
    calendar = CalendarKind.Gregorian,
    initial = Ymd(gregorian.year, gregorian.month, gregorian.day),
    method = reference,
    onConfirm = { v -> jdn = gregorianToJdn(v.year, v.month, v.day) },
    onClose = { picking = false },
  )
}
