package com.devlance.hijriconverter.ui.home

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.core.DayInfo
import com.devlance.hijriconverter.core.MoonPhase
import com.devlance.hijriconverter.core.Occasion
import com.devlance.hijriconverter.core.formatDecimal
import com.devlance.hijriconverter.core.formatPercent
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.illuminationPercent
import com.devlance.hijriconverter.ui.components.OccasionBadge
import com.devlance.hijriconverter.ui.components.SourceBadge
import com.devlance.hijriconverter.ui.components.Star
import com.devlance.hijriconverter.ui.components.heroGradient
import com.devlance.hijriconverter.ui.components.negativeMargin
import com.devlance.hijriconverter.ui.moon.MOON_SIZE
import com.devlance.hijriconverter.ui.moon.MoonDisc
import com.devlance.hijriconverter.ui.moon.moonGlowMargin
import com.devlance.hijriconverter.ui.theme.Brand
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme

/** Faint stars on the night panel, kept off the moon's side of the moon row. */
private val SKY_STARS = listOf(
  Star(0.9f, 0.08f, 1.2f, 0.6f),
  Star(0.72f, 0.16f, 0.9f, 0.4f),
  Star(0.95f, 0.34f, 1f, 0.45f),
  Star(0.56f, 0.05f, 0.8f, 0.35f),
  Star(0.86f, 0.62f, 0.9f, 0.4f),
)

/** The phase as text: name, illumination, age. */
data class MoonTexts(val name: String, val illumination: String, val age: String)

@Composable
fun moonTexts(moon: MoonPhase): MoonTexts {
  val theme = appTheme()
  val s = theme.strings
  return MoonTexts(
    name = s["moon.phase.${moon.name.key}"],
    illumination = s.t("moon.illumination", "percent" to formatPercent(illuminationPercent(moon), theme.lang)),
    age = s.t("moon.age", "days" to formatDecimal(moon.age, theme.lang)),
  )
}

/**
 * The converted date, large, over the Moon as it looks that evening — the heart of the result card,
 * and the same composable the share image is drawn from (ShareCard), so what's shared is exactly
 * what's on screen. Always dark, in both themes: the moon only reads as real on a night sky.
 */
@Composable
fun ResultPanel(label: String, date: String, detail: String, moon: MoonPhase, interactive: Boolean = false) {
  val theme = appTheme()
  val c = theme.colors
  val texts = moonTexts(moon)
  Column(
    Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(Radius.md))
      .background(Brand.night)
      .heroGradient(Brand.night, c.heroFrom, SKY_STARS)
      .padding(Spacing.lg),
  ) {
    // Letter spacing breaks Arabic joining, so only the Latin label gets it.
    Text(label, style = Type.label.copy(letterSpacing = if (theme.isRtl) 0.sp else 1.sp), color = c.onHeroMuted)
    val dateText = @Composable {
      Text(
        date,
        style = if (theme.isRtl) Type.displayLargeRtl else Type.displayLarge,
        color = c.onHero,
        modifier = Modifier
          .padding(top = Spacing.xs)
          .then(if (interactive) Modifier.semantics { liveRegion = LiveRegionMode.Polite } else Modifier),
      )
    }
    if (interactive) SelectionContainer { dateText() } else dateText()
    Text(detail, style = Type.body, color = c.onHeroMuted)
    Box(
      Modifier
        .padding(vertical = Spacing.md)
        .fillMaxWidth()
        .height(0.5.dp)
        .background(Color.White.copy(alpha = 0.16f)),
    )
    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier.semantics(mergeDescendants = true) {
        contentDescription = listOf(texts.name, texts.illumination, texts.age).joinToString(if (theme.isRtl) "، " else ", ")
      },
    ) {
      // The glow spills into the padding; the disc itself lines up with the text above.
      MoonDisc(moon, MOON_SIZE, Modifier.negativeMargin(moonGlowMargin(MOON_SIZE), moonGlowMargin(MOON_SIZE)))
      Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(texts.name, style = Type.subtitle, color = c.heroGold)
        Text(texts.illumination, style = Type.body, color = c.onHero)
        Text(texts.age, style = Type.caption, color = c.onHeroMuted)
      }
    }
  }
}

/**
 * Placeholder for the result card while a conversion runs: a pulsing panel shaped like the night
 * panel it replaces, so the card barely changes height, plus a spinner with "Converting…".
 */
@Composable
fun ResultSkeleton() {
  val theme = appTheme()
  val c = theme.colors
  val pulse by rememberInfiniteTransition(label = "skeleton").animateFloat(
    0.45f,
    1f,
    infiniteRepeatable(tween(650), RepeatMode.Reverse),
    label = "pulse",
  )
  // Muted text colour at low opacity reads as a placeholder on the card in both themes.
  @Composable
  fun bar(width: Float, height: Dp, top: Dp = 0.dp) = Box(
    Modifier
      .padding(top = top)
      .fillMaxWidth(width)
      .height(height)
      .clip(RoundedCornerShape(Radius.sm))
      .background(c.textMuted.copy(alpha = 0.22f)),
  )
  Column(Modifier.semantics(mergeDescendants = true) {
    contentDescription = theme.strings["home.converting"]
    liveRegion = LiveRegionMode.Polite
  }) {
    Column(Modifier.graphicsLayer { alpha = pulse }) {
      Column(
        Modifier
          .fillMaxWidth()
          .border(1.dp, c.border, RoundedCornerShape(Radius.md))
          .padding(Spacing.lg),
      ) {
        bar(0.34f, 12.dp)
        bar(0.82f, 34.dp, Spacing.sm)
        bar(0.6f, 16.dp, Spacing.sm)
        Row(
          horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.padding(top = Spacing.md * 2 + 1.dp),
        ) {
          Box(
            Modifier
              .size(MOON_SIZE)
              .clip(CircleShape)
              .background(c.textMuted.copy(alpha = 0.22f)),
          )
          Column(Modifier.weight(1f)) {
            bar(0.7f, 18.dp)
            bar(0.55f, 16.dp, Spacing.sm)
            bar(0.62f, 12.dp, Spacing.sm)
          }
        }
      }
      Box(
        Modifier
          .padding(top = Spacing.md)
          .width(112.dp)
          .height(26.dp)
          .clip(RoundedCornerShape(Radius.sm))
          .background(c.textMuted.copy(alpha = 0.22f)),
      )
    }
    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier.padding(top = Spacing.lg).heightIn(min = 48.dp),
    ) {
      CircularProgressIndicator(color = c.primary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
      Text(theme.strings["home.converting"], style = Type.bodyStrong, color = c.primary)
    }
  }
}

/** Width of the shared image in dp (captured at the phone's density, ~1000 px on most phones). */
private val SHARE_WIDTH = 360.dp

/**
 * What "Share" turns into an image: the result card as the user sees it (night panel with the moon,
 * source badge, occasions) with the calculation method as a footer — no app name or icon (user
 * request, 2026-10-26). Current theme and language, so the image matches the screen. A border
 * instead of a shadow.
 */
@Composable
fun ShareCard(info: DayInfo, label: String, date: String, detail: String, moon: MoonPhase, method: MethodId, highlight: Occasion? = null) {
  val theme = appTheme()
  val c = theme.colors
  val others = info.occasions.filter { it != highlight }
  Column(
    Modifier
      .width(SHARE_WIDTH)
      .background(c.background)
      .padding(Spacing.xl),
  ) {
    Column(
      Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(Radius.lg))
        .background(c.card)
        .border(1.dp, c.border, RoundedCornerShape(Radius.lg))
        .padding(Spacing.lg),
    ) {
      if (highlight != null) {
        OccasionBadge(highlight)
        Box(Modifier.height(Spacing.md))
      }
      ResultPanel(label, date, detail, moon)
      SourceBadge(info.source, modifier = Modifier.padding(top = Spacing.md))
      if (others.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.md)) {
          for (o in others) OccasionBadge(o)
        }
      }
    }
    Text(
      theme.strings.t("home.shareMethod", "method" to theme.strings["methods.${method.id}.name"]),
      style = Type.caption,
      color = c.textMuted,
      modifier = Modifier.padding(top = Spacing.md),
    )
  }
}
