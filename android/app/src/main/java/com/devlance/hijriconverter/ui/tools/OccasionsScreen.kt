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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.OccasionKind
import com.devlance.hijriconverter.core.UpcomingOccasion
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.isoDate
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.core.moonPhaseOnDay
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.core.upcomingOccasions
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.IconBadge
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SegmentOption
import com.devlance.hijriconverter.ui.components.SegmentedControl
import com.devlance.hijriconverter.ui.components.Tag
import com.devlance.hijriconverter.ui.components.kindStyle
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.home.ShareCard
import com.devlance.hijriconverter.ui.share.LocalShare
import com.devlance.hijriconverter.ui.share.ShareRequest
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.TOUCH_TARGET
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions

private enum class Filter { All, Mourning, Celebration }

private class MonthGroup(val key: String, val title: String, val items: MutableList<UpcomingOccasion> = mutableListOf())

/**
 * Tools → Occasions: every occasion in the coming Hijri year under the user's method, grouped by
 * Hijri month, with a countdown — and each one shareable as an image (the same card as the
 * converter's share, led by that occasion).
 */
@Composable
fun OccasionsScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val shareController = LocalShare.current
  var filter by remember { mutableStateOf(Filter.All) }
  var sharingKey by remember { mutableStateOf<String?>(null) }
  // The spinner shows until the capture is done.
  LaunchedEffect(shareController.busy) { if (!shareController.busy) sharingKey = null }

  val all = remember(opts) { upcomingOccasions(todayJdn(), opts) }
  val groups = remember(all, filter, lang) {
    val list = when (filter) {
      Filter.All -> all
      Filter.Mourning -> all.filter { it.occasion.kind == OccasionKind.Mourning }
      Filter.Celebration -> all.filter { it.occasion.kind == OccasionKind.Celebration }
    }
    val byMonth = mutableListOf<MonthGroup>()
    for (u in list) {
      val key = "${u.day.hijri.year}-${u.day.hijri.month}"
      if (byMonth.lastOrNull()?.key != key) {
        byMonth.add(MonthGroup(key, "${hijriMonthName(u.day.hijri.month, lang)} ${localizeDigits(u.day.hijri.year, lang)}"))
      }
      byMonth.last().items.add(u)
    }
    byMonth
  }

  fun countdown(inDays: Int) = when (inDays) {
    0 -> s["occasions.today"]
    1 -> s["occasions.tomorrow"]
    else -> s.t("occasions.inDays", "days" to countPhrase(CountUnit.Day, inDays, lang, afterPreposition = true))
  }

  fun shareOccasion(u: UpcomingOccasion, key: String) {
    val name = u.occasion.name(lang)
    val weekday = weekdayName(u.day.weekday, lang)
    val hijri = formatHijri(u.day.hijri, lang)
    val gregorian = formatGregorian(u.day.gregorian, lang)
    val method = opts.method
    val label = s["home.resultHijri"]
    sharingKey = key
    shareController.share(
      ShareRequest(
        card = { ShareCard(u.day, label, hijri, "$weekday · $gregorian", moonPhaseOnDay(u.day.jdn), method, highlight = u.occasion) },
        message = "$name\n$weekday${if (lang == Lang.AR) "، " else ", "}$hijri = $gregorian\n" +
          s.t("home.shareFooter", "method" to s["methods.${method.id}.name"]),
        filename = "HijriConverter-${isoDate(u.day.gregorian)}",
      ),
    )
  }

  PageScreen(title = s["tools.occasions.title"], subtitle = s["tools.occasions.description"]) {
    SegmentedControl(
      listOf(
        SegmentOption(Filter.All, s["occasions.all"]),
        SegmentOption(Filter.Mourning, s["occasions.mourning"]),
        SegmentOption(Filter.Celebration, s["occasions.celebration"]),
      ),
      filter,
      { filter = it },
    )

    for (group in groups) {
      SectionLabel(group.title)
      Card(padding = 0.dp) {
        Column(Modifier.padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
          group.items.forEachIndexed { index, u ->
            val key = "${u.day.jdn}-${u.occasion.nameEn}"
            val name = u.occasion.name(lang)
            val style = kindStyle(u.occasion.kind)
            val soon = u.inDays <= 1
            if (index > 0) Divider()
            Row(
              horizontalArrangement = Arrangement.spacedBy(Spacing.md),
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md),
            ) {
              IconBadge(style.icon, style.fg, style.bg)
              Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(name, style = Type.bodyStrong, color = c.text)
                Text(
                  "${formatHijri(u.day.hijri, lang)} · ${weekdayName(u.day.weekday, lang)} ${formatGregorian(u.day.gregorian, lang)}",
                  style = Type.caption,
                  color = c.textMuted,
                )
                Tag(
                  countdown(u.inDays),
                  if (soon) c.onPrimary else c.primary,
                  if (soon) c.primary else c.primarySoft,
                  modifier = Modifier.padding(top = Spacing.xs),
                )
              }
              Box(
                Modifier
                  .size(TOUCH_TARGET)
                  .pressable(
                    onClick = { shareOccasion(u, key) },
                    enabled = !shareController.busy,
                    dimWhenDisabled = false,
                    label = s.t("occasions.share", "name" to name),
                  )
                  .clip(CircleShape)
                  .background(c.surfaceAlt),
                contentAlignment = Alignment.Center,
              ) {
                if (sharingKey == key) {
                  CircularProgressIndicator(color = c.primary, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                } else {
                  Icon(Lucide.Share2, c.primary, 18.dp)
                }
              }
            }
          }
        }
      }
    }
  }
}
