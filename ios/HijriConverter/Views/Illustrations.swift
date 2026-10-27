import HijriCore
import SwiftUI

// Original onboarding artwork, drawn in code so it themes, scales and mirrors cleanly and carries no
// image-licensing questions (the same art as the Android app). Each art is `size` wide and
// 0.8 × `size` tall; every loop stands still under Reduce Motion. Drawing is in absolute
// coordinates (not mirrored in Arabic), except the calendar pages, whose order follows the
// layout direction.

/// 0→1→0 on a sine ease, `period` seconds per direction (v1's useLoop).
private func loop(_ t: Double, _ period: Double, delay: Double = 0) -> CGFloat {
  let local = max(0, t - delay)
  let phase = (local / period).truncatingRemainder(dividingBy: 2)
  let x = phase <= 1 ? phase : 2 - phase
  return CGFloat((1 - cos(x * .pi)) / 2)
}

/// 0→1 linear, restarting (v1's useLinearSpin).
private func spin(_ t: Double, _ period: Double) -> CGFloat {
  CGFloat((t / period).truncatingRemainder(dividingBy: 1))
}

/// x, y fractions, radius pt, twinkle delay s.
private let starField: [(CGFloat, CGFloat, CGFloat, Double)] = [
  (0.1, 0.15, 1.8, 0), (0.25, 0.08, 1.2, 0.5), (0.86, 0.12, 2, 0.9), (0.72, 0.3, 1.3, 0.3),
  (0.14, 0.62, 1.4, 1.2), (0.9, 0.7, 1.6, 0.7), (0.5, 0.06, 1.2, 1.5),
]

private func drawStars(_ context: GraphicsContext, _ size: CGSize, _ t: Double, still: Bool) {
  for (fx, fy, r, delay) in starField {
    let local = max(0, t - delay).truncatingRemainder(dividingBy: 2.0)
    let alpha = still || t < delay ? 0.4 : (local < 0.9 ? 0.4 + 0.6 * local / 0.9 : 1 - 0.7 * (local - 0.9) / 1.1)
    let c = CGPoint(x: fx * size.width, y: fy * size.width * 0.8)
    context.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(Brand.moonlight.opacity(alpha)))
  }
}

/// Runs `content` with the seconds since it appeared (0 under Reduce Motion).
private struct Animated<Content: View>: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var start = Date()
  private let content: (Double, Bool) -> Content

  init(@ViewBuilder content: @escaping (Double, Bool) -> Content) {
    self.content = content
  }

  var body: some View {
    TimelineView(.animation(paused: reduceMotion)) { timeline in
      content(reduceMotion ? 0 : timeline.date.timeIntervalSince(start), reduceMotion)
    }
  }
}

// 1 ── Welcome: crescent with the sun orbiting it.
struct WelcomeArt: View {
  let size: CGFloat

  var body: some View {
    Animated { t, still in
      Canvas { context, canvasSize in
        let w = canvasSize.width, h = canvasSize.height
        let center = CGPoint(x: w / 2, y: h / 2)
        drawStars(context, canvasSize, t, still: still)
        // Pulsing gold glow.
        let glow = loop(t, 2.2)
        let glowRadius = h * 0.4 * (0.92 + glow * 0.1)
        var glowContext = context
        glowContext.opacity = 0.55 + glow * 0.35
        glowContext.fill(
          Path(ellipseIn: CGRect(x: center.x - glowRadius, y: center.y - glowRadius, width: 2 * glowRadius, height: 2 * glowRadius)),
          with: .radialGradient(Gradient(colors: [Brand.gold.opacity(0.45), Brand.gold.opacity(0)]), center: center, startRadius: 0, endRadius: glowRadius)
        )
        // Dashed orbit.
        let orbitSize = h * 0.86
        let orbitRadius = orbitSize / 2 - 10
        context.stroke(
          Path(ellipseIn: CGRect(x: center.x - orbitRadius, y: center.y - orbitRadius, width: 2 * orbitRadius, height: 2 * orbitRadius)),
          with: .color(Brand.moonlight.opacity(0.35)),
          style: StrokeStyle(lineWidth: 1.5, dash: [4, 7])
        )
        // Crescent, 52% of the height, on the emblem's 100-unit grid.
        let crescent = h * 0.52
        var crescentContext = context
        crescentContext.translateBy(x: center.x - crescent / 2, y: center.y - crescent / 2)
        crescentContext.scaleBy(x: crescent / 100, y: crescent / 100)
        Emblem.drawCrescent(crescentContext)
        // The sun on the orbit, starting at the top.
        var sunContext = context
        sunContext.translateBy(x: center.x, y: center.y)
        sunContext.rotate(by: .degrees(Double(spin(t, 9)) * 360))
        let sun = CGPoint(x: 0, y: -orbitSize / 2 + 10)
        let sunColor = Color(hex: 0xFFD58A)
        sunContext.fill(Path(ellipseIn: CGRect(x: sun.x - 9, y: sun.y - 9, width: 18, height: 18)), with: .color(sunColor))
        for i in 0 ..< 8 {
          let a = Double(i) * .pi / 4
          var ray = Path()
          ray.move(to: CGPoint(x: sun.x + 12 * cos(a), y: sun.y + 12 * sin(a)))
          ray.addLine(to: CGPoint(x: sun.x + 16 * cos(a), y: sun.y + 16 * sin(a)))
          sunContext.stroke(ray, with: .color(sunColor), style: StrokeStyle(lineWidth: 2, lineCap: .round))
        }
      }
    }
    .frame(width: size, height: size * 0.8)
  }
}

// 2 ── Convert: a Gregorian and a Hijri calendar page, swap arrows between them.
private struct CalendarPage: View {
  let header: String
  let big: String
  let sub: String
  let color: Color
  let float: CGFloat
  let phase: CGFloat

  var body: some View {
    VStack(spacing: 0) {
      Text(header)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .padding(6)
        .frame(maxWidth: .infinity)
        .background(color)
      Text(big)
        .font(.system(size: 44, weight: .heavy))
        .foregroundStyle(Color(hex: 0x16132B))
        .padding(.top, 4)
      Text(sub)
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(Color(hex: 0x5B5873))
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .padding(.horizontal, 6)
    }
    .padding(.bottom, 10)
    .frame(width: 104)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .shadow(color: .black.opacity(0.25), radius: 12, y: 6)
    .rotationEffect(.degrees(Double(phase) * -6))
    .offset(y: (float - 0.5) * 10 * phase)
  }
}

struct ConvertArt: View {
  let size: CGFloat
  let lang: Lang

  var body: some View {
    Animated { t, still in
      ZStack {
        Canvas { context, canvasSize in drawStars(context, canvasSize, t, still: still) }
        // HStack follows the layout direction: the Gregorian page leads in either language.
        HStack(spacing: 8) {
          CalendarPage(
            header: "\(gregorianMonthName(3, lang)) \(localizeDigits(2002, lang))",
            big: localizeDigits(22, lang),
            sub: lang == .ar ? "ميلادي" : "Gregorian",
            color: Color(hex: 0x4B3AC0),
            float: loop(t, 2.4),
            phase: 1
          )
          Canvas { context, canvasSize in
            let unit = canvasSize.width / 100
            context.scaleBy(x: unit, y: unit)
            Emblem.drawArrows(context, color: Brand.moonlight, lineWidth: 7)
          }
          .frame(width: 80, height: 80)
          .rotationEffect(.degrees(Double(spin(t, 6)) * 360))
          CalendarPage(
            header: "\(hijriMonthName(1, lang)) \(localizeDigits(1423, lang))",
            big: localizeDigits(8, lang),
            sub: lang == .ar ? "هجري" : "Hijri",
            color: Color(hex: 0xB7832A),
            float: loop(t, 2.4),
            phase: -1
          )
        }
      }
    }
    .frame(width: size, height: size * 0.8)
  }
}

// 3 ── Methods: sighting the new crescent at sunset (a 300×240 landscape scaled to the art).
struct MethodsArt: View {
  let size: CGFloat

  var body: some View {
    Animated { t, still in
      let rise = loop(t, 2.6)
      ZStack(alignment: .topLeading) {
        Canvas { context, canvasSize in
          var ctx = context
          let k = canvasSize.width / 300
          ctx.scaleBy(x: k, y: k)
          ctx.fill(
            Path(CGRect(x: 0, y: 60, width: 300, height: 140)),
            with: .linearGradient(
              Gradient(stops: [
                .init(color: Color(hex: 0x1A1452, alpha: 0), location: 0),
                .init(color: Color(hex: 0x7B4BB7, alpha: 0.55), location: 0.55),
                .init(color: Color(hex: 0xF29E5C, alpha: 0.9), location: 1),
              ]),
              startPoint: CGPoint(x: 0, y: 60),
              endPoint: CGPoint(x: 0, y: 200)
            )
          )
          let sun = CGPoint(x: 110, y: 196)
          ctx.fill(
            Path(ellipseIn: CGRect(x: sun.x - 46, y: sun.y - 46, width: 92, height: 92)),
            with: .radialGradient(Gradient(colors: [Color(hex: 0xFFD58A), Color(hex: 0xF29E5C, alpha: 0)]), center: sun, startRadius: 0, endRadius: 46)
          )
          ctx.fill(Path(ellipseIn: CGRect(x: sun.x - 20, y: sun.y - 20, width: 40, height: 40)), with: .color(Color(hex: 0xFFC870)))
          ctx.fill(PathData.path("M0 190 C40 170 80 176 120 186 C160 196 200 168 240 172 C265 175 285 182 300 188 L300 240 L0 240 Z"), with: .color(Color(hex: 0x1E1747)))
          ctx.fill(PathData.path("M0 210 C50 196 100 204 150 210 C200 216 250 200 300 206 L300 240 L0 240 Z"), with: .color(Color(hex: 0x120E33)))
          // Observer on a hill
          ctx.fill(Path(ellipseIn: CGRect(x: 227, y: 155, width: 10, height: 10)), with: .color(Color(hex: 0x120E33)))
          ctx.fill(PathData.path("M226 186 L229 167 L235 167 L238 186 Z"), with: .color(Color(hex: 0x120E33)))
          var arm = Path()
          arm.move(to: CGPoint(x: 234, y: 170))
          arm.addLine(to: CGPoint(x: 252, y: 158))
          ctx.stroke(arm, with: .color(Color(hex: 0x120E33)), style: StrokeStyle(lineWidth: 4, lineCap: .round))
          drawStars(context, canvasSize, t, still: still)
        }
        Canvas { context, canvasSize in
          let unit = canvasSize.width / 100
          context.scaleBy(x: unit, y: unit)
          context.translateBy(x: 50, y: 50)
          context.rotate(by: .degrees(-25))
          context.translateBy(x: -50, y: -50)
          context.fill(PathData.path("M50 18 A32 32 0 1 0 82 50 A27 27 0 1 1 50 18 Z"), with: .color(Brand.gold))
        }
        .frame(width: size * 0.16, height: size * 0.16)
        .opacity(0.35 + rise * 0.65)
        .offset(x: size * 0.6, y: size * 0.8 * 0.22 + (1 - rise) * 8)
      }
      // The art is absolute: the crescent stays above the observer in either language.
      .environment(\.layoutDirection, .leftToRight)
    }
    .frame(width: size, height: size * 0.8)
  }
}

// 4 ── Occasions: a swinging lantern (fanous) glowing in the night (viewBox 100×155).
struct OccasionsArt: View {
  let size: CGFloat

  var body: some View {
    Animated { t, still in
      let lanternW = size * 0.34
      ZStack(alignment: .top) {
        Canvas { context, canvasSize in drawStars(context, canvasSize, t, still: still) }
        VStack(spacing: 0) {
          Rectangle().fill(Color(hex: 0xE9E5FF, alpha: 0.6)).frame(width: 2, height: size * 0.8 * 0.16)
          ZStack {
            Canvas { context, canvasSize in
              let r = canvasSize.width / 2
              let c = CGPoint(x: r, y: r)
              context.fill(
                Path(ellipseIn: CGRect(origin: .zero, size: canvasSize)),
                with: .radialGradient(Gradient(colors: [Color(hex: 0xFFD58A, alpha: 0.7), Color(hex: 0xFFD58A, alpha: 0)]), center: c, startRadius: 0, endRadius: r)
              )
            }
            .frame(width: lanternW * 1.9, height: lanternW * 1.9)
            .opacity(0.5 + loop(t, 1.8, delay: 0.3) * 0.45)
            Canvas { context, canvasSize in
              let k = canvasSize.width / 100
              context.scaleBy(x: k, y: k)
              drawLantern(context)
            }
            .frame(width: lanternW, height: lanternW * 1.55)
          }
          .frame(width: lanternW, height: lanternW * 1.55)
        }
        .rotationEffect(.degrees(Double(loop(t, 2.2) - 0.5) * 12), anchor: .top)
      }
    }
    .frame(width: size, height: size * 0.8)
  }

  private func drawLantern(_ context: GraphicsContext) {
    let gold = Brand.gold
    context.stroke(PathData.path("M42 4 A8 8 0 1 1 58 4"), with: .color(gold), lineWidth: 4)
    context.fill(PathData.path("M30 14 L70 14 L80 30 L20 30 Z"), with: .color(gold))
    let body = PathData.path("M22 30 L78 30 L86 110 L14 110 Z")
    context.fill(body, with: .color(Color(hex: 0x5A47D6)))
    context.stroke(body, with: .color(gold), lineWidth: 4)
    context.fill(PathData.path("M34 36 L66 36 L72 104 L28 104 Z"), with: .color(Color(hex: 0xFFD58A, alpha: 0.9)))
    context.stroke(PathData.path("M50 36 L50 104 M31 70 L69 70"), with: .color(gold), lineWidth: 3)
    context.fill(PathData.path("M14 110 L86 110 L74 128 L26 128 Z"), with: .color(gold))
    context.fill(Path(ellipseIn: CGRect(x: 40, y: 130, width: 20, height: 12)), with: .color(gold))
    var drop = Path()
    drop.move(to: CGPoint(x: 50, y: 142))
    drop.addLine(to: CGPoint(x: 50, y: 154))
    context.stroke(drop, with: .color(gold), style: StrokeStyle(lineWidth: 3, lineCap: .round))
  }
}
