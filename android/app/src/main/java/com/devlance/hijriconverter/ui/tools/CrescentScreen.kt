package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.CrescentReport
import com.devlance.hijriconverter.core.MonthStartForecast
import com.devlance.hijriconverter.core.Visibility
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatTime
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.hijri.YearMonth
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.jsRound
import com.devlance.hijriconverter.core.localDate
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.core.monthStartForecast
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.core.weekdayOfJdn
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SourceBadge
import com.devlance.hijriconverter.ui.components.Tag
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.TOUCH_TARGET
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** How many month starts ahead the stepper goes. */
private const val MAX_AHEAD = 11

private fun addMonths(m: YearMonth, n: Int): YearMonth {
  val index = m.year * 12 + (m.month - 1) + n
  return YearMonth(Math.floorDiv(index, 12), Math.floorMod(index, 12) + 1)
}

/**
 * Tools → Crescent forecast: can the new crescent be seen on the evenings of the 29th and 30th,
 * from Beirut (Fadlallah's reference), Najaf (Sistani) and Iran (best of the 6 cities the Iran
 * prediction uses)? Odeh's criterion, run on the phone (core/Crescent.kt — the same rule the month
 * tables are built with), plus each office's expected 1st of the new month. The astronomy runs off
 * the main thread, with a "Calculating…" state.
 */
@Composable
fun CrescentScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val current = remember(opts) { hijriOfJdn(todayJdn(), opts).let { YearMonth(it.year, it.month) } }
  var ahead by remember { mutableIntStateOf(0) }
  val ending = addMonths(current, ahead)
  val starting = addMonths(ending, 1)
  val forecast by produceState<MonthStartForecast?>(null, ending, opts) {
    value = null
    value = withContext(Dispatchers.Default) { monthStartForecast(ending, opts) }
  }

  fun monthTitle(m: YearMonth) = "${hijriMonthName(m.month, lang)} ${localizeDigits(m.year, lang)}"
  fun dateOf(jdn: Int) = "${weekdayName(weekdayOfJdn(jdn), lang)} ${formatGregorian(jdnToGregorian(jdn), lang)}"

  @Composable
  fun chip(visibility: Visibility) {
    val (fg, bg) = when (visibility) {
      Visibility.NakedEye -> c.celebration to c.celebrationSoft
      Visibility.OpticalMaybeEye -> c.primary to c.primarySoft
      Visibility.OpticalOnly -> c.accent to c.accentSoft
      else -> c.textMuted to c.surfaceAlt
    }
    Tag(s["crescent.visibility.${visibility.key}"], fg, bg)
  }

  fun details(r: CrescentReport): String? {
    val ageHours = r.ageHours
    if (r.visibility == Visibility.NotBorn || ageHours == null) return null
    val age = s.t("crescent.hours", "n" to localizeDigits(jsRound(ageHours).toInt(), lang))
    val lag = r.lagMinutes
    return when {
      lag == null -> s.t("crescent.age", "age" to age)
      lag <= 0 -> s.t("crescent.ageSetsFirst", "age" to age)
      else -> s.t("crescent.ageLag", "age" to age, "lag" to s.t("crescent.minutes", "n" to localizeDigits(jsRound(lag).toInt(), lang)))
    }
  }

  @Composable
  fun place(name: String, hint: String, report: CrescentReport, divider: Boolean) {
    if (divider) Divider()
    Column(Modifier.fillMaxWidth().padding(vertical = Spacing.md), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text(name, style = Type.bodyStrong, color = c.text)
      chip(report.visibility)
      details(report)?.let { Text(it, style = Type.caption, color = c.textMuted) }
      Text(hint, style = Type.caption, color = c.textMuted)
    }
  }

  PageScreen(title = s["tools.crescent.title"], subtitle = s["tools.crescent.description"]) {
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
      StepButton(if (theme.isRtl) Lucide.ChevronRight else Lucide.ChevronLeft, s["crescent.previous"], ahead > 0) { ahead = maxOf(0, ahead - 1) }
      Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
          s.t("crescent.startOf", "month" to monthTitle(starting)),
          style = Type.title,
          color = c.text,
          textAlign = TextAlign.Center,
          modifier = Modifier.semantics { heading() },
        )
        Text(s.t("crescent.endOf", "month" to monthTitle(ending)), style = Type.caption, color = c.textMuted, textAlign = TextAlign.Center)
      }
      StepButton(if (theme.isRtl) Lucide.ChevronLeft else Lucide.ChevronRight, s["crescent.next"], ahead < MAX_AHEAD) {
        ahead = minOf(MAX_AHEAD, ahead + 1)
      }
    }

    val f = forecast
    if (f == null) {
      Column(
        Modifier.fillMaxWidth().padding(vertical = Spacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
      ) {
        CircularProgressIndicator(color = c.primary, strokeWidth = 3.dp, modifier = Modifier.size(28.dp))
        Text(s["crescent.calculating"], style = Type.caption, color = c.textMuted)
      }
    } else {
      f.conjunction?.let { at ->
        val local = localDate(at)
        Row(
          horizontalArrangement = Arrangement.spacedBy(Spacing.md),
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .padding(top = Spacing.lg)
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(c.primarySoft)
            .padding(Spacing.md),
        ) {
          Icon(Lucide.MoonStar, c.primary, 20.dp)
          Column(Modifier.weight(1f)) {
            Text(s["crescent.conjunction"], style = Type.caption, color = c.primary)
            Text(
              s.t(
                "crescent.conjunctionAt",
                "date" to "${weekdayName(weekdayOfJdn(gregorianToJdn(local)), lang)} ${formatGregorian(local, lang)}",
                "time" to formatTime(at, lang),
              ),
              style = Type.bodyStrong,
              color = c.text,
            )
          }
        }
      }

      for (evening in f.evenings) {
        SectionLabel(
          s.t(
            "crescent.evening",
            "day" to localizeDigits(evening.monthDay, lang),
            "month" to hijriMonthName(ending.month, lang),
            "date" to dateOf(evening.jdn),
          ),
        )
        Card(padding = 0.dp) {
          Column(Modifier.padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
            place(s["crescent.place.beirut"], s["crescent.hint.beirut"], evening.beirut, false)
            place(s["crescent.place.najaf"], s["crescent.hint.najaf"], evening.najaf, true)
            place(
              s.t("crescent.place.iran", "city" to s["crescent.city.${evening.iran.key}"]),
              s["crescent.hint.iran"],
              evening.iran.report,
              true,
            )
          }
        }
      }

      SectionLabel(s.t("crescent.expected", "month" to hijriMonthName(starting.month, lang)))
      Card(padding = 0.dp) {
        Column(Modifier.padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
          f.starts.forEachIndexed { index, start ->
            if (index > 0) Divider()
            Row(
              horizontalArrangement = Arrangement.spacedBy(Spacing.md),
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md),
            ) {
              Column(Modifier.weight(1f)) {
                Text(s["methods.${start.method.id}.short"], style = Type.bodyStrong, color = c.text)
                Text(dateOf(start.jdn), style = Type.caption, color = c.textMuted)
              }
              SourceBadge(start.source)
            }
          }
        }
      }

      Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.lg)) {
        Icon(Lucide.Info, c.textMuted, 16.dp, Modifier.padding(top = 1.dp))
        Text(s["crescent.how"], style = Type.caption, color = c.textMuted, modifier = Modifier.weight(1f))
      }
    }
  }
}

@Composable
private fun StepButton(icon: Lucide, label: String, enabled: Boolean, onClick: () -> Unit) {
  val c = appTheme().colors
  Box(
    Modifier
      .size(TOUCH_TARGET)
      .pressable(onClick = onClick, enabled = enabled, label = label)
      .clip(CircleShape)
      .background(c.surfaceAlt),
    contentAlignment = Alignment.Center,
  ) { Icon(icon, c.text, 22.dp) }
}
