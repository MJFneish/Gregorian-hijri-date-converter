import HijriCore
import SwiftUI

/// The app's emblem: a gold crescent (the lunar Hijri calendar) holding a small sun (the solar
/// Gregorian calendar), circled by two arrows (conversion). Original artwork; the same geometry as
/// the Android AppLogo and android/scripts/generate-icons.js — keep all three in sync. Coordinates
/// are on a 100×100 grid.
enum Emblem {
  /// Crescent = circle C1 (50,50 r30) minus circle C2 (62,42 r25); intersection points precomputed.
  static let crescentPath = "M50.13 20 A30 30 0 1 0 77.75 61.42 A25 25 0 1 1 50.13 20 Z"
  static let sunCenter = CGPoint(x: 68, y: 38)
  static let sunRadius: CGFloat = 6.5
  private static let rayFrom: CGFloat = 9.5
  private static let rayTo: CGFloat = 13
  private static let arrowRadius = 44.0

  static let rays: [(CGPoint, CGPoint)] = (0 ..< 8).map { i in
    let a = Double(i) * .pi / 4
    return (
      CGPoint(x: sunCenter.x + rayFrom * cos(a), y: sunCenter.y + rayFrom * sin(a)),
      CGPoint(x: sunCenter.x + rayTo * cos(a), y: sunCenter.y + rayTo * sin(a))
    )
  }

  private static func polar(_ angleDeg: Double) -> (Double, Double) {
    let a = angleDeg * .pi / 180
    return (50 + arrowRadius * cos(a), 50 + arrowRadius * sin(a))
  }

  private static func f(_ v: Double) -> String { toFixed(v, 2) }

  /// Clockwise arc from `fromDeg` to `toDeg` with an arrowhead at the end, as path data.
  private static func arrowArc(_ fromDeg: Double, _ toDeg: Double) -> (arc: String, head: String) {
    let (x0, y0) = polar(fromDeg)
    let (x1, y1) = polar(toDeg)
    let arc = "M\(f(x0)) \(f(y0)) A44 44 0 0 1 \(f(x1)) \(f(y1))"
    // Arrowhead: two short strokes pointing back along the clockwise tangent.
    let a = toDeg * .pi / 180
    let tx = -sin(a), ty = cos(a)
    let len = 7.0, spread = 32 * Double.pi / 180
    func back(_ rot: Double) -> (Double, Double) {
      (x1 - len * (tx * cos(rot) - ty * sin(rot)), y1 - len * (tx * sin(rot) + ty * cos(rot)))
    }
    let (lx, ly) = back(spread)
    let (rx, ry) = back(-spread)
    return (arc, "M\(f(lx)) \(f(ly)) L\(f(x1)) \(f(y1)) L\(f(rx)) \(f(ry))")
  }

  static let arrows = [arrowArc(205, 290), arrowArc(25, 110)]

  /// The conversion arrows on the 100-unit grid (the context already scaled to it).
  static func drawArrows(_ context: GraphicsContext, color: Color, lineWidth: CGFloat = 3.2) {
    let style = StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
    for (arc, head) in arrows {
      context.stroke(PathData.path(arc), with: .color(color), style: style)
      context.stroke(PathData.path(head), with: .color(color), style: style)
    }
  }

  /// The crescent with its gold gradient (SVG objectBoundingBox x1=0 y1=0 x2=0.4 y2=1).
  static func drawCrescent(_ context: GraphicsContext, gold: Color = Brand.gold) {
    let path = PathData.path(crescentPath)
    let b = path.boundingRect
    context.fill(
      path,
      with: .linearGradient(
        Gradient(colors: [Color(hex: 0xFFE3A3), gold]),
        startPoint: CGPoint(x: b.minX, y: b.minY),
        endPoint: CGPoint(x: b.minX + 0.4 * b.width, y: b.maxY)
      )
    )
  }

  /// Crescent, sun and (optionally) arrows on the 100-unit grid.
  static func draw(_ context: GraphicsContext, arrows: Bool) {
    drawCrescent(context)
    let r = sunRadius
    context.fill(Path(ellipseIn: CGRect(x: sunCenter.x - r, y: sunCenter.y - r, width: 2 * r, height: 2 * r)), with: .color(Brand.moonlight))
    for (from, to) in rays {
      var ray = Path()
      ray.move(to: from)
      ray.addLine(to: to)
      context.stroke(ray, with: .color(Brand.moonlight), style: StrokeStyle(lineWidth: 2.2, lineCap: .round))
    }
    if arrows { drawArrows(context, color: Brand.moonlight.opacity(0.9)) }
  }
}

/// The emblem at `size`. `tile` draws the rounded-square gradient tile behind it (like the launcher
/// icon); `arrows: false` leaves the conversion arrows out (the loading screen spins its own).
struct AppLogo: View {
  let size: CGFloat
  var tile = false
  var arrows = true

  var body: some View {
    Canvas { context, canvasSize in
      var ctx = context
      let unit = min(canvasSize.width, canvasSize.height) / 100
      ctx.scaleBy(x: unit, y: unit)
      if tile {
        ctx.fill(
          Path(roundedRect: CGRect(x: 0, y: 0, width: 100, height: 100), cornerRadius: 22),
          with: .linearGradient(Gradient(colors: [Color(hex: 0x2B1F7A), Color(hex: 0x5A47D6)]), startPoint: .zero, endPoint: CGPoint(x: 100, y: 100))
        )
        ctx.translateBy(x: 16, y: 16)
        ctx.scaleBy(x: 0.68, y: 0.68)
      }
      Emblem.draw(ctx, arrows: arrows)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}
