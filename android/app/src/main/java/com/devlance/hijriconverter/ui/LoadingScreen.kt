package com.devlance.hijriconverter.ui

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.ui.brand.AppLogo
import com.devlance.hijriconverter.ui.brand.drawEmblemArrows
import com.devlance.hijriconverter.ui.theme.Brand
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

/** Must equal the splash icon's emblem (288 dp canvas, 120 dp emblem) so the hand-off doesn't jump. */
private val LOGO_SIZE = 120.dp
private val BAR_WIDTH = 160.dp

/** Deterministic star field (fractions of the screen, radius dp, twinkle delay ms), so it looks
 * the same every launch. */
private val STARS = listOf(
  floatArrayOf(0.12f, 0.14f, 2.2f, 0f),
  floatArrayOf(0.82f, 0.1f, 1.6f, 400f),
  floatArrayOf(0.68f, 0.22f, 2.6f, 900f),
  floatArrayOf(0.24f, 0.3f, 1.4f, 1300f),
  floatArrayOf(0.9f, 0.36f, 1.8f, 200f),
  floatArrayOf(0.08f, 0.52f, 2f, 1100f),
  floatArrayOf(0.86f, 0.62f, 1.5f, 600f),
  floatArrayOf(0.18f, 0.74f, 2.4f, 1500f),
  floatArrayOf(0.76f, 0.8f, 1.8f, 300f),
  floatArrayOf(0.44f, 0.88f, 1.4f, 1000f),
  floatArrayOf(0.56f, 0.08f, 1.4f, 700f),
  floatArrayOf(0.36f, 0.62f, 1.2f, 1700f),
)

private val EaseInOutSine = CubicBezierEasing(0.37f, 0f, 0.63f, 1f)
private val EaseInOutCubic = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)
private val EaseInOutQuad = CubicBezierEasing(0.45f, 0f, 0.55f, 1f)

/** The phone's "Remove animations" setting (animator duration scale 0). */
@Composable
fun reducedMotion(): Boolean {
  val context = LocalContext.current
  return remember { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
}

/**
 * Animated launch screen (v1's LoadingScreen): drifting glows, a twinkling star field, the emblem
 * with its two conversion arrows orbiting as the spinner, the app name, and an indeterminate bar.
 * Its first frame is exactly the system splash (same night colour, same 120 dp emblem, centred),
 * so removing the splash underneath is invisible. Respects reduced motion.
 */
@Composable
fun LoadingScreen() {
  val theme = appTheme()
  val still = reducedMotion()
  val loop = rememberInfiniteTransition(label = "loading")
  val spin by loop.animateFloat(0f, if (still) 0f else 360f, infiniteRepeatable(tween(2400, easing = EaseInOutCubic)), label = "spin")
  val breathe by loop.animateFloat(0f, if (still) 0f else 1f, infiniteRepeatable(tween(1600, easing = EaseInOutSine), RepeatMode.Reverse), label = "breathe")
  val bar by loop.animateFloat(0f, if (still) 0.4f else 1f, infiniteRepeatable(tween(1300, easing = EaseInOutQuad)), label = "bar")
  val glowA by loop.animateFloat(0f, if (still) 0f else 1f, infiniteRepeatable(tween(5200, easing = EaseInOutSine), RepeatMode.Reverse), label = "glowA")
  val glowB by loop.animateFloat(0f, if (still) 0f else 1f, infiniteRepeatable(tween(6400, easing = EaseInOutSine), RepeatMode.Reverse), label = "glowB")
  // Each star brightens over 1.1 s and dims over 1.3 s, starting at its own delay.
  val twinkles = STARS.map { star ->
    loop.animateFloat(
      initialValue = 0.35f,
      targetValue = if (still) 0.35f else 0.25f,
      animationSpec = infiniteRepeatable(
        keyframes {
          durationMillis = 2400
          1f at 1100
        },
        initialStartOffset = StartOffset(star[3].toInt()),
      ),
      label = "star",
    )
  }
  val title = remember { Animatable(0f) }
  LaunchedEffect(Unit) {
    if (still) title.snapTo(1f) else {
      kotlinx.coroutines.delay(200)
      title.animateTo(1f, tween(500, easing = FastOutSlowInEasing))
    }
  }
  val density = LocalDensity.current

  BoxWithConstraints(
    Modifier
      .fillMaxSize()
      .background(Brand.night)
      .semantics {
        contentDescription = theme.strings["loading.label"]
        progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate
      },
    contentAlignment = Alignment.Center,
  ) {
    val width = maxWidth
    val height = maxHeight
    Canvas(Modifier.fillMaxSize()) {
      fun glow(sizeDp: Dp, top: Dp, left: Dp, color: Color, drift: Float, t: Float) {
        val s = sizeDp.toPx()
        val dx = t * drift * density.density
        val dy = -t * drift * 0.6f * density.density
        val scale = 1 + t * 0.12f
        val center = Offset(left.toPx() + s / 2 + dx, top.toPx() + s / 2 + dy)
        drawCircle(
          Brush.radialGradient(listOf(color.copy(alpha = 0.55f), color.copy(alpha = 0f)), center, s / 2 * scale),
          radius = s / 2 * scale,
          center = center,
        )
      }
      glow(width * 1.1f, -width * 0.35f, -width * 0.4f, Brand.nightGlow, 30f, glowA)
      glow(width * 0.9f, height * 0.62f, width * 0.35f, Color(0xFF6A4FD8), -26f, glowB)
      STARS.forEachIndexed { i, star ->
        drawCircle(
          Brand.moonlight.copy(alpha = twinkles[i].value.coerceIn(0f, 1f)),
          radius = star[2] * density.density,
          center = Offset(star[0] * size.width, star[1] * size.height),
        )
      }
    }

    Box(Modifier.size(LOGO_SIZE)) {
      AppLogo(LOGO_SIZE, arrows = false, modifier = Modifier.graphicsLayer {
        scaleX = 1 + breathe * 0.04f
        scaleY = 1 + breathe * 0.04f
      })
      Canvas(Modifier.size(LOGO_SIZE).graphicsLayer { rotationZ = spin }) {
        val unit = size.minDimension / 100f
        withTransform({ scale(unit, unit, pivot = Offset.Zero) }) {
          drawEmblemArrows(Brand.moonlight.copy(alpha = 0.92f))
        }
      }
    }

    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      modifier = Modifier
        .align(Alignment.Center)
        .offset(y = LOGO_SIZE / 2 + Spacing.xl + 30.dp)
        .graphicsLayer {
          alpha = title.value
          translationY = (1 - title.value) * 16.dp.toPx()
        }
        .padding(horizontal = Spacing.xl),
    ) {
      Text(theme.strings["app.name"], style = Type.displayMedium, color = Color.White, textAlign = TextAlign.Center)
      Text(
        theme.strings["loading.tagline"],
        style = Type.body,
        color = Color(233, 229, 255).copy(alpha = 0.78f),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(top = Spacing.xs),
      )
    }

    Box(
      Modifier
        .align(Alignment.BottomCenter)
        .padding(bottom = 72.dp)
        .width(BAR_WIDTH)
        .height(4.dp)
        .clip(RoundedCornerShape(2.dp))
        .background(Color(233, 229, 255).copy(alpha = 0.16f)),
    ) {
      Box(
        Modifier
          .graphicsLayer { translationX = (-0.4f + bar * 1.4f) * BAR_WIDTH.toPx() }
          .width(BAR_WIDTH * 0.4f)
          .height(4.dp)
          .clip(RoundedCornerShape(2.dp))
          .background(Brand.gold),
      )
    }
  }
}
