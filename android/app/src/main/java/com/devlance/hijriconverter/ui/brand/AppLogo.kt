package com.devlance.hijriconverter.ui.brand

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import com.devlance.hijriconverter.core.toFixed
import com.devlance.hijriconverter.ui.theme.Brand
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * The app's emblem: a gold crescent (the lunar Hijri calendar) holding a small sun (the solar
 * Gregorian calendar), circled by two arrows (conversion). Original artwork. The same geometry is
 * written to assets/brand/ *.svg by scripts/generate-icons.js for the launcher icon and the splash
 * — keep the two in sync if either changes. Coordinates are on a 100×100 grid.
 */
object Emblem {
  /** Crescent = circle C1 (50,50 r30) minus circle C2 (62,42 r25); intersection points precomputed. */
  const val CRESCENT_PATH = "M50.13 20 A30 30 0 1 0 77.75 61.42 A25 25 0 1 1 50.13 20 Z"
  const val SUN_CX = 68f
  const val SUN_CY = 38f
  const val SUN_R = 6.5f
  private const val RAY_FROM = 9.5f
  private const val RAY_TO = 13f
  private const val ARROW_RADIUS = 44.0

  val crescent: Path by lazy { PathParser().parsePathString(CRESCENT_PATH).toPath() }

  /** The sun's 8 rays as (from, to) on the 100-unit grid. */
  val rays: List<Pair<Offset, Offset>> = (0 until 8).map { i ->
    val a = i * PI / 4
    Offset(SUN_CX + RAY_FROM * cos(a).toFloat(), SUN_CY + RAY_FROM * sin(a).toFloat()) to
      Offset(SUN_CX + RAY_TO * cos(a).toFloat(), SUN_CY + RAY_TO * sin(a).toFloat())
  }

  private fun polar(angleDeg: Double, r: Double = ARROW_RADIUS): Pair<Double, Double> {
    val a = angleDeg * PI / 180
    return (50 + r * cos(a)) to (50 + r * sin(a))
  }

  private fun f(v: Double) = toFixed(v, 2)

  /** Clockwise arc from `fromDeg` to `toDeg` with an arrowhead at the end (v1's arrowArc). */
  private fun arrowArc(fromDeg: Double, toDeg: Double): Pair<Path, Path> {
    val (x0, y0) = polar(fromDeg)
    val (x1, y1) = polar(toDeg)
    val arc = "M${f(x0)} ${f(y0)} A44 44 0 0 1 ${f(x1)} ${f(y1)}"
    // Arrowhead: two short strokes pointing back along the clockwise tangent.
    val a = toDeg * PI / 180
    val tx = -sin(a)
    val ty = cos(a)
    val len = 7.0
    val spread = 32 * PI / 180
    fun back(rot: Double) = (x1 - len * (tx * cos(rot) - ty * sin(rot))) to (y1 - len * (tx * sin(rot) + ty * cos(rot)))
    val (lx, ly) = back(spread)
    val (rx, ry) = back(-spread)
    val head = "M${f(lx)} ${f(ly)} L${f(x1)} ${f(y1)} L${f(rx)} ${f(ry)}"
    return PathParser().parsePathString(arc).toPath() to PathParser().parsePathString(head).toPath()
  }

  val arrows: List<Pair<Path, Path>> by lazy { listOf(arrowArc(205.0, 290.0), arrowArc(25.0, 110.0)) }
}

private val TILE_FROM = Color(0xFF2B1F7A)
private val TILE_TO = Color(0xFF5A47D6)
private val GOLD_LIGHT = Color(0xFFFFE3A3)

/** Draws the conversion arrows on the 100-unit grid (already scaled). */
fun DrawScope.drawEmblemArrows(color: Color, strokeWidth: Float = 3.2f) {
  val stroke = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
  for ((arc, head) in Emblem.arrows) {
    drawPath(arc, color, style = stroke)
    drawPath(head, color, style = stroke)
  }
}

/** The crescent with its gold gradient (SVG objectBoundingBox x1=0 y1=0 x2=0.4 y2=1). */
fun DrawScope.drawCrescent(gold: Color = Brand.gold) {
  val b = Emblem.crescent.getBounds()
  val brush = Brush.linearGradient(
    listOf(GOLD_LIGHT, gold),
    start = Offset(b.left, b.top),
    end = Offset(b.left + 0.4f * b.width, b.top + b.height),
  )
  drawPath(Emblem.crescent, brush)
}

/**
 * The emblem at `size`. `tile` draws the rounded-square gradient tile behind it (like the
 * launcher icon); `arrows = false` leaves the conversion arrows out (the loading screen spins its
 * own).
 */
@Composable
fun AppLogo(size: Dp, modifier: Modifier = Modifier, tile: Boolean = false, arrows: Boolean = true) {
  Canvas(modifier.size(size)) {
    val unit = this.size.minDimension / 100f
    withTransform({ scale(unit, unit, pivot = Offset.Zero) }) {
      if (tile) {
        drawRoundRect(
          Brush.linearGradient(listOf(TILE_FROM, TILE_TO), start = Offset.Zero, end = Offset(100f, 100f)),
          size = Size(100f, 100f),
          cornerRadius = CornerRadius(22f, 22f),
        )
      }
      withTransform({
        if (tile) {
          translate(16f, 16f)
          scale(0.68f, 0.68f, pivot = Offset.Zero)
        }
      }) {
        drawCrescent()
        drawCircle(Brand.moonlight, radius = Emblem.SUN_R, center = Offset(Emblem.SUN_CX, Emblem.SUN_CY))
        for ((from, to) in Emblem.rays) drawLine(Brand.moonlight, from, to, strokeWidth = 2.2f, cap = StrokeCap.Round)
        if (arrows) drawEmblemArrows(Brand.moonlight.copy(alpha = 0.9f))
      }
    }
  }
}
