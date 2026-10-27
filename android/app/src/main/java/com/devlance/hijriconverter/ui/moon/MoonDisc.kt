package com.devlance.hijriconverter.ui.moon

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.R
import com.devlance.hijriconverter.core.MoonPhase
import com.devlance.hijriconverter.core.toFixed
import com.devlance.hijriconverter.ui.theme.Brand
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.roundToInt

/** Default diameter = the texture's @1x size (96 px, yarn generate:moon), so every density draws
 * it pixel for pixel. */
val MOON_SIZE = 96.dp

/** Night-side tint. At the night side's 90 % (last shading entry) a trace of the texture survives,
 * like earthshine. */
private val NIGHT_COLOR = Color(0xFF0A0822)

/**
 * How the light fades into the night side: [degrees from the terminator toward the sunlit side
 * (negative = into the night side), darkness reached past that line]. Each step is one translucent
 * shadow whose terminator is moved by that angle; stacked, they dim the lit side toward the
 * terminator the way the low sun there does on the real Moon, instead of a cut-out edge. The last
 * entry is the night side.
 */
private val TERMINATOR_SHADING = listOf(
  30.0 to 0.03, 22.0 to 0.07, 16.0 to 0.12, 11.0 to 0.19, 7.5 to 0.27, 5.0 to 0.36,
  3.0 to 0.46, 1.5 to 0.57, 0.0 to 0.7, -1.5 to 0.82, -3.0 to 0.9,
)

/** Per-layer opacity so the stack reaches each darkness: 1 - (1 - d) / (1 - d_previous). */
private val SHADE_LAYERS = TERMINATOR_SHADING.mapIndexed { i, (offset, darkness) ->
  offset to (1 - (1 - darkness) / (1 - if (i == 0) 0.0 else TERMINATOR_SHADING[i - 1].second)).toFloat()
}

/** Shadows overhang the limb by about a device pixel so they cover the texture's anti-aliased edge
 * (otherwise the night side shows a bright rim). Kept tiny: the overhang darkens the sky. */
private const val LIMB_OVERHANG = 0.35

/** Space kept around the disc for the glow (each side). A negative padding of this much lines the
 * disc itself up with neighbouring text. */
fun moonGlowMargin(size: Dp): Dp = (size.value * 0.1f).roundToInt().dp

private const val DEG = Math.PI / 180

private fun f(n: Double) = toFixed(n, 2)

/**
 * Night side of a disc centred at (c, c) with radius r (dp), for a terminator `lit` degrees from new
 * (0 = all dark, 180 = all lit). The terminator is a half-ellipse through both poles whose
 * horizontal semi-axis is r·|cos lit|; waxing moons are lit on the right. Null when fully lit.
 */
private fun nightPath(c: Double, r: Double, lit: Double, waxing: Boolean): String? {
  if (lit >= 180) return null
  val cos = cos(lit * DEG)
  val rx = max(abs(cos) * r, 0.01)
  // Top → bottom along the terminator: clockwise when it bulges to the right of centre.
  val terminatorSweep = if ((if (waxing) cos else -cos) > 0) 1 else 0
  val outer = r + LIMB_OVERHANG
  // Bottom → top around the dark limb: the left one (clockwise) when waxing.
  val limbSweep = if (waxing) 1 else 0
  return "M${f(c)} ${f(c - r)} A${f(rx)} ${f(r)} 0 0 $terminatorSweep ${f(c)} ${f(c + r)} " +
    "L${f(c)} ${f(c + outer)} A${f(outer)} ${f(outer)} 0 0 $limbSweep ${f(c)} ${f(c - outer)} Z"
}

/**
 * The Moon as it looks on a given day — a real full-moon photo with the night side shaded at the
 * exact phase, so consecutive days always differ (not one of 8 phase icons). North up, waxing lit on
 * the right, as usually shown from the northern hemisphere. The soft glow scales with brightness,
 * so it's only noticeable near full. Meant for a dark (night-sky) background; decorative for screen
 * readers — callers describe the phase in text. The view is `size` plus the glow margin each side.
 */
@Composable
fun MoonDisc(phase: MoonPhase, size: Dp = MOON_SIZE, modifier: Modifier = Modifier) {
  val texture: ImageBitmap = ImageBitmap.imageResource(R.drawable.moon_texture)
  val margin = moonGlowMargin(size)
  val box = size + margin * 2
  val c = box.value / 2.0
  val r = size.value / 2.0
  val lit = if (phase.waxing) phase.elongation else 360 - phase.elongation
  val glow = (0.26 * phase.illumination * phase.illumination).toFloat()
  val shadows: List<Pair<Path, Float>> = remember(phase, size) {
    SHADE_LAYERS.mapNotNull { (offset, opacity) ->
      nightPath(c, r, (lit - offset).coerceIn(0.0, 180.0), phase.waxing)?.let { PathParser().parsePathString(it).toPath() to opacity }
    }
  }
  Canvas(modifier.size(box)) {
    val center = Offset(this.size.width / 2, this.size.height / 2)
    val radiusPx = this.size.width / 2
    val discPx = size.toPx()
    // Glow: solid from the centre to the limb, fading out to the edge of the box.
    drawCircle(
      Brush.radialGradient(
        0f to Brand.moonlight.copy(alpha = glow),
        (r / c).toFloat() to Brand.moonlight.copy(alpha = glow),
        1f to Brand.moonlight.copy(alpha = 0f),
        center = center,
        radius = radiusPx,
      ),
      radius = radiusPx,
      center = center,
    )
    val marginPx = margin.toPx()
    drawImage(
      texture,
      dstOffset = IntOffset(marginPx.roundToInt(), marginPx.roundToInt()),
      dstSize = IntSize(discPx.roundToInt(), discPx.roundToInt()),
      filterQuality = FilterQuality.High,
    )
    // The shadow paths are in dp; draw them scaled to pixels.
    scale(density, pivot = Offset.Zero) {
      for ((path, opacity) in shadows) drawPath(path, NIGHT_COLOR, alpha = opacity)
    }
  }
}
