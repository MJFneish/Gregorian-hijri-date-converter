package com.devlance.hijriconverter.ui

import android.graphics.Color
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.components.Divider
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.ToastHost
import com.devlance.hijriconverter.ui.onboarding.OnboardingScreen
import com.devlance.hijriconverter.ui.screens.HomeScreen
import com.devlance.hijriconverter.ui.share.ShareHost
import com.devlance.hijriconverter.ui.screens.SettingsScreen
import com.devlance.hijriconverter.ui.screens.ToolsScreen
import com.devlance.hijriconverter.ui.screens.toolPage
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Pages opened over the tabs. */
sealed interface Route {
  /** `replay` = opened again from Settings: finishing goes back instead of to the converter. */
  data class Onboarding(val replay: Boolean) : Route
  /** `jdn` = the day to compare (from the converter's result); null = today. */
  data class CompareOffices(val jdn: Int? = null) : Route
  data object Occasions : Route
  data object Birthday : Route
  data object Fasting : Route
  data object Crescent : Route
  data object DaysBetween : Route
}

/** Logical tab indices — the order of TABS. */
object TabIndex {
  const val HOME = 0
  const val TOOLS = 1
  const val SETTINGS = 2
}

/** How screens move around: switch tab, open a page over the tabs, go back. */
class Navigator(
  private val pager: PagerState,
  private val stack: SnapshotStateList<Route>,
  private val scope: CoroutineScope,
) {
  fun goToTab(index: Int) {
    scope.launch { pager.animateScrollToPage(index) }
  }

  fun push(route: Route) {
    stack.add(route)
  }

  fun back() {
    if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex)
  }
}

val LocalNavigator = compositionLocalOf<Navigator> { error("no navigator") }

private data class Tab(val icon: Lucide, val labelKey: String)

private val TABS = listOf(
  Tab(Lucide.CalendarRange, "tabs.home"),
  Tab(Lucide.LayoutGrid, "tabs.tools"),
  Tab(Lucide.Settings2, "tabs.settings"),
)

/** The loading screen stays up at least this long even when startup is instant — a flash reads as
 * a glitch, not as speed (v1's MIN_LOADING_VISIBLE_MS). */
private const val MIN_LOADING_VISIBLE_MS = 1200L

/**
 * The app: the loading screen over everything at launch, the first-run introduction until it's
 * done, then three tabs (Converter · Tools · Settings) with tool pages opened over them. The tabs
 * stay composed under an open page, so the converter keeps its state.
 */
@Composable
fun AppRoot() {
  val theme = appTheme()
  val settings = useSettings()
  var loading by remember { mutableStateOf(true) }
  LaunchedEffect(Unit) {
    delay(MIN_LOADING_VISIBLE_MS)
    loading = false
  }

  val pager = rememberPagerState(pageCount = { TABS.size })
  val scope = rememberCoroutineScope()
  val stack = remember { mutableStateListOf<Route>() }
  val navigator = remember(pager) { Navigator(pager, stack, scope) }
  // Pushes since launch, to tell an opening page's animation from a closing one.
  var depth by remember { mutableIntStateOf(0) }

  // Status/navigation bar icons: light on the loading screen's night and in the dark theme.
  val activity = LocalActivity.current as? ComponentActivity
  val lightIcons = loading || theme.isDark
  LaunchedEffect(lightIcons) {
    val style = if (lightIcons) SystemBarStyle.dark(Color.TRANSPARENT) else SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
    activity?.enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
  }

  BackHandler(enabled = stack.isNotEmpty()) { navigator.back() }
  BackHandler(enabled = stack.isEmpty() && settings.onboardingDone && pager.currentPage != TabIndex.HOME) {
    navigator.goToTab(TabIndex.HOME)
  }

  CompositionLocalProvider(LocalNavigator provides navigator) {
    ShareHost {
      Box(Modifier.fillMaxSize().background(theme.colors.background)) {
        if (!settings.onboardingDone) {
          OnboardingScreen(onFinish = {})
        } else {
          val top = stack.lastOrNull()
          Box(Modifier.fillMaxSize().then(if (top != null) Modifier.clearAndSetSemantics {} else Modifier)) {
            Tabs(pager)
          }
          AnimatedContent(
            targetState = top,
            transitionSpec = {
              val opening = stack.size >= depth
              val replayIntro = (if (opening) targetState else initialState) is Route.Onboarding
              if (replayIntro) {
                // The introduction slides up from the bottom, as in v1.
                (slideInVertically(tween(300)) { if (opening) it else 0 } + fadeIn(tween(200))) togetherWith
                  (slideOutVertically(tween(300)) { if (opening) 0 else it } + fadeOut(tween(200)))
              } else {
                // Tool pages come in from the reading direction's end (right in English, left in Arabic).
                val sign = if (theme.isRtl) -1 else 1
                (slideInHorizontally(tween(280)) { w -> if (opening) sign * w else -sign * w / 4 } + fadeIn(tween(200))) togetherWith
                  (slideOutHorizontally(tween(280)) { w -> if (opening) -sign * w / 4 else sign * w } + fadeOut(tween(200)))
              }
            },
            label = "route",
            modifier = Modifier.fillMaxSize(),
          ) { route ->
            if (route != null) {
              // Pages are opaque and take every touch, so nothing reaches the tabs underneath.
              Box(
                Modifier
                  .fillMaxSize()
                  .background(theme.colors.background)
                  .pointerInput(Unit) { detectTapGestures { } },
              ) {
                when (route) {
                  is Route.Onboarding -> OnboardingScreen(onFinish = navigator::back)
                  else -> toolPage(route)
                }
              }
            }
          }
          LaunchedEffect(stack.size) { depth = stack.size }
        }

        ToastHost()

        AnimatedVisibility(visible = loading, enter = fadeIn(tween(0)), exit = fadeOut(tween(380))) {
          LoadingScreen()
        }
      }
    }
  }
}

/**
 * WhatsApp-style bottom tabs: the three screens side by side in a pager that follows the finger
 * and snaps to the nearest page (a fast fling goes to the neighbour). In Arabic the pages and the
 * tab bar mirror together (first tab on the right) — v1's lesson from lexitoon: mirroring only one
 * of them feels inconsistent. Vertical drags (scrolling, the date wheels) never start a tab swipe.
 */
@Composable
private fun Tabs(pager: PagerState) {
  val theme = appTheme()
  val c = theme.colors
  val navigator = LocalNavigator.current
  Column(Modifier.fillMaxSize()) {
    HorizontalPager(state = pager, modifier = Modifier.weight(1f), beyondViewportPageCount = 2, key = { it }) { page ->
      when (page) {
        TabIndex.HOME -> HomeScreen()
        TabIndex.TOOLS -> ToolsScreen()
        else -> SettingsScreen()
      }
    }
    Divider(c.border)
    Row(
      Modifier
        .fillMaxWidth()
        .background(c.surface)
        .windowInsetsPadding(WindowInsets.navigationBars)
        .selectableGroup(),
    ) {
      TABS.forEachIndexed { index, tab ->
        val active = pager.currentPage == index
        val color = if (active) c.primary else c.textMuted
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
          modifier = Modifier
            .weight(1f)
            .heightIn(min = 56.dp)
            .selectable(selected = active, role = Role.Tab, interactionSource = null, indication = null) { navigator.goToTab(index) }
            .padding(top = Spacing.sm, bottom = Spacing.xs),
        ) {
          // The highlight pill is always there; only its opacity changes.
          Box(contentAlignment = Alignment.Center) {
            Box(
              Modifier
                .matchParentSize()
                .graphicsLayer { alpha = if (active) 1f else 0f }
                .clip(RoundedCornerShape(15.dp))
                .background(c.primarySoft),
            )
            Box(Modifier.padding(horizontal = Spacing.lg, vertical = Spacing.xs)) {
              Icon(tab.icon, color, 22.dp, strokeWidth = if (active) 2.4f else 2f)
            }
          }
          Text(
            theme.strings[tab.labelKey],
            style = Type.caption.copy(fontWeight = if (active) FontWeight.Bold else FontWeight.Medium),
            color = color,
          )
        }
      }
    }
  }
}
