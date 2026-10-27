package com.devlance.hijriconverter.ui.onboarding

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.hijri.gregorianMonthName
import com.devlance.hijriconverter.core.hijri.hijriMonthName
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.ui.brand.drawCrescent
import com.devlance.hijriconverter.ui.brand.drawEmblemArrows
import com.devlance.hijriconverter.ui.reducedMotion
import com.devlance.hijriconverter.ui.theme.Brand
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Original onboarding artwork (v1's Illustrations.tsx), drawn in code so it themes, scales and
 * mirrors cleanly and carries no image-licensing questions. Every loop stands still under reduced
 * motion. Each art is `size` wide and 0.8 × `size` tall.
 */

private val EaseInOutSine = CubicBezierEasing(0.37f, 0f, 0.63f, 1f)

private fun parse(d: String): Path = PathParser().parsePathString(d).toPath()

/** 0→1→0 sine loop (v1's useLoop). */
@Composable
private fun InfiniteTransition.loop(duration: Int, still: Boolean, delay: Int = 0): State<Float> =
  animateFloat(
    0f,
    if (still) 0f else 1f,
    infiniteRepeatable(tween(duration, easing = EaseInOutSine), RepeatMode.Reverse, StartOffset(delay)),
    label = "loop",
  )

/** 0→1 linear, restarting (v1's useLinearSpin). */
@Composable
private fun InfiniteTransition.spin(duration: Int, still: Boolean): State<Float> =
  animateFloat(0f, if (still) 0f else 1f, infiniteRepeatable(tween(duration, easing = LinearEasing)), label = "spin")

private val STAR_FIELD = listOf(
  floatArrayOf(0.1f, 0.15f, 1.8f, 0f),
  floatArrayOf(0.25f, 0.08f, 1.2f, 500f),
  floatArrayOf(0.86f, 0.12f, 2f, 900f),
  floatArrayOf(0.72f, 0.3f, 1.3f, 300f),
  floatArrayOf(0.14f, 0.62f, 1.4f, 1200f),
  floatArrayOf(0.9f, 0.7f, 1.6f, 700f),
  floatArrayOf(0.5f, 0.06f, 1.2f, 1500f),
)

/** Twinkling stars over a `size` × 0.8 `size` box. */
@Composable
private fun StarField(size: Dp, still: Boolean) {
  val loop = rememberInfiniteTransition(label = "stars")
  val twinkles = STAR_FIELD.map { star ->
    loop.animateFloat(
      0.4f,
      if (still) 0.4f else 0.3f,
      infiniteRepeatable(keyframes { durationMillis = 2000; 1f at 900 }, initialStartOffset = StartOffset(star[3].toInt())),
      label = "twinkle",
    )
  }
  Canvas(Modifier.size(size, size * 0.8f)) {
    STAR_FIELD.forEachIndexed { i, (fx, fy, r) ->
      drawCircle(Brand.moonlight.copy(alpha = twinkles[i].value.coerceIn(0f, 1f)), r * density, Offset(fx * this.size.width, fy * this.size.height))
    }
  }
}

private operator fun FloatArray.component1() = this[0]
private operator fun FloatArray.component2() = this[1]
private operator fun FloatArray.component3() = this[2]

// 1 ── Welcome: crescent with the sun orbiting it.
@Composable
fun WelcomeArt(size: Dp) {
  val still = reducedMotion()
  val loop = rememberInfiniteTransition(label = "welcome")
  val orbit by loop.spin(9000, still)
  val glow by loop.loop(2200, still)
  val h = size * 0.8f
  Box(Modifier.size(size, h), contentAlignment = Alignment.Center) {
    StarField(size, still)
    Canvas(Modifier.size(size, h)) {
      val cx = this.size.width / 2
      val cy = this.size.height / 2
      val hPx = this.size.height
      // Pulsing gold glow.
      val glowRadius = hPx * 0.4f * (0.92f + glow * 0.1f)
      drawCircle(
        Brush.radialGradient(listOf(Brand.gold.copy(alpha = 0.45f), Brand.gold.copy(alpha = 0f)), Offset(cx, cy), glowRadius),
        glowRadius,
        Offset(cx, cy),
        alpha = 0.55f + glow * 0.35f,
      )
      // Dashed orbit.
      val orbitSize = hPx * 0.86f
      val orbitRadius = orbitSize / 2 - 10 * density
      drawCircle(
        Brand.moonlight.copy(alpha = 0.35f),
        orbitRadius,
        Offset(cx, cy),
        style = Stroke(1.5f * density, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4 * density, 7 * density))),
      )
      // Crescent, 52% of the height, on the emblem's 100-unit grid.
      val crescent = hPx * 0.52f
      withTransform({
        translate(cx - crescent / 2, cy - crescent / 2)
        scale(crescent / 100f, crescent / 100f, pivot = Offset.Zero)
      }) { drawCrescent() }
      // The sun on the orbit, starting at the top.
      rotate(orbit * 360f, Offset(cx, cy)) {
        val sun = Offset(cx, cy - orbitSize / 2 + 10 * density)
        drawCircle(Color(0xFFFFD58A), 9 * density, sun)
        for (i in 0 until 8) {
          val a = i * PI / 4
          drawLine(
            Color(0xFFFFD58A),
            Offset(sun.x + 12 * density * cos(a).toFloat(), sun.y + 12 * density * sin(a).toFloat()),
            Offset(sun.x + 16 * density * cos(a).toFloat(), sun.y + 16 * density * sin(a).toFloat()),
            strokeWidth = 2 * density,
            cap = StrokeCap.Round,
          )
        }
      }
    }
  }
}

// 2 ── Convert: a Gregorian and a Hijri calendar page, swap arrows between them.
private val SWAP_SIZE = 80.dp

@Composable
private fun CalendarPage(header: String, big: String, sub: String, color: Color, float: Float, phase: Int) {
  Column(
    horizontalAlignment = Alignment.CenterHorizontally,
    modifier = Modifier
      .graphicsLayer {
        translationY = (float - 0.5f) * 10 * phase * density
        rotationZ = phase * -6f
      }
      .width(104.dp)
      .shadow(6.dp, RoundedCornerShape(16.dp))
      .clip(RoundedCornerShape(16.dp))
      .background(Color.White)
      .padding(bottom = 10.dp),
  ) {
    BasicText(
      header,
      maxLines = 1,
      autoSize = TextAutoSize.StepBased(minFontSize = 8.sp, maxFontSize = 13.sp),
      style = TextStyle(color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center),
      modifier = Modifier.fillMaxWidth().background(color).padding(vertical = 6.dp, horizontal = 6.dp),
    )
    Text(big, style = TextStyle(fontSize = 44.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF16132B)), modifier = Modifier.padding(top = 4.dp))
    BasicText(
      sub,
      maxLines = 1,
      autoSize = TextAutoSize.StepBased(minFontSize = 8.sp, maxFontSize = 12.sp),
      style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF5B5873), textAlign = TextAlign.Center),
      modifier = Modifier.padding(horizontal = 6.dp),
    )
  }
}

@Composable
fun ConvertArt(size: Dp, lang: Lang) {
  val still = reducedMotion()
  val loop = rememberInfiniteTransition(label = "convert")
  val float by loop.loop(2400, still)
  val spin by loop.spin(6000, still)
  Box(Modifier.size(size, size * 0.8f), contentAlignment = Alignment.Center) {
    StarField(size, still)
    // Row follows the layout direction: the Gregorian page leads in either language.
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
      CalendarPage(
        header = "${gregorianMonthName(3, lang)} ${localizeDigits(2002, lang)}",
        big = localizeDigits(22, lang),
        sub = if (lang == Lang.AR) "ميلادي" else "Gregorian",
        color = Color(0xFF4B3AC0),
        float = float,
        phase = 1,
      )
      Canvas(Modifier.size(SWAP_SIZE).graphicsLayer { rotationZ = spin * 360f }) {
        val unit = this.size.minDimension / 100f
        withTransform({ scale(unit, unit, pivot = Offset.Zero) }) { drawEmblemArrows(Brand.moonlight, strokeWidth = 7f) }
      }
      CalendarPage(
        header = "${hijriMonthName(1, lang)} ${localizeDigits(1423, lang)}",
        big = localizeDigits(8, lang),
        sub = if (lang == Lang.AR) "هجري" else "Hijri",
        color = Color(0xFFB7832A),
        float = float,
        phase = -1,
      )
    }
  }
}

// 3 ── Methods: sighting the new crescent at sunset (a 300×240 landscape scaled to the art).
private val HILL_FAR by lazy { parse("M0 190 C40 170 80 176 120 186 C160 196 200 168 240 172 C265 175 285 182 300 188 L300 240 L0 240 Z") }
private val HILL_NEAR by lazy { parse("M0 210 C50 196 100 204 150 210 C200 216 250 200 300 206 L300 240 L0 240 Z") }
private val OBSERVER_BODY by lazy { parse("M226 186 L229 167 L235 167 L238 186 Z") }
private val SIGHTING_CRESCENT by lazy { parse("M50 18 A32 32 0 1 0 82 50 A27 27 0 1 1 50 18 Z") }

@Composable
fun MethodsArt(size: Dp) {
  val still = reducedMotion()
  val loop = rememberInfiniteTransition(label = "methods")
  val rise by loop.loop(2600, still)
  val h = size * 0.8f
  // The art is absolute (not mirrored in Arabic): the crescent stays above the observer.
  CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
  Box(Modifier.size(size, h)) {
    Canvas(Modifier.fillMaxSize()) {
      val k = this.size.width / 300f
      withTransform({ scale(k, k, pivot = Offset.Zero) }) {
        drawRect(
          Brush.verticalGradient(
            0f to Color(0xFF1A1452).copy(alpha = 0f),
            0.55f to Color(0xFF7B4BB7).copy(alpha = 0.55f),
            1f to Color(0xFFF29E5C).copy(alpha = 0.9f),
            startY = 60f,
            endY = 200f,
          ),
          topLeft = Offset(0f, 60f),
          size = Size(300f, 140f),
        )
        drawCircle(Brush.radialGradient(listOf(Color(0xFFFFD58A), Color(0xFFF29E5C).copy(alpha = 0f)), Offset(110f, 196f), 46f), 46f, Offset(110f, 196f))
        drawCircle(Color(0xFFFFC870), 20f, Offset(110f, 196f))
        drawPath(HILL_FAR, Color(0xFF1E1747))
        drawPath(HILL_NEAR, Color(0xFF120E33))
        // Observer on a hill
        drawCircle(Color(0xFF120E33), 5f, Offset(232f, 160f))
        drawPath(OBSERVER_BODY, Color(0xFF120E33))
        drawLine(Color(0xFF120E33), Offset(234f, 170f), Offset(252f, 158f), strokeWidth = 4f, cap = StrokeCap.Round)
      }
    }
    StarField(size, still)
    Canvas(
      Modifier
        .offset(x = size * 0.6f, y = h * 0.22f)
        .size(size * 0.16f)
        .graphicsLayer {
          translationY = (1 - rise) * 8 * density
          alpha = 0.35f + rise * 0.65f
        },
    ) {
      val unit = this.size.minDimension / 100f
      withTransform({
        scale(unit, unit, pivot = Offset.Zero)
        rotate(-25f, Offset(50f, 50f))
      }) { drawPath(SIGHTING_CRESCENT, Brand.gold) }
    }
  }
  }
}

// 4 ── Occasions: a swinging lantern (fanous) glowing in the night (viewBox 100×155).
private val LANTERN_TOP by lazy { parse("M30 14 L70 14 L80 30 L20 30 Z") }
private val LANTERN_BODY by lazy { parse("M22 30 L78 30 L86 110 L14 110 Z") }
private val LANTERN_GLASS by lazy { parse("M34 36 L66 36 L72 104 L28 104 Z") }
private val LANTERN_BASE by lazy { parse("M14 110 L86 110 L74 128 L26 128 Z") }
private val LANTERN_RING by lazy { parse("M42 4 A8 8 0 1 1 58 4") }

@Composable
fun OccasionsArt(size: Dp) {
  val still = reducedMotion()
  val loop = rememberInfiniteTransition(label = "occasions")
  val swing by loop.loop(2200, still)
  val glow by loop.loop(1800, still, delay = 300)
  val h = size * 0.8f
  val lanternW = size * 0.34f
  Box(Modifier.size(size, h), contentAlignment = Alignment.TopCenter) {
    StarField(size, still)
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      modifier = Modifier.graphicsLayer {
        transformOrigin = TransformOrigin(0.5f, 0f)
        rotationZ = (swing - 0.5f) * 12f
      },
    ) {
      Box(Modifier.size(2.dp, h * 0.16f).background(Color(233, 229, 255).copy(alpha = 0.6f)))
      Box(Modifier.size(lanternW, lanternW * 1.55f), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(lanternW * 1.9f).graphicsLayer { alpha = 0.5f + glow * 0.45f }) {
          val r = this.size.minDimension / 2
          drawCircle(Brush.radialGradient(listOf(Color(0xFFFFD58A).copy(alpha = 0.7f), Color(0xFFFFD58A).copy(alpha = 0f)), center, r), r)
        }
        Canvas(Modifier.size(lanternW, lanternW * 1.55f)) { drawLantern() }
      }
    }
  }
}

private fun DrawScope.drawLantern() {
  val k = size.width / 100f
  withTransform({ scale(k, k, pivot = Offset.Zero) }) {
    drawPath(LANTERN_RING, Brand.gold, style = Stroke(4f))
    drawPath(LANTERN_TOP, Brand.gold)
    drawPath(LANTERN_BODY, Color(0xFF5A47D6))
    drawPath(LANTERN_BODY, Brand.gold, style = Stroke(4f))
    drawPath(LANTERN_GLASS, Color(0xFFFFD58A), alpha = 0.9f)
    drawLine(Brand.gold, Offset(50f, 36f), Offset(50f, 104f), strokeWidth = 3f)
    drawLine(Brand.gold, Offset(31f, 70f), Offset(69f, 70f), strokeWidth = 3f)
    drawPath(LANTERN_BASE, Brand.gold)
    drawOval(Brand.gold, topLeft = Offset(40f, 130f), size = Size(20f, 12f))
    drawLine(Brand.gold, Offset(50f, 142f), Offset(50f, 154f), strokeWidth = 3f, cap = StrokeCap.Round)
  }
}
