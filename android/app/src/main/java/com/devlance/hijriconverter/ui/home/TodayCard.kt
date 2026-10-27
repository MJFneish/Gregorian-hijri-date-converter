package com.devlance.hijriconverter.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.formatPercent
import com.devlance.hijriconverter.core.formatTime
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.illuminationPercent
import com.devlance.hijriconverter.core.moonPhaseOnDay
import com.devlance.hijriconverter.core.todaySummary
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.OccasionBadge
import com.devlance.hijriconverter.ui.components.SourceBadge
import com.devlance.hijriconverter.ui.components.Star
import com.devlance.hijriconverter.ui.components.heroGradient
import com.devlance.hijriconverter.ui.components.negativeMargin
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.moon.MoonDisc
import com.devlance.hijriconverter.ui.moon.moonGlowMargin
import com.devlance.hijriconverter.ui.rememberNow
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions

private val HERO_STARS = listOf(
  Star(0.12f, 0.03f, 1.6f, 0.7f),
  Star(0.3f, 0.04f, 1.1f, 0.5f),
  Star(0.58f, 0.06f, 1.3f, 0.6f),
  Star(0.92f, 0.6f, 1.2f, 0.5f),
)

/** Tonight's moon, beside the Gregorian date (the big Hijri date keeps the full width). */
private val TODAY_MOON = 64.dp

/**
 * Hero card: today in both calendars, tonight's real moon (the same disc as the converter result),
 * today's occasions, the Maghrib "eve" hint (the user chose midnight as the day change, with an
 * "eve of …" note after Maghrib — see core/Maghrib.kt), and the next upcoming occasion.
 */
@Composable
fun TodayCard(onPressMethod: () -> Unit) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val now = rememberNow()
  val summary = remember(now, opts) { todaySummary(now, opts) }
  val today = summary.today
  val moon = remember(today.jdn) { moonPhaseOnDay(today.jdn) }
  val shape = RoundedCornerShape(Radius.xl)
  val methodShort = s["methods.${opts.method.id}.short"]

  Column(
    Modifier
      .fillMaxWidth()
      .shadow(2.dp, shape, ambientColor = c.cardShadow, spotColor = c.cardShadow)
      .clip(shape)
      .background(c.heroFrom)
      .heroGradient(c.heroFrom, c.heroTo, HERO_STARS)
      .padding(Spacing.xl),
  ) {
    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.md),
    ) {
      Text(
        "${s["home.today"]} · ${weekdayName(today.weekday, lang)}",
        style = Type.label.copy(letterSpacing = if (theme.isRtl) 0.sp else 1.sp),
        color = c.onHeroMuted,
        modifier = Modifier.weight(1f),
      )
      // 32 dp tall; Compose widens its touch area to 48 dp (v1's hitSlop).
      Row(
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .clip(RoundedCornerShape(Radius.pill))
          .pressDim(onPressMethod)
          .semantics(mergeDescendants = true) { contentDescription = s.t("home.changeMethod", "method" to methodShort) }
          .background(Color.White.copy(alpha = 0.16f))
          .heightIn(min = 32.dp)
          .padding(horizontal = Spacing.md, vertical = 6.dp),
      ) {
        Text(methodShort, style = Type.caption, color = c.onHero, modifier = Modifier.clearAndSetSemantics {})
        Icon(if (theme.isRtl) Lucide.ChevronLeft else Lucide.ChevronRight, c.onHero, 14.dp)
      }
    }

    Text(
      formatHijri(today.hijri, lang),
      style = if (theme.isRtl) Type.displayLargeRtl else Type.displayLarge,
      color = c.onHero,
      modifier = Modifier.padding(bottom = 2.dp).semantics { heading() },
    )
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), verticalAlignment = Alignment.CenterVertically) {
      Column(Modifier.weight(1f)) {
        Text(formatGregorian(today.gregorian, lang), style = Type.subtitle, color = c.onHeroMuted, modifier = Modifier.padding(bottom = Spacing.md))
        SourceBadge(today.source, onDark = true)
      }
      // The glow spills over; the disc lines up with the card's padding.
      MoonDisc(moon, TODAY_MOON, Modifier.negativeMargin(moonGlowMargin(TODAY_MOON), moonGlowMargin(TODAY_MOON)))
    }

    if (today.occasions.isNotEmpty()) {
      Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.md)) {
        for (o in today.occasions) OccasionBadge(o, onDark = true)
      }
    }

    Box(
      Modifier
        .padding(vertical = Spacing.lg)
        .fillMaxWidth()
        .height(0.5.dp)
        .background(Color.White.copy(alpha = 0.16f)),
    )

    InfoRow(Lucide.Moon) {
      Text(
        s.t("home.tonightMoon", "phase" to s["moon.phase.${moon.name.key}"], "percent" to formatPercent(illuminationPercent(moon), lang)),
        style = Type.caption,
        color = c.onHeroMuted,
      )
    }

    val eve = summary.eve
    if (eve != null) {
      InfoRow(Lucide.MoonStar) {
        Text(s.t("home.eveOf", "date" to formatHijri(eve.hijri, lang)), style = Type.bodyStrong, color = c.onHero)
        if (eve.occasions.isNotEmpty()) {
          Text(eve.occasions.joinToString(" · ") { it.name(lang) }, style = Type.caption, color = c.heroGold)
        }
        Text(s["home.eveHint"], style = Type.caption, color = c.onHeroMuted)
      }
    } else if (summary.maghrib != null) {
      InfoRow(Lucide.Sunset) {
        Text(s.t("home.maghribAt", "time" to formatTime(summary.maghrib, lang)), style = Type.caption, color = c.onHeroMuted)
      }
    }

    summary.next?.let { next ->
      InfoRow(Lucide.CalendarClock) {
        val whenText = if (next.inDays == 1) s["home.tomorrow"] else s.t("home.inDays", "days" to countPhrase(CountUnit.Day, next.inDays, lang, afterPreposition = true))
        Text(
          s.t("home.nextOccasion", "name" to next.day.occasions.joinToString(" · ") { it.name(lang) }, "when" to whenText),
          style = Type.caption,
          color = c.onHeroMuted,
        )
      }
    }
  }
}

@Composable
private fun InfoRow(icon: Lucide, content: @Composable () -> Unit) {
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    modifier = Modifier.padding(top = Spacing.xs).semantics(mergeDescendants = true) {},
  ) {
    Icon(icon, appTheme().colors.heroGold, 18.dp)
    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { content() }
  }
}
