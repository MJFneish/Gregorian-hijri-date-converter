package com.devlance.hijriconverter.ui.picker

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.devlance.hijriconverter.core.gregorianMonthLength
import com.devlance.hijriconverter.core.hijri.GREGORIAN_MAX_YEAR
import com.devlance.hijriconverter.core.hijri.GREGORIAN_MIN_YEAR
import com.devlance.hijriconverter.core.hijri.HIJRI_MAX_YEAR
import com.devlance.hijriconverter.core.hijri.HIJRI_MIN_YEAR
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.gregorianMonthName
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

enum class CalendarKind { Gregorian, Hijri }

/** A day/month/year in either calendar, as the wheels edit it. */
data class Ymd(val year: Int, val month: Int, val day: Int)

/**
 * Day / month / year wheels for either calendar. Changing month or year clamps the day to the new
 * month's length (e.g. 30 Safar → 29 when that Safar has 29 days). Mirrors in Arabic (the row
 * follows the layout direction).
 */
@Composable
fun DateWheels(calendar: CalendarKind, value: Ymd, onChange: (Ymd) -> Unit, method: MethodId, fadeColor: Color, modifier: Modifier = Modifier) {
  val theme = appTheme()
  val s = theme.strings
  val isHijri = calendar == CalendarKind.Hijri
  val minYear = if (isHijri) HIJRI_MIN_YEAR else GREGORIAN_MIN_YEAR
  val maxYear = if (isHijri) HIJRI_MAX_YEAR else GREGORIAN_MAX_YEAR
  fun monthLength(y: Int, m: Int) = if (isHijri) hijriMonthLength(y, m, method) else gregorianMonthLength(y, m)

  val years = remember(minYear, maxYear, theme.lang) { (minYear..maxYear).map { localizeDigits(it, theme.lang) } }
  val months = remember(isHijri, theme.lang) {
    (1..12).map { if (isHijri) hijriMonthName(it, theme.lang) else gregorianMonthName(it, theme.lang) }
  }
  val dayCount = monthLength(value.year, value.month)
  val days = remember(dayCount, theme.lang) { (1..dayCount).map { localizeDigits(it, theme.lang) } }

  fun change(year: Int, month: Int, day: Int) = onChange(Ymd(year, month, minOf(day, monthLength(year, month))))

  Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), modifier = modifier.fillMaxWidth()) {
    Column(Modifier.weight(0.8f)) {
      ColumnLabel(s["picker.day"])
      // Keyed on the calendar so switching direction rebuilds the wheel at the new position.
      androidx.compose.runtime.key(calendar, "day") {
        WheelPicker(days, minOf(value.day, dayCount) - 1, { i -> change(value.year, value.month, i + 1) }, s["picker.day"], fadeColor)
      }
    }
    Column(Modifier.weight(1.6f)) {
      ColumnLabel(s["picker.month"])
      androidx.compose.runtime.key(calendar, "month") {
        WheelPicker(months, value.month - 1, { i -> change(value.year, i + 1, value.day) }, s["picker.month"], fadeColor)
      }
    }
    Column(Modifier.weight(1.1f)) {
      ColumnLabel(s["picker.year"])
      androidx.compose.runtime.key(calendar, "year") {
        WheelPicker(years, value.year.coerceIn(minYear, maxYear) - minYear, { i -> change(minYear + i, value.month, value.day) }, s["picker.year"], fadeColor)
      }
    }
  }
}

@Composable
private fun ColumnLabel(text: String) {
  val theme = appTheme()
  Text(
    text,
    style = Type.caption,
    color = theme.colors.textMuted,
    textAlign = TextAlign.Center,
    modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.xs),
  )
}

/** Bottom sheet with date wheels; changes apply only on "Done". */
@Composable
fun DatePickerSheet(
  visible: Boolean,
  title: String,
  calendar: CalendarKind,
  initial: Ymd,
  method: MethodId,
  onConfirm: (Ymd) -> Unit,
  onClose: () -> Unit,
) {
  if (!visible) return
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  var draft by remember { mutableStateOf(initial) }
  var shown by remember { mutableStateOf(false) }
  LaunchedEffect(Unit) { shown = true }
  Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
    Box(Modifier.fillMaxSize()) {
      Box(
        Modifier
          .fillMaxSize()
          .background(c.scrim)
          .pressable(onClick = onClose, role = null, label = s["common.close"]),
      )
      AnimatedVisibility(
        visible = shown,
        enter = slideInVertically(tween(260)) { it } + fadeIn(tween(200)),
        exit = slideOutVertically(tween(200)) { it } + fadeOut(tween(150)),
        modifier = Modifier.align(Alignment.BottomCenter),
      ) {
        Column(
          Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = Radius.xl, topEnd = Radius.xl))
            .background(c.surface)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.sm, bottom = Spacing.lg),
        ) {
          Box(
            Modifier
              .align(Alignment.CenterHorizontally)
              .size(40.dp, 4.dp)
              .clip(RoundedCornerShape(2.dp))
              .background(c.border),
          )
          Text(
            title,
            style = Type.title,
            color = c.text,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = Spacing.md, bottom = Spacing.md),
          )
          DateWheels(calendar, draft, { draft = it }, method, c.surface)
          Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), modifier = Modifier.padding(top = Spacing.lg)) {
            SheetButton(s["common.cancel"], c.surfaceAlt, c.text, Modifier.weight(1f), onClose)
            SheetButton(s["common.done"], c.primary, c.onPrimary, Modifier.weight(1f)) {
              onConfirm(draft)
              onClose()
            }
          }
        }
      }
    }
  }
}

@Composable
private fun SheetButton(text: String, background: Color, color: Color, modifier: Modifier, onClick: () -> Unit) {
  Box(
    modifier
      .pressable(onClick = onClick, role = Role.Button)
      .clip(RoundedCornerShape(Radius.md))
      .background(background)
      .heightIn(min = 48.dp),
    contentAlignment = Alignment.Center,
  ) { Text(text, style = Type.bodyStrong, color = color) }
}
