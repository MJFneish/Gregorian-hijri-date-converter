package com.devlance.hijriconverter.ui.tools

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

/**
 * A tappable date row (label + date, calendar icon) that opens a picker — callers show a
 * DatePickerSheet. `onToday` adds a "Today" chip (pass null when the date already is today).
 */
@Composable
fun DateField(
  label: String,
  value: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  onToday: (() -> Unit)? = null,
  minHeight: Dp = 64.dp,
) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    verticalAlignment = Alignment.CenterVertically,
    modifier = modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(Radius.md))
      .background(c.surfaceAlt)
      .pressDim(onClick)
      .heightIn(min = minHeight)
      .padding(horizontal = Spacing.md, vertical = Spacing.sm),
  ) {
    Icon(Lucide.CalendarDays, c.primary, 20.dp)
    Column(
      Modifier
        .weight(1f)
        .semantics(mergeDescendants = true) { contentDescription = "$label: $value" },
      verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
      Text(label, style = Type.caption, color = c.textMuted, modifier = Modifier.clearAndSetSemantics {})
      Text(value, style = Type.bodyStrong, color = c.text, modifier = Modifier.clearAndSetSemantics {})
    }
    if (onToday != null) {
      // 30 dp tall; Compose widens its touch area to 48 dp.
      Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .clip(RoundedCornerShape(Radius.pill))
          .pressDim(onToday)
          .semantics(mergeDescendants = true) { contentDescription = s["between.setToday"] }
          .background(c.primarySoft)
          .padding(horizontal = Spacing.sm + 2.dp, vertical = 6.dp),
      ) {
        Icon(Lucide.CalendarCheck2, c.primary, 14.dp)
        Text(s["home.today"], style = Type.caption, color = c.primary, modifier = Modifier.clearAndSetSemantics {})
      }
    }
  }
}
