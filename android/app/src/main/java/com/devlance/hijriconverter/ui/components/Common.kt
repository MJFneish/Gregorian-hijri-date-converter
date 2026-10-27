package com.devlance.hijriconverter.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.core.Occasion
import com.devlance.hijriconverter.core.OccasionKind
import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

/** Rounded card: a soft shadow in light mode, a hairline border in dark mode (v1's Card). */
@Composable
fun Card(
  modifier: Modifier = Modifier,
  padding: Dp = Spacing.lg,
  shape: RoundedCornerShape = RoundedCornerShape(Radius.lg),
  content: @Composable ColumnScope.() -> Unit,
) {
  val theme = appTheme()
  val c = theme.colors
  Column(
    modifier
      .fillMaxWidth()
      .then(if (theme.isDark) Modifier else Modifier.shadow(2.dp, shape, ambientColor = c.cardShadow, spotColor = c.cardShadow))
      .clip(shape)
      .background(c.card)
      .then(if (theme.isDark) Modifier.border(1.dp, c.border, shape) else Modifier)
      .padding(padding),
    content = content,
  )
}

/** Uppercase section label (Latin only — Arabic has no case, and letter spacing would break its
 * joining), the shape of prayer-times-lb's Settings section labels. */
@Composable
fun SectionLabel(text: String, first: Boolean = false, modifier: Modifier = Modifier) {
  val theme = appTheme()
  Text(
    if (theme.isRtl) text else text.uppercase(),
    style = if (theme.isRtl) Type.label.copy(letterSpacing = 0.sp) else Type.label,
    color = theme.colors.textMuted,
    modifier = modifier
      .fillMaxWidth()
      .padding(top = if (first) Spacing.lg else Spacing.xl, bottom = Spacing.sm)
      .semantics { heading() },
  )
}

/**
 * v1's PressableScale: presses scale the control to 96 %, a disabled one fades to 45 % (unless
 * `dimWhenDisabled` is false — busy buttons that already show a spinner).
 */
@Composable
fun Modifier.pressable(
  onClick: () -> Unit,
  enabled: Boolean = true,
  dimWhenDisabled: Boolean = true,
  role: Role? = Role.Button,
  label: String? = null,
): Modifier {
  val interaction = remember { MutableInteractionSource() }
  val pressed by interaction.collectIsPressedAsState()
  val scale by animateFloatAsState(if (pressed) 0.96f else 1f, tween(if (pressed) 90 else 140), label = "press")
  return this
    .graphicsLayer {
      scaleX = scale
      scaleY = scale
      alpha = if (!enabled && dimWhenDisabled) 0.45f else 1f
    }
    .clickable(interactionSource = interaction, indication = null, enabled = enabled, role = role, onClick = onClick)
    .then(if (label != null) Modifier.semantics { contentDescription = label } else Modifier)
}

/** Plain press feedback: dims while pressed (rows, links). */
@Composable
fun Modifier.pressDim(onClick: () -> Unit, role: Role? = Role.Button, enabled: Boolean = true): Modifier {
  val interaction = remember { MutableInteractionSource() }
  val pressed by interaction.collectIsPressedAsState()
  return this
    .graphicsLayer { alpha = if (pressed) 0.6f else 1f }
    .clickable(interactionSource = interaction, indication = null, enabled = enabled, role = role, onClick = onClick)
}

data class SegmentOption<T>(val value: T, val label: String, val icon: Lucide? = null)

/** Pill segmented control with a sliding selection indicator (v1's SegmentedControl). Mirrors in
 * Arabic through the layout direction. */
@Composable
fun <T> SegmentedControl(options: List<SegmentOption<T>>, value: T, onChange: (T) -> Unit, modifier: Modifier = Modifier) {
  val c = appTheme().colors
  val selected = options.indexOfFirst { it.value == value }.coerceAtLeast(0)
  BoxWithConstraints(
    modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(Radius.pill))
      .background(c.surfaceAlt)
      .padding(4.dp),
  ) {
    val segment = maxWidth / options.size
    val offset by animateDpAsState(segment * selected, tween(220), label = "segment")
    Box(
      Modifier
        .offset(x = offset)
        .width(segment)
        .heightIn(min = 44.dp)
        .clip(RoundedCornerShape(Radius.pill))
        .background(c.primary),
    )
    Row(Modifier.fillMaxWidth().selectableGroup()) {
      options.forEachIndexed { index, option ->
        val active = index == selected
        val color = if (active) c.onPrimary else c.text
        Row(
          horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.CenterHorizontally),
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .weight(1f)
            .heightIn(min = 44.dp)
            .selectable(selected = active, role = Role.RadioButton, interactionSource = null, indication = null) { onChange(option.value) }
            .padding(horizontal = Spacing.sm),
        ) {
          option.icon?.let { Icon(it, color, 16.dp) }
          Text(option.label, style = Type.bodyStrong.copy(fontSize = 15.sp), color = color, maxLines = 1)
        }
      }
    }
  }
}

/** A tinted square with an icon, beside a settings/list row's text. */
@Composable
fun IconBadge(icon: Lucide, tint: Color, background: Color, size: Dp = 40.dp, iconSize: Dp = 20.dp) {
  Box(
    Modifier
      .size(size)
      .clip(RoundedCornerShape(Radius.md))
      .background(background),
    contentAlignment = Alignment.Center,
  ) { Icon(icon, tint, iconSize) }
}

/** "Official" / "Calculated" / "Approximate" chip under a converted Hijri date. Text + icon, not
 * colour alone, carries the meaning. */
@Composable
fun SourceBadge(source: DateSource, onDark: Boolean = false, modifier: Modifier = Modifier) {
  val theme = appTheme()
  val c = theme.colors
  val icon = when (source) {
    DateSource.Official -> Lucide.BadgeCheck
    DateSource.Calculated -> Lucide.Calculator
    DateSource.Approximate -> Lucide.CircleDashed
  }
  val fg = if (onDark) c.onHero else if (source == DateSource.Approximate) c.accent else c.primary
  val bg = if (onDark) Color.White.copy(alpha = 0.14f) else if (source == DateSource.Approximate) c.accentSoft else c.primarySoft
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
    verticalAlignment = Alignment.CenterVertically,
    modifier = modifier
      .clip(RoundedCornerShape(Radius.pill))
      .background(bg)
      .padding(horizontal = Spacing.sm + 2.dp, vertical = 4.dp),
  ) {
    Icon(icon, fg, 14.dp)
    Text(theme.strings["source.${source.key}"], style = Type.caption, color = fg)
  }
}

/** Icon and colours of an occasion kind — the same everywhere it appears. */
data class KindStyle(val icon: Lucide, val fg: Color, val bg: Color)

@Composable
fun kindStyle(kind: OccasionKind): KindStyle {
  val c = appTheme().colors
  return when (kind) {
    OccasionKind.Mourning -> KindStyle(Lucide.HeartCrack, c.mourning, c.mourningSoft)
    OccasionKind.Celebration -> KindStyle(Lucide.Flower2, c.celebration, c.celebrationSoft)
    OccasionKind.Other -> KindStyle(Lucide.Star, c.primary, c.primarySoft)
  }
}

@Composable
fun OccasionBadge(occasion: Occasion, onDark: Boolean = false, modifier: Modifier = Modifier) {
  val theme = appTheme()
  val style = kindStyle(occasion.kind)
  val fg = if (onDark) theme.colors.heroGold else style.fg
  val bg = if (onDark) Color(242, 196, 104).copy(alpha = 0.16f) else style.bg
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    verticalAlignment = Alignment.CenterVertically,
    modifier = modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(Radius.md))
      .background(bg)
      .padding(horizontal = Spacing.md, vertical = Spacing.sm + 2.dp),
  ) {
    Icon(style.icon, fg, 16.dp)
    Text(occasion.name(theme.lang), style = Type.bodyStrong.copy(fontSize = 15.sp), color = fg, modifier = Modifier.weight(1f))
  }
}

/** A small rounded tag ("Default", "Sunni", countdowns). */
@Composable
fun Tag(text: String, color: Color, background: Color, modifier: Modifier = Modifier, style: TextStyle = Type.caption) {
  Text(
    text,
    style = style,
    color = color,
    modifier = modifier
      .clip(RoundedCornerShape(Radius.pill))
      .background(background)
      .padding(horizontal = Spacing.sm + 2.dp, vertical = 3.dp),
  )
}

/** Hairline between list rows. */
@Composable
fun Divider(color: Color = appTheme().colors.border, modifier: Modifier = Modifier) {
  Box(
    modifier
      .fillMaxWidth()
      .padding(0.dp)
      .drawBehind { drawLine(color, Offset(0f, 0f), Offset(size.width, 0f), strokeWidth = 1f) }
      .size(0.5.dp),
  )
}

/**
 * The diagonal hero gradient (v1's GradientFill): top-left → bottom-right like the SVG it
 * replaces, plus decorative stars at [x fraction, y fraction, radius dp, opacity]. Drawn in absolute
 * coordinates, so it doesn't mirror in Arabic (v1's didn't either).
 */
fun Modifier.heroGradient(from: Color, to: Color, stars: List<Star> = emptyList()): Modifier = drawBehind {
  drawRect(Brush.linearGradient(listOf(from, to), start = Offset.Zero, end = Offset(size.width, size.height)))
  for (star in stars) {
    drawCircle(Color.White.copy(alpha = star.opacity), radius = star.radius * density, center = Offset(star.x * size.width, star.y * size.height))
  }
}

data class Star(val x: Float, val y: Float, val radius: Float, val opacity: Float)

@Composable
fun CenteredNote(text: String, modifier: Modifier = Modifier) {
  val theme = appTheme()
  Box(modifier.fillMaxWidth().fillMaxHeight(), contentAlignment = Alignment.Center) {
    Text(text, style = Type.body, color = theme.colors.textMuted, textAlign = TextAlign.Center, modifier = Modifier.padding(Spacing.xl))
  }
}

/**
 * v1's negative margins: the content keeps its full size and draws over its neighbours, but takes
 * `horizontal`/`vertical` less room on each side (a moon's glow spilling into the padding, the
 * converter's arrow bubble overlapping the cards above and below).
 */
fun Modifier.negativeMargin(horizontal: Dp = 0.dp, vertical: Dp = 0.dp): Modifier = layout { measurable, constraints ->
  val h = horizontal.roundToPx()
  val v = vertical.roundToPx()
  val placeable = measurable.measure(constraints.offset(2 * h, 2 * v))
  layout((placeable.width - 2 * h).coerceAtLeast(0), (placeable.height - 2 * v).coerceAtLeast(0)) {
    placeable.place(-h, -v)
  }
}
