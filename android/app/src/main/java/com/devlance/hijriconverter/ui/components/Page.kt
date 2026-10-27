package com.devlance.hijriconverter.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.LocalNavigator
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.TOUCH_TARGET
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Scaffold for every page opened from the Tools tab: a back button (pointing the reading
 * direction's way), the page title and a scrolling body with the same padding as the tab pages.
 * Android's back button/gesture also goes back (AppRoot).
 */
@Composable
fun PageScreen(title: String, subtitle: String? = null, content: @Composable ColumnScope.() -> Unit) {
  val theme = appTheme()
  val c = theme.colors
  val navigator = LocalNavigator.current
  Column(
    Modifier
      .fillMaxSize()
      .background(c.background)
      .windowInsetsPadding(WindowInsets.statusBars),
  ) {
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(Spacing.md),
      modifier = Modifier.padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.sm, bottom = Spacing.md),
    ) {
      Box(
        Modifier
          .size(TOUCH_TARGET)
          .clip(CircleShape)
          .background(c.surfaceAlt)
          .pressable(onClick = navigator::back, label = theme.strings["common.back"]),
        contentAlignment = Alignment.Center,
      ) {
        Icon(if (theme.isRtl) Lucide.ArrowRight else Lucide.ArrowLeft, c.text, 22.dp)
      }
      Column(Modifier.weight(1f)) {
        Text(
          title,
          style = Type.title,
          color = c.text,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.semantics { heading() },
        )
        if (subtitle != null) {
          Text(subtitle, style = Type.caption, color = c.textMuted, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
      }
    }
    Column(
      Modifier
        .fillMaxWidth()
        .weight(1f)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = Spacing.lg),
    ) {
      content()
      Spacer(Modifier.height(Spacing.xxxl))
      Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
    }
  }
}

/** A brief confirmation ("Copied") — call [showToast] from anywhere; [ToastHost] draws it. */
private data class ToastMessage(val text: String, val id: Long)

private val toast = MutableStateFlow<ToastMessage?>(null)

fun showToast(text: String) {
  toast.value = ToastMessage(text, System.nanoTime())
}

private const val TOAST_VISIBLE_MS = 1800L

/** Mounted once at the app root, above everything. */
@Composable
fun BoxScope.ToastHost() {
  val message by toast.collectAsState()
  val c = appTheme().colors
  LaunchedEffect(message?.id) {
    if (message != null) {
      delay(TOAST_VISIBLE_MS)
      toast.value = null
    }
  }
  AnimatedVisibility(
    visible = message != null,
    enter = fadeIn(tween(220)) + slideInVertically(tween(220)) { it / 2 },
    exit = fadeOut(tween(180)) + slideOutVertically(tween(180)) { it / 2 },
    modifier = Modifier
      .align(Alignment.BottomCenter)
      .windowInsetsPadding(WindowInsets.safeDrawing)
      .padding(bottom = 88.dp),
  ) {
    val text = message?.text ?: ""
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
      modifier = Modifier
        .clip(RoundedCornerShape(Radius.pill))
        .background(c.text)
        .padding(horizontal = Spacing.lg, vertical = Spacing.md)
        .semantics { liveRegion = LiveRegionMode.Polite },
    ) {
      Icon(Lucide.CircleCheck, c.background, 18.dp)
      Text(text, style = Type.bodyStrong, color = c.background)
    }
  }
}
