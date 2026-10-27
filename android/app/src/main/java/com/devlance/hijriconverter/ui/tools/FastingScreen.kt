package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.FastReason
import com.devlance.hijriconverter.core.FastingDay
import com.devlance.hijriconverter.core.SISTANI_ONLY
import com.devlance.hijriconverter.core.WHOLE_MONTHS
import com.devlance.hijriconverter.core.fastingDays
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.core.monthsAhead
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.Tag
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions

/** Shown by default: this Hijri month and the next two; "Show the whole year" extends to 12. */
private const val SHORT_MONTHS = 3
private const val YEAR_MONTHS = 12

private class FastingMonth(val key: String, val year: Int, val month: Int, val title: String, val days: MutableList<FastingDay> = mutableListOf())

/**
 * Tools → Fasting days: the recommended (mustahab) fasts coming up, grouped by Hijri month under the
 * user's method, with countdowns. A list only — no reminders (user's choice, 2026-10-26). Rules and
 * sources: core/Fasting.kt.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FastingScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  var wholeYear by remember { mutableStateOf(false) }

  val groups = remember(opts, wholeYear, lang) {
    val today = todayJdn()
    val end = monthsAhead(today, if (wholeYear) YEAR_MONTHS else SHORT_MONTHS, opts)
    val byMonth = mutableListOf<FastingMonth>()
    for (f in fastingDays(today, end, opts)) {
      val (year, month) = f.day.hijri
      val key = "$year-$month"
      if (byMonth.lastOrNull()?.key != key) {
        byMonth.add(FastingMonth(key, year, month, "${hijriMonthName(month, lang)} ${localizeDigits(year, lang)}"))
      }
      byMonth.last().days.add(f)
    }
    byMonth
  }

  fun countdown(inDays: Int) = when (inDays) {
    0 -> s["occasions.today"]
    1 -> s["occasions.tomorrow"]
    else -> s.t("occasions.inDays", "days" to countPhrase(CountUnit.Day, inDays, lang, afterPreposition = true))
  }
  fun gregorianOf(jdn: Int) = formatGregorian(jdnToGregorian(jdn), lang)

  PageScreen(title = s["tools.fasting.title"], subtitle = s["tools.fasting.description"]) {
    for (group in groups) {
      SectionLabel(group.title)
      if (group.month in WHOLE_MONTHS) {
        val last = hijriMonthLength(group.year, group.month, opts.method)
        Row(
          horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .padding(bottom = Spacing.sm)
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(c.celebrationSoft)
            .padding(Spacing.md),
        ) {
          Icon(Lucide.Sparkles, c.celebration, 18.dp)
          Column(Modifier.weight(1f)) {
            Text(s[if (group.month == 7) "fasting.rajab" else "fasting.shaban"], style = Type.bodyStrong, color = c.celebration)
            Text(
              s.t(
                "fasting.range",
                "from" to gregorianOf(jdnOfHijri(HijriDate(group.year, group.month, 1), opts)),
                "to" to gregorianOf(jdnOfHijri(HijriDate(group.year, group.month, last), opts)),
              ),
              style = Type.caption,
              color = c.celebration,
            )
          }
        }
      }
      Card(padding = 0.dp) {
        Column(Modifier.padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
          group.days.forEachIndexed { index, f ->
            val abstain = FastReason.AshuraAbstain in f.reasons
            val arafahCaution = FastReason.Arafah in f.reasons && f.day.source != DateSource.Official
            val fg = if (abstain) c.mourning else c.primary
            if (index > 0) Divider()
            Row(
              horizontalArrangement = Arrangement.spacedBy(Spacing.md),
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md),
            ) {
              Column(
                Modifier
                  .width(84.dp)
                  .clip(RoundedCornerShape(Radius.md))
                  .background(if (abstain) c.mourningSoft else c.primarySoft)
                  .padding(vertical = Spacing.xs),
                horizontalAlignment = Alignment.CenterHorizontally,
              ) {
                Text(localizeDigits(f.day.hijri.day, lang), style = Type.title, color = fg)
                Text(weekdayName(f.day.weekday, lang), style = Type.caption, color = fg, maxLines = 1, overflow = TextOverflow.Ellipsis)
              }
              Column(Modifier.weight(1f)) {
                for (r in f.reasons) {
                  FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), itemVerticalAlignment = Alignment.CenterVertically) {
                    Text(s["fasting.reason.${r.key}"], style = Type.bodyStrong, color = if (abstain) c.mourning else c.text)
                    if (r in SISTANI_ONLY) Tag(s["fasting.sistani"], c.textMuted, c.surfaceAlt)
                  }
                }
                Text(gregorianOf(f.day.jdn), style = Type.caption, color = c.textMuted)
                if (arafahCaution) {
                  Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), modifier = Modifier.padding(top = Spacing.xs)) {
                    Icon(Lucide.TriangleAlert, c.accent, 14.dp, Modifier.padding(top = 2.dp))
                    Text(s["fasting.arafahCaution"], style = Type.caption, color = c.accent, modifier = Modifier.weight(1f))
                  }
                }
              }
              if (f.inDays <= 1) Tag(countdown(f.inDays), c.onPrimary, c.primary) else Tag(countdown(f.inDays), c.primary, c.primarySoft)
            }
          }
        }
      }
    }

    if (!wholeYear) {
      Box(
        Modifier
          .padding(top = Spacing.md)
          .fillMaxWidth()
          .heightIn(min = 48.dp)
          .pressDim({ wholeYear = true }),
        contentAlignment = Alignment.Center,
      ) {
        Text(s["fasting.showYear"], style = Type.bodyStrong, color = c.primary, textAlign = TextAlign.Center)
      }
    }

    SectionLabel(s["fasting.notesTitle"])
    Card {
      Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        for (key in listOf("forbidden", "ashura", "conditions")) {
          NoteRow(Lucide.Info, s["fasting.note.$key"], c.text)
        }
        NoteRow(Lucide.BookOpen, s["fasting.note.sources"], c.textMuted)
      }
    }
  }
}

@Composable
private fun NoteRow(icon: Lucide, text: String, color: Color) {
  Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
    Icon(icon, appTheme().colors.textMuted, 16.dp, Modifier.padding(top = 1.dp))
    Text(text, style = Type.caption, color = color, modifier = Modifier.weight(1f))
  }
}
