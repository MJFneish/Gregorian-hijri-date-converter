package com.devlance.hijriconverter.ui.onboarding

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.heroGradient
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.launch

private val SLIDES = listOf("welcome", "convert", "methods", "occasions")

/**
 * First-run introduction (4 slides with original animated artwork). Also reachable from Settings
 * → "Show introduction again", in which case finishing just goes back (`onFinish`). The pager
 * mirrors in Arabic with the layout direction, so the next slide comes from the left.
 */
@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val pager = rememberPagerState(pageCount = { SLIDES.size })
  val scope = rememberCoroutineScope()
  val index = pager.currentPage
  val isLast = index == SLIDES.lastIndex
  val otherLanguage = if (theme.lang == Lang.AR) Lang.EN else Lang.AR

  val finish = {
    AppStore.updateSettings { it.copy(onboardingDone = true) }
    onFinish()
  }

  Column(
    Modifier
      .fillMaxSize()
      .background(c.background)
      .windowInsetsPadding(WindowInsets.safeDrawing),
  ) {
    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .fillMaxWidth()
        .heightIn(min = 56.dp)
        .padding(horizontal = Spacing.xl, vertical = Spacing.sm),
    ) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        modifier = Modifier
          .clip(RoundedCornerShape(Radius.pill))
          .background(c.surfaceAlt)
          .pressDim(onClick = { AppStore.updateSettings { it.copy(language = otherLanguage) } })
          .semantics { contentDescription = s["onboarding.switchLanguage"] }
          .heightIn(min = 40.dp)
          .padding(horizontal = Spacing.md),
      ) {
        Icon(Lucide.Languages, c.primary, 16.dp)
        Text(if (otherLanguage == Lang.AR) "العربية" else "English", style = Type.bodyStrong, color = c.primary)
      }
      Box(Modifier.weight(1f))
      if (!isLast) {
        Box(
          Modifier
            .heightIn(min = 44.dp)
            .pressDim(onClick = finish)
            .padding(horizontal = Spacing.sm),
          contentAlignment = Alignment.Center,
        ) { Text(s["onboarding.skip"], style = Type.bodyStrong, color = c.textMuted) }
      }
    }

    BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
      val width = maxWidth
      val artSize = minOf(width - Spacing.xl * 2, 340.dp, maxHeight * 0.42f)
      HorizontalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
        val key = SLIDES[page]
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxSize().padding(top = Spacing.sm)) {
          Box(
            Modifier
              // v1's `flex: 1, maxHeight: 420`: as tall as the slide allows up to 420 dp, with the
              // text right under it and any spare room below the text.
              .weight(1f, fill = false)
              .heightIn(max = 420.dp)
              .fillMaxHeight()
              .fillMaxWidth()
              .padding(horizontal = Spacing.xl)
              .clip(RoundedCornerShape(Radius.xl))
              .heroGradient(c.heroFrom, c.heroTo),
            contentAlignment = Alignment.Center,
          ) {
            when (key) {
              "welcome" -> WelcomeArt(artSize)
              "convert" -> ConvertArt(artSize, theme.lang)
              // A landscape whose hills must run to the panel's bottom and side edges: drawn at
              // the panel's full width and anchored to its bottom.
              "methods" -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) { MethodsArt(width - Spacing.xl * 2) }
              else -> OccasionsArt(artSize)
            }
          }
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
              .widthIn(max = 520.dp)
              .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xl, bottom = Spacing.lg),
          ) {
            Text(
              s["onboarding.$key.title"],
              style = Type.displayMedium,
              color = c.text,
              textAlign = TextAlign.Center,
              modifier = Modifier.semantics { heading() },
            )
            Text(
              s["onboarding.$key.body"],
              style = Type.body,
              color = c.textMuted,
              textAlign = TextAlign.Center,
              modifier = Modifier.padding(top = Spacing.md),
            )
          }
        }
      }
    }

    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .fillMaxWidth()
        .padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.lg, top = Spacing.sm),
    ) {
      Row(
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.semantics(mergeDescendants = true) {
          contentDescription = s.t("onboarding.progress", "current" to index + 1, "total" to SLIDES.size)
        },
      ) {
        SLIDES.indices.forEach { i -> Dot(active = i == index) }
      }
      Box(Modifier.weight(1f))
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        modifier = Modifier
          .pressable(onClick = {
            if (isLast) finish() else scope.launch { pager.animateScrollToPage(index + 1) }
          })
          .clip(RoundedCornerShape(Radius.pill))
          .background(c.primary)
          .heightIn(min = 52.dp)
          .padding(horizontal = Spacing.xl),
      ) {
        Text(s[if (isLast) "onboarding.getStarted" else "onboarding.next"], style = Type.bodyStrong, color = c.onPrimary)
        Icon(if (isLast) Lucide.Check else if (theme.isRtl) Lucide.ArrowLeft else Lucide.ArrowRight, c.onPrimary, 18.dp)
      }
    }
  }
}

@Composable
private fun Dot(active: Boolean) {
  val c = appTheme().colors
  val width by animateDpAsState(if (active) 24.dp else 8.dp, tween(220), label = "dot")
  val alpha by animateFloatAsState(if (active) 1f else 0.35f, tween(220), label = "dotAlpha")
  Box(
    Modifier
      .graphicsLayer { this.alpha = alpha }
      .size(width, 8.dp)
      .clip(RoundedCornerShape(4.dp))
      .background(c.primary),
  )
}
