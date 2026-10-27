import HijriCore
import Observation
import SwiftUI

/// A lucide icon (the app's icon set) at `size`, stroked like lucide draws it: 2 units on its
/// 24-unit grid, round caps and joins. Decorative — give the surrounding control its label. Not
/// mirrored in Arabic: views pick the arrow/chevron that points the right way.
struct LucideIcon: View {
  let icon: Lucide
  let color: Color
  var size: CGFloat = 20
  var lineWidth: CGFloat = 2

  var body: some View {
    Canvas { context, canvasSize in
      let scale = min(canvasSize.width, canvasSize.height) / 24
      context.scaleBy(x: scale, y: scale)
      let style = StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
      for d in icon.paths {
        context.stroke(PathData.path(d), with: .color(color), style: style)
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// Rounded card: a soft shadow in light mode, a hairline border in dark mode.
struct Card<Content: View>: View {
  @Environment(\.appTheme) private var theme
  private let padding: CGFloat
  private let content: Content

  init(padding: CGFloat = Spacing.lg, @ViewBuilder content: () -> Content) {
    self.padding = padding
    self.content = content()
  }

  var body: some View {
    let c = theme.colors
    VStack(alignment: .leading, spacing: 0) { content }
      .padding(padding)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
          .fill(c.card)
          .shadow(color: theme.isDark ? .clear : c.cardShadow, radius: 5, y: 2)
      )
      .overlay(
        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
          .stroke(theme.isDark ? c.border : .clear, lineWidth: 1)
      )
  }
}

/// Uppercase section label (Latin only — Arabic has no case, and letter spacing would break its
/// joining).
struct SectionLabel: View {
  @Environment(\.appTheme) private var theme
  let text: String
  var first = false

  var body: some View {
    Text(theme.isRtl ? text : text.uppercased())
      .font(Typo.label)
      .kerning(theme.isRtl ? 0 : 0.6)
      .foregroundStyle(theme.colors.textMuted)
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.top, first ? Spacing.lg : Spacing.xl)
      .padding(.bottom, Spacing.sm)
      .accessibilityAddTraits(.isHeader)
  }
}

/// Press feedback by scaling to 96 %; a disabled control fades to 45 % unless `dimWhenDisabled` is
/// false (busy buttons that already show a spinner).
struct PressScaleStyle: ButtonStyle {
  var dimWhenDisabled = true
  @Environment(\.isEnabled) private var isEnabled

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .contentShape(Rectangle())
      .scaleEffect(configuration.isPressed ? 0.96 : 1)
      .opacity(!isEnabled && dimWhenDisabled ? 0.45 : 1)
      .animation(.easeOut(duration: configuration.isPressed ? 0.09 : 0.14), value: configuration.isPressed)
  }
}

/// Plain press feedback: dims while pressed (rows, links).
struct PressDimStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .contentShape(Rectangle())
      .opacity(configuration.isPressed ? 0.6 : 1)
  }
}

struct SegmentOption<T: Hashable> {
  let value: T
  let label: String
  var icon: Lucide?
  var id: String?
}

/// Pill segmented control with a sliding selection indicator. Mirrors in Arabic with the layout
/// direction.
struct SegmentedControl<T: Hashable>: View {
  @Environment(\.appTheme) private var theme
  @Namespace private var namespace
  let options: [SegmentOption<T>]
  let value: T
  let onChange: (T) -> Void

  var body: some View {
    let c = theme.colors
    HStack(spacing: 0) {
      ForEach(options.indices, id: \.self) { i in
        let option = options[i]
        let active = option.value == value
        Button {
          onChange(option.value)
        } label: {
          HStack(spacing: Spacing.xs) {
            if let icon = option.icon { LucideIcon(icon: icon, color: active ? c.onPrimary : c.text, size: 16) }
            Text(option.label)
              .font(.system(size: 15, weight: .semibold))
              .lineLimit(1)
          }
          .foregroundStyle(active ? c.onPrimary : c.text)
          .frame(maxWidth: .infinity, minHeight: 44)
          .padding(.horizontal, Spacing.sm)
          .background {
            if active {
              Capsule().fill(c.primary).matchedGeometryEffect(id: "indicator", in: namespace)
            }
          }
          .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
        .accessibilityIdentifier(option.id ?? "segment.\(i)")
      }
    }
    .padding(4)
    .background(Capsule().fill(c.surfaceAlt))
    .animation(.easeInOut(duration: 0.22), value: value)
  }
}

/// A tinted square with an icon, beside a list row's text.
struct IconBadge: View {
  let icon: Lucide
  let tint: Color
  let background: Color
  var size: CGFloat = 40
  var iconSize: CGFloat = 20

  var body: some View {
    LucideIcon(icon: icon, color: tint, size: iconSize)
      .frame(width: size, height: size)
      .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(background))
  }
}

/// "Official" / "Calculated" / "Approximate" chip under a converted Hijri date. Text + icon, not
/// colour alone, carries the meaning.
struct SourceBadge: View {
  @Environment(\.appTheme) private var theme
  let source: DateSource
  var onDark = false

  var body: some View {
    let c = theme.colors
    let icon: Lucide = switch source {
    case .official: .badgeCheck
    case .calculated: .calculator
    case .approximate: .circleDashed
    }
    let fg = onDark ? c.onHero : (source == .approximate ? c.accent : c.primary)
    let bg = onDark ? Color.white.opacity(0.14) : (source == .approximate ? c.accentSoft : c.primarySoft)
    HStack(spacing: Spacing.xs) {
      LucideIcon(icon: icon, color: fg, size: 14)
      Text(theme.strings["source.\(source.rawValue)"]).font(Typo.caption).foregroundStyle(fg)
    }
    .padding(.horizontal, Spacing.sm + 2)
    .padding(.vertical, 4)
    .background(Capsule().fill(bg))
  }
}

/// Icon and colours of an occasion kind — the same everywhere it appears.
struct KindStyle {
  let icon: Lucide
  let fg: Color
  let bg: Color

  static func of(_ kind: OccasionKind, _ c: AppColors) -> KindStyle {
    switch kind {
    case .mourning: KindStyle(icon: .heartCrack, fg: c.mourning, bg: c.mourningSoft)
    case .celebration: KindStyle(icon: .flower2, fg: c.celebration, bg: c.celebrationSoft)
    case .other: KindStyle(icon: .star, fg: c.primary, bg: c.primarySoft)
    }
  }
}

struct OccasionBadge: View {
  @Environment(\.appTheme) private var theme
  let occasion: Occasion
  var onDark = false

  var body: some View {
    let style = KindStyle.of(occasion.kind, theme.colors)
    let fg = onDark ? theme.colors.heroGold : style.fg
    let bg = onDark ? Color(hex: 0xF2C468, alpha: 0.16) : style.bg
    HStack(spacing: Spacing.sm) {
      LucideIcon(icon: style.icon, color: fg, size: 16)
      Text(occasion.name(theme.lang))
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(fg)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, Spacing.md)
    .padding(.vertical, Spacing.sm + 2)
    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(bg))
  }
}

/// A small rounded tag ("Default", "Sunni", countdowns).
struct Tag: View {
  let text: String
  let color: Color
  let background: Color

  var body: some View {
    Text(text)
      .font(Typo.caption)
      .foregroundStyle(color)
      .padding(.horizontal, Spacing.sm + 2)
      .padding(.vertical, 3)
      .background(Capsule().fill(background))
  }
}

/// Hairline between list rows.
struct HairlineDivider: View {
  @Environment(\.appTheme) private var theme

  var body: some View {
    Rectangle().fill(theme.colors.border).frame(height: 0.5)
  }
}

/// A decorative dot at [x fraction, y fraction, radius pt, opacity].
struct Star {
  let x, y, radius, opacity: CGFloat
}

/// The diagonal hero gradient: top-left → bottom-right, plus decorative stars. Drawn in absolute
/// coordinates, so it doesn't mirror in Arabic (v1's didn't either).
struct HeroGradient: View {
  let from: Color
  let to: Color
  var stars: [Star] = []

  var body: some View {
    Canvas { context, size in
      context.fill(
        Path(CGRect(origin: .zero, size: size)),
        with: .linearGradient(Gradient(colors: [from, to]), startPoint: .zero, endPoint: CGPoint(x: size.width, y: size.height))
      )
      for star in stars {
        let center = CGPoint(x: star.x * size.width, y: star.y * size.height)
        context.fill(
          Path(ellipseIn: CGRect(x: center.x - star.radius, y: center.y - star.radius, width: star.radius * 2, height: star.radius * 2)),
          with: .color(.white.opacity(star.opacity))
        )
      }
    }
    .accessibilityHidden(true)
  }
}

/// Scaffold for every page opened from the Tools tab: a back button (pointing the reading
/// direction's way), the page title and a scrolling body.
struct PageScreen<Content: View>: View {
  @Environment(\.appTheme) private var theme
  @Environment(Navigator.self) private var navigator
  let title: String
  var subtitle: String?
  private let content: Content

  init(title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
    self.title = title
    self.subtitle = subtitle
    self.content = content()
  }

  var body: some View {
    let c = theme.colors
    VStack(spacing: 0) {
      HStack(spacing: Spacing.md) {
        Button {
          navigator.back()
        } label: {
          LucideIcon(icon: theme.isRtl ? .arrowRight : .arrowLeft, color: c.text, size: 22)
            .frame(width: touchTarget, height: touchTarget)
            .background(Circle().fill(c.surfaceAlt))
        }
        .buttonStyle(PressScaleStyle())
        .accessibilityLabel(theme.strings["common.back"])
        .accessibilityIdentifier("page.back")
        VStack(alignment: .leading, spacing: 0) {
          Text(title)
            .font(Typo.title)
            .foregroundStyle(c.text)
            .lineLimit(2)
            .accessibilityAddTraits(.isHeader)
          if let subtitle {
            Text(subtitle).font(Typo.caption).foregroundStyle(c.textMuted).lineLimit(2)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, Spacing.lg)
      .padding(.top, Spacing.sm)
      .padding(.bottom, Spacing.md)
      ScrollView {
        VStack(alignment: .leading, spacing: 0) { content }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, Spacing.lg)
          .padding(.bottom, Spacing.xxxl)
      }
      .scrollIndicators(.hidden)
    }
    .background(c.background.ignoresSafeArea())
  }
}

/// A brief confirmation ("Copied") — `Toasts.shared.show(…)` from anywhere; `ToastHost` draws it.
@MainActor
@Observable
final class Toasts {
  static let shared = Toasts()
  private(set) var message: String?
  private(set) var id = 0

  func show(_ text: String) {
    message = text
    id += 1
  }

  func hide(_ shownId: Int) {
    if shownId == id { message = nil }
  }
}

/// Mounted once at the app root, above everything.
struct ToastHost: View {
  @Environment(\.appTheme) private var theme
  private let toasts = Toasts.shared

  var body: some View {
    let c = theme.colors
    VStack {
      Spacer()
      if let message = toasts.message {
        HStack(spacing: Spacing.sm) {
          LucideIcon(icon: .circleCheck, color: c.background, size: 18)
          Text(message).font(Typo.bodyStrong).foregroundStyle(c.background)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .background(Capsule().fill(c.text))
        .padding(.bottom, 88)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .task(id: toasts.id) {
          let shown = toasts.id
          try? await Task.sleep(for: .milliseconds(1800))
          withAnimation(.easeIn(duration: 0.18)) { toasts.hide(shown) }
        }
        .accessibilityAddTraits(.updatesFrequently)
      }
    }
    .animation(.easeOut(duration: 0.22), value: toasts.message)
    .allowsHitTesting(false)
  }
}
