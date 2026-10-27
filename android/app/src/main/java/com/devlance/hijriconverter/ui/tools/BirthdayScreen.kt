package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.hijriBirthday
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.core.weekdayOfJdn
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.i18n.CountUnit
import com.devlance.hijriconverter.i18n.countPhrase
import com.devlance.hijriconverter.i18n.spanPhrase
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SegmentOption
import com.devlance.hijriconverter.ui.components.SegmentedControl
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.picker.CalendarKind
import com.devlance.hijriconverter.ui.picker.DatePickerSheet
import com.devlance.hijriconverter.ui.picker.Ymd
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions
import com.devlance.hijriconverter.ui.useSettings

/** Where the picker opens when no birth date is saved yet. */
private const val DEFAULT_AGE_DAYS = 30 * 365

/**
 * Tools → Hijri birthday: the birth date in the Hijri calendar, the next Hijri birthday (with a
 * countdown and its Gregorian date — it moves ~11 days earlier every Gregorian year) and the age in
 * Hijri vs Gregorian years. The birth date can be entered in either calendar and is kept on the
 * phone only (settings).
 */
@Composable
fun BirthdayScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val birthJdn = useSettings().birthJdn
  var calendar by remember { mutableStateOf(CalendarKind.Gregorian) }
  var picking by remember { mutableStateOf(false) }

  val today = todayJdn()
  val valid = birthJdn != null && birthJdn <= today
  val info = remember(birthJdn, today, opts) { if (birthJdn != null && birthJdn <= today) hijriBirthday(birthJdn, today, opts) else null }
  val isHijri = calendar == CalendarKind.Hijri
  val pickerJdn = birthJdn ?: (today - DEFAULT_AGE_DAYS)
  fun toYmd(jdn: Int): Ymd =
    if (isHijri) hijriOfJdn(jdn, opts).let { Ymd(it.year, it.month, it.day) } else jdnToGregorian(jdn).let { Ymd(it.year, it.month, it.day) }
  fun fromYmd(v: Ymd): Int = if (isHijri) jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) else gregorianToJdn(v.year, v.month, v.day)
  val fieldValue = when {
    birthJdn == null -> s["birthday.notSet"]
    isHijri -> formatHijri(hijriOfJdn(birthJdn, opts), lang)
    else -> formatGregorian(jdnToGregorian(birthJdn), lang)
  }
  fun dateLine(jdn: Int) = "${weekdayName(weekdayOfJdn(jdn), lang)} ${formatGregorian(jdnToGregorian(jdn), lang)}"

  PageScreen(title = s["tools.birthday.title"], subtitle = s["tools.birthday.description"]) {
    Text(s["birthday.enterIn"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(bottom = Spacing.sm))
    SegmentedControl(
      listOf(SegmentOption(CalendarKind.Gregorian, s["common.gregorian"]), SegmentOption(CalendarKind.Hijri, s["common.hijri"])),
      calendar,
      { calendar = it },
    )
    DateField(s["birthday.birthDate"], fieldValue, { picking = true }, Modifier.padding(top = Spacing.md))
    Note(Lucide.Lock, s["birthday.private"])

    if (birthJdn != null && !valid) {
      Text(s["birthday.future"], style = Type.body, color = c.mourning, modifier = Modifier.padding(top = Spacing.lg))
    }

    if (info != null && birthJdn != null) {
      SectionLabel(s["birthday.nextTitle"])
      Card {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), verticalAlignment = Alignment.CenterVertically) {
          Box(
            Modifier
              .size(52.dp)
              .clip(RoundedCornerShape(Radius.md))
              .background(c.accentSoft),
            contentAlignment = Alignment.Center,
          ) { Icon(Lucide.Cake, c.accent, 26.dp) }
          Column(Modifier.weight(1f)) {
            Text(
              when (info.next.inDays) {
                0 -> s["birthday.today"]
                1 -> s["birthday.tomorrow"]
                else -> s.t("birthday.inDays", "days" to countPhrase(CountUnit.Day, info.next.inDays, lang, afterPreposition = true))
              },
              style = Type.displayMedium,
              color = c.primary,
            )
            Text(s.t("birthday.turning", "age" to localizeDigits(info.next.turning, lang)), style = Type.body, color = c.text)
          }
        }
        Divider(modifier = Modifier.padding(vertical = Spacing.md))
        Text(formatHijri(info.next.hijri, lang), style = Type.title, color = c.text)
        Text(dateLine(info.next.jdn), style = Type.body, color = c.textMuted)
        if (info.next.clamped) Note(Lucide.Info, s.t("birthday.clamped", "month" to hijriMonthName(info.next.hijri.month, lang)))
      }

      SectionLabel(s["birthday.bornTitle"])
      Card {
        Text(formatHijri(info.birthHijri, lang), style = Type.title, color = c.text)
        Text(dateLine(birthJdn), style = Type.body, color = c.textMuted)
      }

      SectionLabel(s["birthday.ageTitle"])
      Card {
        Text(s["birthday.hijriAge"], style = Type.caption, color = c.textMuted)
        Text(spanPhrase(info.hijriAge, lang), style = Type.subtitle, color = c.text, modifier = Modifier.padding(bottom = Spacing.md))
        Text(s["birthday.gregorianAge"], style = Type.caption, color = c.textMuted)
        Text(spanPhrase(info.gregorianAge, lang), style = Type.subtitle, color = c.text)
        Text(s["birthday.why"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(top = Spacing.md))
      }

      Box(
        Modifier
          .padding(top = Spacing.lg)
          .fillMaxWidth()
          .heightIn(min = 48.dp)
          .pressDim({ AppStore.updateSettings { it.copy(birthJdn = null) } }),
        contentAlignment = Alignment.Center,
      ) {
        Text(s["birthday.forget"], style = Type.bodyStrong, color = c.mourning, textAlign = TextAlign.Center)
      }
    }
  }

  DatePickerSheet(
    visible = picking,
    title = s["birthday.birthDate"],
    calendar = calendar,
    initial = toYmd(pickerJdn),
    method = opts.method,
    onConfirm = { v -> fromYmd(v).let { jdn -> AppStore.updateSettings { it.copy(birthJdn = jdn) } } },
    onClose = { picking = false },
  )
}

/** A small icon + caption line under a field or a card's content. */
@Composable
internal fun Note(icon: Lucide, text: String) {
  val c = appTheme().colors
  Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.sm)) {
    Icon(icon, c.textMuted, 14.dp, Modifier.padding(top = 2.dp))
    Text(text, style = Type.caption, color = c.textMuted, modifier = Modifier.weight(1f))
  }
}
