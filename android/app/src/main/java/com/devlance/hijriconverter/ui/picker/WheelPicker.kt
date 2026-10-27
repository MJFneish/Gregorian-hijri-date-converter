package com.devlance.hijriconverter.ui.picker

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.SnapPosition
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

val WHEEL_ITEM_HEIGHT = 44.dp
private const val VISIBLE_ROWS = 5
private const val PAD_ROWS = VISIBLE_ROWS / 2

/**
 * iOS-style scroll wheel. Native date pickers can't show Hijri months, so the converter uses three
 * of these per calendar. Two blank rows above and below let the first and last items reach the
 * centre band; a fling snaps to a row and the value is reported once the wheel stops. A static
 * selection band and fades replace per-row animation; the rows only change emphasis. Adjustable
 * for screen readers (swipe up/down changes the value).
 */
@Composable
fun WheelPicker(
  items: List<String>,
  selectedIndex: Int,
  onChange: (Int) -> Unit,
  label: String,
  fadeColor: Color,
  modifier: Modifier = Modifier,
) {
  val theme = appTheme()
  val c = theme.colors
  val maxIndex = items.size - 1
  val state = rememberLazyListState(initialFirstVisibleItemIndex = selectedIndex.coerceIn(0, maxIndex))
  val fling = rememberSnapFlingBehavior(state, SnapPosition.Center)
  val scope = rememberCoroutineScope()
  val itemPx = with(LocalDensity.current) { WHEEL_ITEM_HEIGHT.toPx() }
  val currentOnChange by rememberUpdatedState(onChange)
  val currentSelected by rememberUpdatedState(selectedIndex)

  // The row in the centre band while scrolling: the top visible row (+1 past half a row).
  val center by remember(maxIndex) {
    derivedStateOf {
      val i = state.firstVisibleItemIndex + if (state.firstVisibleItemScrollOffset > itemPx / 2) 1 else 0
      i.coerceIn(0, maxIndex)
    }
  }

  // Report the value once the wheel comes to rest.
  LaunchedEffect(state, maxIndex) {
    snapshotFlow { state.isScrollInProgress }
      .distinctUntilChanged()
      .filter { !it }
      .collect {
        val i = center
        if (i != currentSelected) currentOnChange(i)
      }
  }

  // Follow changes made from outside (the Today button, a day clamped by a shorter month …).
  LaunchedEffect(selectedIndex, maxIndex) {
    val target = selectedIndex.coerceIn(0, maxIndex)
    if (!state.isScrollInProgress && center != target) state.animateScrollToItem(target)
  }

  Box(
    modifier
      .height(WHEEL_ITEM_HEIGHT * VISIBLE_ROWS)
      .semantics(mergeDescendants = true) {
        contentDescription = label
        stateDescription = items.getOrElse(selectedIndex) { "" }
        progressBarRangeInfo = ProgressBarRangeInfo(selectedIndex.toFloat(), 0f..maxIndex.toFloat(), (maxIndex - 1).coerceAtLeast(0))
        setProgress { target ->
          val i = target.roundToInt().coerceIn(0, maxIndex)
          scope.launch { state.animateScrollToItem(i) }
          currentOnChange(i)
          true
        }
      },
  ) {
    // The selection band behind the centre row.
    Box(
      Modifier
        .padding(top = WHEEL_ITEM_HEIGHT * PAD_ROWS)
        .padding(horizontal = 2.dp)
        .fillMaxWidth()
        .height(WHEEL_ITEM_HEIGHT)
        .clip(RoundedCornerShape(Radius.md))
        .background(c.primarySoft),
    )
    LazyColumn(
      state = state,
      flingBehavior = fling,
      modifier = Modifier
        .fillMaxWidth()
        .height(WHEEL_ITEM_HEIGHT * VISIBLE_ROWS)
        .drawWithContent {
          drawContent()
          // Fades into the background at the top and bottom two rows.
          val pad = itemPx * PAD_ROWS
          drawRect(Brush.verticalGradient(listOf(fadeColor.copy(alpha = 0.95f), fadeColor.copy(alpha = 0f)), 0f, pad), size = Size(size.width, pad))
          drawRect(
            Brush.verticalGradient(listOf(fadeColor.copy(alpha = 0f), fadeColor.copy(alpha = 0.95f)), size.height - pad, size.height),
            topLeft = Offset(0f, size.height - pad),
            size = Size(size.width, pad),
          )
        },
    ) {
      items(PAD_ROWS) { Box(Modifier.height(WHEEL_ITEM_HEIGHT)) }
      items(items.size) { index ->
        val emphasis = minOf(abs(index - center), 2)
        Box(
          Modifier
            .fillMaxWidth()
            .height(WHEEL_ITEM_HEIGHT)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
              scope.launch { state.animateScrollToItem(index) }
            }
            .padding(horizontal = 6.dp),
          contentAlignment = Alignment.Center,
        ) {
          BasicText(
            items[index],
            maxLines = 1,
            autoSize = TextAutoSize.StepBased(minFontSize = 11.sp, maxFontSize = if (emphasis == 0) 18.sp else 16.sp, stepSize = 0.5.sp),
            style = (if (emphasis == 0) Type.body.copy(fontWeight = FontWeight.Bold) else Type.body).copy(
              color = if (emphasis == 0) c.text else c.textMuted.copy(alpha = if (emphasis == 1) 0.85f else 0.55f),
              textAlign = TextAlign.Center,
              lineHeight = 22.sp,
            ),
            modifier = Modifier.fillMaxWidth(),
          )
        }
      }
      items(PAD_ROWS) { Box(Modifier.height(WHEEL_ITEM_HEIGHT)) }
    }
  }
}

