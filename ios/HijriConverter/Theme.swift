import HijriCore
import SwiftUI

extension Color {
  /// 0xRRGGBB.
  init(hex: UInt32, alpha: Double = 1) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: alpha
    )
  }
}

/// "Lunar Indigo" — a night-sky indigo primary with a warm crescent gold accent (the design system
/// both apps share). Every text-bearing pair is >= 4.5:1 in its theme.
struct AppColors {
  let background, surface, surfaceAlt: Color
  let primary, primaryDark, primarySoft, onPrimary: Color
  let text, textMuted, border: Color
  let accent, accentSoft: Color
  let card, cardShadow: Color
  let mourning, mourningSoft, celebration, celebrationSoft: Color
  let heroFrom, heroTo, onHero, onHeroMuted, heroGold: Color
  let scrim: Color
  /// Switch "off" state — the default surfaces are too close to the card colour to read.
  let switchTrackOff: Color

  static let light = AppColors(
    background: Color(hex: 0xF5F4FB), surface: Color(hex: 0xFFFFFF), surfaceAlt: Color(hex: 0xECEAF7),
    primary: Color(hex: 0x4B3AC0), primaryDark: Color(hex: 0x352A8F), primarySoft: Color(hex: 0xE7E3FB), onPrimary: .white,
    text: Color(hex: 0x16132B), textMuted: Color(hex: 0x5B5873), border: Color(hex: 0xE1DEF0),
    accent: Color(hex: 0x946010), accentSoft: Color(hex: 0xFBF0DA),
    card: .white, cardShadow: Color(hex: 0x2B2078, alpha: 0.14),
    mourning: Color(hex: 0x9B2C3F), mourningSoft: Color(hex: 0xF8E3E7),
    celebration: Color(hex: 0x1F7A4D), celebrationSoft: Color(hex: 0xDFF3E8),
    heroFrom: Color(hex: 0x2B1F7A), heroTo: Color(hex: 0x5A47D6), onHero: .white,
    onHeroMuted: Color.white.opacity(0.78), heroGold: Color(hex: 0xF2C468),
    scrim: Color(hex: 0x0C0A1E, alpha: 0.45),
    switchTrackOff: Color(hex: 0xC9C4E0)
  )

  static let dark = AppColors(
    background: Color(hex: 0x0C0A1D), surface: Color(hex: 0x15122C), surfaceAlt: Color(hex: 0x1F1B3E),
    primary: Color(hex: 0xA99CFF), primaryDark: Color(hex: 0x8A7BF5), primarySoft: Color(hex: 0x262056), onPrimary: Color(hex: 0x110E28),
    text: Color(hex: 0xF3F1FF), textMuted: Color(hex: 0xA9A5C8), border: Color(hex: 0x2A2650),
    accent: Color(hex: 0xE8BD62), accentSoft: Color(hex: 0x3A2F18),
    card: Color(hex: 0x19163A), cardShadow: Color.black.opacity(0.5),
    mourning: Color(hex: 0xF08A9C), mourningSoft: Color(hex: 0x3B1A24),
    celebration: Color(hex: 0x6FD6A2), celebrationSoft: Color(hex: 0x14352A),
    heroFrom: Color(hex: 0x1A1452), heroTo: Color(hex: 0x3B2FA0), onHero: .white,
    onHeroMuted: Color.white.opacity(0.75), heroGold: Color(hex: 0xF2C468),
    scrim: Color.black.opacity(0.6),
    switchTrackOff: Color(hex: 0x3A3566)
  )
}

/// Fixed brand night colours for the launch screen and the loading screen (same in both themes).
enum Brand {
  static let night = Color(hex: 0x110D2E)
  static let nightGlow = Color(hex: 0x3B2FA0)
  static let gold = Color(hex: 0xF2C468)
  static let moonlight = Color(hex: 0xE9E5FF)
}

/// The type scale. System fonts on purpose: they shape Arabic properly. Body text stays >= 16.
enum Typo {
  static let displayLarge = Font.system(size: 34, weight: .bold)
  static let displayMedium = Font.system(size: 28, weight: .bold)
  static let title = Font.system(size: 20, weight: .bold)
  static let subtitle = Font.system(size: 17, weight: .semibold)
  static let body = Font.system(size: 16)
  static let bodyStrong = Font.system(size: 16, weight: .semibold)
  static let caption = Font.system(size: 13, weight: .medium)
  static let label = Font.system(size: 12, weight: .bold)
}

/// 4/8 pt rhythm.
enum Spacing {
  static let xs: CGFloat = 4
  static let sm: CGFloat = 8
  static let md: CGFloat = 12
  static let lg: CGFloat = 16
  static let xl: CGFloat = 24
  static let xxl: CGFloat = 32
  static let xxxl: CGFloat = 48
}

enum Radius {
  static let sm: CGFloat = 8
  static let md: CGFloat = 14
  static let lg: CGFloat = 20
  static let xl: CGFloat = 28
}

/// Minimum touch target.
let touchTarget: CGFloat = 48

/// Everything a view needs to draw itself in the user's choices.
struct AppTheme {
  let colors: AppColors
  let isDark: Bool
  let strings: Strings
  var lang: Lang { strings.lang }
  var isRtl: Bool { lang == .ar }

  static func make(isDark: Bool, lang: Lang) -> AppTheme {
    AppTheme(colors: isDark ? .dark : .light, isDark: isDark, strings: Strings.of(lang))
  }
}

private struct AppThemeKey: EnvironmentKey {
  static let defaultValue = AppTheme.make(isDark: false, lang: .en)
}

extension EnvironmentValues {
  var appTheme: AppTheme {
    get { self[AppThemeKey.self] }
    set { self[AppThemeKey.self] = newValue }
  }
}
