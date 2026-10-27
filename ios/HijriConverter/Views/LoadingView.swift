import HijriCore
import SwiftUI

/// Animated launch screen: drifting glows, a twinkling star field, the emblem with its two
/// conversion arrows orbiting as the spinner, the app name, and an indeterminate bar. Its first
/// frame matches the launch screen (same night colour, same 120 pt emblem, centred). Respects
/// Reduce Motion.
struct LoadingView: View {
  @Environment(\.appTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var titleShown = false
  @State private var start = Date()

  private static let logoSize: CGFloat = 120
  private static let barWidth: CGFloat = 160
  /// Deterministic star field: x, y fractions of the screen, radius pt, twinkle delay s.
  private static let stars: [(CGFloat, CGFloat, CGFloat, Double)] = [
    (0.12, 0.14, 2.2, 0), (0.82, 0.1, 1.6, 0.4), (0.68, 0.22, 2.6, 0.9), (0.24, 0.3, 1.4, 1.3),
    (0.9, 0.36, 1.8, 0.2), (0.08, 0.52, 2, 1.1), (0.86, 0.62, 1.5, 0.6), (0.18, 0.74, 2.4, 1.5),
    (0.76, 0.8, 1.8, 0.3), (0.44, 0.88, 1.4, 1.0), (0.56, 0.08, 1.4, 0.7), (0.36, 0.62, 1.2, 1.7),
  ]

  /// 0→1→0 on a sine ease, `period` seconds per direction.
  private static func pingPong(_ t: Double, _ period: Double) -> Double {
    let phase = (t / period).truncatingRemainder(dividingBy: 2)
    let x = phase <= 1 ? phase : 2 - phase
    return (1 - cos(x * .pi)) / 2
  }

  /// Cubic ease-in-out of 0…1.
  private static func easeInOutCubic(_ x: Double) -> Double {
    x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2
  }

  var body: some View {
    TimelineView(.animation(paused: reduceMotion)) { timeline in
      let t = reduceMotion ? 0 : timeline.date.timeIntervalSince(start)
      GeometryReader { geo in
        let w = geo.size.width, h = geo.size.height
        ZStack {
          Brand.night
          Canvas { context, size in
            func glow(_ diameter: CGFloat, top: CGFloat, left: CGFloat, color: Color, drift: CGFloat, phase: Double) {
              let scale = 1 + CGFloat(phase) * 0.12
              let r = diameter / 2 * scale
              let center = CGPoint(x: left + diameter / 2 + CGFloat(phase) * drift, y: top + diameter / 2 - CGFloat(phase) * drift * 0.6)
              context.fill(
                Path(ellipseIn: CGRect(x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r)),
                with: .radialGradient(Gradient(colors: [color.opacity(0.55), color.opacity(0)]), center: center, startRadius: 0, endRadius: r)
              )
            }
            glow(size.width * 1.1, top: -size.width * 0.35, left: -size.width * 0.4, color: Brand.nightGlow, drift: 30, phase: Self.pingPong(t, 5.2))
            glow(size.width * 0.9, top: size.height * 0.62, left: size.width * 0.35, color: Color(hex: 0x6A4FD8), drift: -26, phase: Self.pingPong(t, 6.4))
            for (x, y, r, delay) in Self.stars {
              // Brightens over 1.1 s, dims over 1.3 s, from 0.35.
              let local = max(0, t - delay).truncatingRemainder(dividingBy: 2.4)
              let alpha = reduceMotion || t < delay ? 0.35 : (local < 1.1 ? 0.35 + 0.65 * local / 1.1 : 1 - 0.75 * (local - 1.1) / 1.3)
              let c = CGPoint(x: x * size.width, y: y * size.height)
              context.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(Brand.moonlight.opacity(alpha)))
            }
          }

          ZStack {
            AppLogo(size: Self.logoSize, arrows: false)
              .scaleEffect(1 + 0.04 * Self.pingPong(t, 1.6))
            Canvas { context, size in
              let unit = size.width / 100
              context.scaleBy(x: unit, y: unit)
              Emblem.drawArrows(context, color: Brand.moonlight.opacity(0.92))
            }
            .frame(width: Self.logoSize, height: Self.logoSize)
            .rotationEffect(.degrees(360 * Self.easeInOutCubic((t / 2.4).truncatingRemainder(dividingBy: 1))))
          }
          .position(x: w / 2, y: h / 2)

          VStack(spacing: Spacing.xs) {
            Text(theme.strings["app.name"])
              .font(Typo.displayMedium)
              .foregroundStyle(.white)
            Text(theme.strings["loading.tagline"])
              .font(Typo.body)
              .foregroundStyle(Color(hex: 0xE9E5FF, alpha: 0.78))
          }
          .multilineTextAlignment(.center)
          .padding(.horizontal, Spacing.xl)
          .opacity(titleShown ? 1 : 0)
          .offset(y: titleShown ? 0 : 16)
          .position(x: w / 2, y: h / 2 + Self.logoSize / 2 + Spacing.xl + 30)

          Capsule()
            .fill(Color(hex: 0xE9E5FF, alpha: 0.16))
            .frame(width: Self.barWidth, height: 4)
            .overlay(alignment: .leading) {
              let progress = Self.pingPongFree((t / 1.3).truncatingRemainder(dividingBy: 1))
              Capsule()
                .fill(Brand.gold)
                .frame(width: Self.barWidth * 0.4, height: 4)
                .offset(x: (-0.4 + 1.4 * progress) * Self.barWidth)
            }
            .clipShape(Capsule())
            .environment(\.layoutDirection, .leftToRight)
            .position(x: w / 2, y: h - 72)
        }
      }
    }
    .ignoresSafeArea()
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(theme.strings["loading.label"])
    .onAppear {
      start = Date()
      if reduceMotion {
        titleShown = true
      } else {
        withAnimation(.easeOut(duration: 0.5).delay(0.2)) { titleShown = true }
      }
    }
  }

  /// Quadratic ease-in-out of 0…1 (the bar's sweep).
  private static func pingPongFree(_ x: Double) -> Double {
    x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2
  }
}
