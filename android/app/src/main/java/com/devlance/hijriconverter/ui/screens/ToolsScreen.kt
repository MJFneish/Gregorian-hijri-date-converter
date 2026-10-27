package com.devlance.hijriconverter.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.LocalNavigator
import com.devlance.hijriconverter.ui.Route
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.CenteredNote
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.IconBadge
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.PageScreen
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

private data class Tool(val route: Route, val icon: Lucide, val key: String)

/** Every page reachable from the Tools tab, in display order. A new tool = a [Route], a page in
 * [toolPage], an entry here and `tools.<key>.title/description` strings. */
private val TOOLS = listOf(
  Tool(Route.CompareOffices(), Lucide.Scale, "compare"),
  Tool(Route.Occasions, Lucide.CalendarHeart, "occasions"),
  Tool(Route.Birthday, Lucide.Cake, "birthday"),
  Tool(Route.Fasting, Lucide.UtensilsCrossed, "fasting"),
  Tool(Route.Crescent, Lucide.Telescope, "crescent"),
  Tool(Route.DaysBetween, Lucide.Hourglass, "daysBetween"),
)

/**
 * The Tools tab: everything beyond the converter, one row per page, so Home stays just the Today
 * card and the converter (user request, 2026-10-26 — the app is a converter, not a calendar).
 */
@Composable
fun ToolsScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val navigator = LocalNavigator.current
  Column(
    Modifier
      .fillMaxSize()
      .background(c.background)
      .windowInsetsPadding(WindowInsets.statusBars)
      .verticalScroll(rememberScrollState())
      .padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.md, bottom = Spacing.xxxl),
  ) {
    Text(s["tools.title"], style = Type.displayMedium, color = c.text, modifier = Modifier.semantics { heading() })
    Text(s["tools.subtitle"], style = Type.body, color = c.textMuted, modifier = Modifier.padding(bottom = Spacing.lg))
    Card(padding = 0.dp) {
      Column(Modifier.padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
        TOOLS.forEachIndexed { index, tool ->
          if (index > 0) Divider()
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.md),
            modifier = Modifier
              .fillMaxWidth()
              .heightIn(min = 72.dp)
              .pressable(onClick = { navigator.push(tool.route) })
              .padding(vertical = Spacing.md),
          ) {
            IconBadge(tool.icon, c.primary, c.primarySoft, size = 44.dp, iconSize = 22.dp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
              Text(s["tools.${tool.key}.title"], style = Type.bodyStrong, color = c.text)
              Text(s["tools.${tool.key}.description"], style = Type.caption, color = c.textMuted)
            }
            Icon(if (theme.isRtl) Lucide.ChevronLeft else Lucide.ChevronRight, c.textMuted, 20.dp)
          }
        }
      }
    }
  }
}

/** The page for a tool route. */
@Composable
fun toolPage(route: Route) {
  val s = appTheme().strings
  val key = TOOLS.firstOrNull { it.route::class == route::class }?.key ?: return
  // Each tool is ported in its own pre-release; until then its page says so.
  PageScreen(title = s["tools.$key.title"], subtitle = s["tools.$key.description"]) {
    CenteredNote("Coming in the next 2.0.0 pre-release.", Modifier.padding(top = Spacing.xxl))
  }
}
