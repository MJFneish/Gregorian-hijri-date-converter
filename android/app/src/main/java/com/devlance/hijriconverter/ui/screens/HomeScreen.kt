package com.devlance.hijriconverter.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.LocalNavigator
import com.devlance.hijriconverter.ui.TabIndex
import com.devlance.hijriconverter.ui.home.ConverterSection
import com.devlance.hijriconverter.ui.home.TodayCard
import com.devlance.hijriconverter.ui.reducedMotion
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Breathing room left above a section we scroll to. */
private val SCROLL_TOP_MARGIN = Spacing.md

/**
 * Home = the Today card and the converter, nothing else (user request, 2026-10-26: no app name/icon
 * header, and every other feature lives on its own page under the Tools tab).
 */
@Composable
fun HomeScreen() {
  val theme = appTheme()
  val navigator = LocalNavigator.current
  val scroll = rememberScrollState()
  val scope = rememberCoroutineScope()
  val marginPx = with(LocalDensity.current) { SCROLL_TOP_MARGIN.toPx() }
  // Every section lives inside this one column, so a section's offset in it is exactly the scroll
  // position that brings the section to the top.
  var content by remember { mutableStateOf<LayoutCoordinates?>(null) }
  val scrollTo = { target: LayoutCoordinates ->
    content?.let { parent ->
      val y = parent.localPositionOf(target, Offset.Zero).y
      scope.launch { scroll.animateScrollTo((y - marginPx).toInt().coerceAtLeast(0)) }
    }
    Unit
  }

  Column(
    Modifier
      .fillMaxSize()
      .background(theme.colors.background)
      .windowInsetsPadding(WindowInsets.statusBars)
      .verticalScroll(scroll)
      .onGloballyPositioned { content = it }
      .padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.md, bottom = Spacing.xxxl),
  ) {
    Column(Modifier.enterFromBelow(0)) { TodayCard(onPressMethod = { navigator.goToTab(TabIndex.SETTINGS) }) }
    Column(Modifier.enterFromBelow(80)) { ConverterSection(scrollTo) }
  }
}

/** v1's FadeInDown: fades in while rising 24 dp, once, unless the phone's animations are off. */
@Composable
private fun Modifier.enterFromBelow(delayMs: Long): Modifier {
  val reduced = reducedMotion()
  val progress = remember { Animatable(if (reduced) 1f else 0f) }
  val rise = with(LocalDensity.current) { 24.dp.toPx() }
  LaunchedEffect(Unit) {
    delay(delayMs)
    progress.animateTo(1f, tween(420))
  }
  return graphicsLayer {
    alpha = progress.value
    translationY = (1 - progress.value) * rise
  }
}
