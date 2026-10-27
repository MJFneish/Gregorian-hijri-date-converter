package com.devlance.hijriconverter.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.data.Settings
import com.devlance.hijriconverter.data.ThemeMode
import com.devlance.hijriconverter.i18n.Strings

/**
 * "Lunar Indigo" — a night-sky indigo primary with a warm crescent gold accent (v1's design
 * system, from the ui-ux-pro-max recommendation for a spiritual/calendar utility). Every
 * text-bearing pair is >= 4.5:1 in its theme (light `accent` is a darker gold than the decorative
 * `heroGold`, which only ever sits on the dark hero gradient).
 */
@Immutable
data class AppColors(
  val background: Color,
  val surface: Color,
  val surfaceAlt: Color,
  val primary: Color,
  val primaryDark: Color,
  val primarySoft: Color,
  val onPrimary: Color,
  val text: Color,
  val textMuted: Color,
  val border: Color,
  val accent: Color,
  val accentSoft: Color,
  val card: Color,
  val cardShadow: Color,
  val mourning: Color,
  val mourningSoft: Color,
  val celebration: Color,
  val celebrationSoft: Color,
  val heroFrom: Color,
  val heroTo: Color,
  val onHero: Color,
  val onHeroMuted: Color,
  val heroGold: Color,
  val scrim: Color,
  /** Switch "off" state — the default surfaces are too close to the card colour to read. */
  val switchTrackOff: Color,
  val switchThumbOff: Color,
)

val LightColors = AppColors(
  background = Color(0xFFF5F4FB),
  surface = Color(0xFFFFFFFF),
  surfaceAlt = Color(0xFFECEAF7),
  primary = Color(0xFF4B3AC0),
  primaryDark = Color(0xFF352A8F),
  primarySoft = Color(0xFFE7E3FB),
  onPrimary = Color(0xFFFFFFFF),
  text = Color(0xFF16132B),
  textMuted = Color(0xFF5B5873),
  border = Color(0xFFE1DEF0),
  accent = Color(0xFF946010),
  accentSoft = Color(0xFFFBF0DA),
  card = Color(0xFFFFFFFF),
  cardShadow = Color(43, 32, 120).copy(alpha = 0.14f),
  mourning = Color(0xFF9B2C3F),
  mourningSoft = Color(0xFFF8E3E7),
  celebration = Color(0xFF1F7A4D),
  celebrationSoft = Color(0xFFDFF3E8),
  heroFrom = Color(0xFF2B1F7A),
  heroTo = Color(0xFF5A47D6),
  onHero = Color(0xFFFFFFFF),
  onHeroMuted = Color.White.copy(alpha = 0.78f),
  heroGold = Color(0xFFF2C468),
  scrim = Color(12, 10, 30).copy(alpha = 0.45f),
  switchTrackOff = Color(0xFFC9C4E0),
  switchThumbOff = Color(0xFFFFFFFF),
)

val DarkColors = AppColors(
  background = Color(0xFF0C0A1D),
  surface = Color(0xFF15122C),
  surfaceAlt = Color(0xFF1F1B3E),
  primary = Color(0xFFA99CFF),
  primaryDark = Color(0xFF8A7BF5),
  primarySoft = Color(0xFF262056),
  onPrimary = Color(0xFF110E28),
  text = Color(0xFFF3F1FF),
  textMuted = Color(0xFFA9A5C8),
  border = Color(0xFF2A2650),
  accent = Color(0xFFE8BD62),
  accentSoft = Color(0xFF3A2F18),
  card = Color(0xFF19163A),
  cardShadow = Color.Black.copy(alpha = 0.5f),
  mourning = Color(0xFFF08A9C),
  mourningSoft = Color(0xFF3B1A24),
  celebration = Color(0xFF6FD6A2),
  celebrationSoft = Color(0xFF14352A),
  heroFrom = Color(0xFF1A1452),
  heroTo = Color(0xFF3B2FA0),
  onHero = Color(0xFFFFFFFF),
  onHeroMuted = Color.White.copy(alpha = 0.75f),
  heroGold = Color(0xFFF2C468),
  scrim = Color.Black.copy(alpha = 0.6f),
  switchTrackOff = Color(0xFF3A3566),
  switchThumbOff = Color(0xFFA9A5C8),
)

/** Fixed brand night colours for the splash and the loading screen (same in both themes, so the
 * system splash → loading screen hand-off is seamless). `night` = res/values/themes.xml's. */
object Brand {
  val night = Color(0xFF110D2E)
  val nightGlow = Color(0xFF3B2FA0)
  val gold = Color(0xFFF2C468)
  val moonlight = Color(0xFFE9E5FF)
}

/**
 * v1's type scale. System fonts on purpose: they ship proper Arabic shaping for free, which a
 * bundled Latin display face wouldn't. Body text stays >= 16 for readability.
 */
object Type {
  val displayLarge = TextStyle(fontSize = 34.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.4).sp)
  val displayMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold)
  val title = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold)
  val subtitle = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
  val body = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal, lineHeight = 24.sp)
  val bodyStrong = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
  val caption = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium, lineHeight = 18.sp)
  val label = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.6.sp)
}

/** 4/8 dp rhythm (same scale as prayer-times-lb). */
object Spacing {
  val xs: Dp = 4.dp
  val sm: Dp = 8.dp
  val md: Dp = 12.dp
  val lg: Dp = 16.dp
  val xl: Dp = 24.dp
  val xxl: Dp = 32.dp
  val xxxl: Dp = 48.dp
}

object Radius {
  val sm: Dp = 8.dp
  val md: Dp = 14.dp
  val lg: Dp = 20.dp
  val xl: Dp = 28.dp
  val pill: Dp = 999.dp
}

/** Minimum touch target (Android 48dp guideline). */
val TOUCH_TARGET: Dp = 48.dp

/** Everything a screen needs to draw itself in the user's choices. */
@Immutable
data class AppTheme(val colors: AppColors, val isDark: Boolean, val strings: Strings) {
  val lang: Lang get() = strings.lang
  val isRtl: Boolean get() = lang == Lang.AR
}

val LocalAppTheme = staticCompositionLocalOf<AppTheme> { error("HijriTheme not set") }

/** Shorthand inside composables: `val theme = appTheme()`. */
@Composable
fun appTheme(): AppTheme = LocalAppTheme.current

@Composable
fun HijriTheme(settings: Settings, content: @Composable () -> Unit) {
  val systemDark = isSystemInDarkTheme()
  val isDark = when (settings.themeMode) {
    ThemeMode.System -> systemDark
    ThemeMode.Light -> false
    ThemeMode.Dark -> true
  }
  val theme = remember(isDark, settings.language) {
    AppTheme(colors = if (isDark) DarkColors else LightColors, isDark = isDark, strings = Strings.of(settings.language))
  }
  val c = theme.colors
  val scheme = if (isDark) {
    darkColorScheme(primary = c.primary, onPrimary = c.onPrimary, background = c.background, surface = c.surface, onSurface = c.text, onBackground = c.text)
  } else {
    lightColorScheme(primary = c.primary, onPrimary = c.onPrimary, background = c.background, surface = c.surface, onSurface = c.text, onBackground = c.text)
  }
  MaterialTheme(colorScheme = scheme) {
    // RTL follows the app's language, not the phone's, and flips instantly when it changes.
    CompositionLocalProvider(
      LocalAppTheme provides theme,
      LocalLayoutDirection provides if (theme.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
      content = content,
    )
  }
}
