import Foundation
import HijriCore
import SwiftUI

/// Default diameter = the texture's @1x size (96 pt, yarn generate:moon), so every scale draws it
/// pixel for pixel.
let moonSize: CGFloat = 96

/// Night-side tint. At the night side's 90 % (last shading entry) a trace of the texture survives,
/// like earthshine.
private let nightColor = Color(hex: 0x0A0822)

/// How the light fades into the night side: (degrees from the terminator toward the sunlit side —
/// negative = into the night side, darkness reached past that line). Each step is one translucent
/// shadow whose terminator is moved by that angle; stacked, they dim the lit side toward the
/// terminator the way the low sun there does on the real Moon, instead of a cut-out edge. The last
/// entry is the night side.
private let terminatorShading: [(Double, Double)] = [
  (30, 0.03), (22, 0.07), (16, 0.12), (11, 0.19), (7.5, 0.27), (5, 0.36),
  (3, 0.46), (1.5, 0.57), (0, 0.7), (-1.5, 0.82), (-3, 0.9),
]

/// Per-layer opacity so the stack reaches each darkness: 1 - (1 - d) / (1 - d_previous).
private let shadeLayers: [(offset: Double, opacity: Double)] = terminatorShading.indices.map { i in
  let (offset, darkness) = terminatorShading[i]
  let previous = i == 0 ? 0 : terminatorShading[i - 1].1
  return (offset, 1 - (1 - darkness) / (1 - previous))
}

/// Shadows overhang the limb by about a device pixel so they cover the texture's anti-aliased edge
/// (otherwise the night side shows a bright rim). Kept tiny: the overhang darkens the sky.
private let limbOverhang = 0.35

/// Space kept around the disc for the glow (each side). A negative padding of this much lines the
/// disc itself up with neighbouring text.
func moonGlowMargin(_ size: CGFloat) -> CGFloat { (size * 0.1).rounded() }

private func f(_ n: Double) -> String { toFixed(n, 2) }

/// Night side of a disc centred at (c, c) with radius r, for a terminator `lit` degrees from new
/// (0 = all dark, 180 = all lit). The terminator is a half-ellipse through both poles whose
/// horizontal semi-axis is r·|cos lit|; waxing moons are lit on the right. Nil when fully lit.
private func nightPath(_ c: Double, _ r: Double, _ lit: Double, _ waxing: Bool) -> String? {
  if lit >= 180 { return nil }
  let cosLit = cos(lit * .pi / 180)
  let rx = max(abs(cosLit) * r, 0.01)
  // Top → bottom along the terminator: clockwise when it bulges to the right of centre.
  let terminatorSweep = (waxing ? cosLit : -cosLit) > 0 ? 1 : 0
  let outer = r + limbOverhang
  // Bottom → top around the dark limb: the left one (clockwise) when waxing.
  let limbSweep = waxing ? 1 : 0
  return "M\(f(c)) \(f(c - r)) A\(f(rx)) \(f(r)) 0 0 \(terminatorSweep) \(f(c)) \(f(c + r)) "
    + "L\(f(c)) \(f(c + outer)) A\(f(outer)) \(f(outer)) 0 0 \(limbSweep) \(f(c)) \(f(c - outer)) Z"
}

/// The Moon as it looks on a given day — a real full-moon photo with the night side shaded at the
/// exact phase, so consecutive days always differ (not one of 8 phase icons). North up, waxing lit on
/// the right, as usually shown from the northern hemisphere — never mirrored in Arabic. The soft
/// glow scales with brightness, so it's only noticeable near full. Meant for a dark (night-sky)
/// background; hidden from VoiceOver — callers describe the phase in text. The view is `size` plus
/// the glow margin each side.
struct MoonDisc: View {
  let phase: MoonPhase
  var size: CGFloat = moonSize

  var body: some View {
    let margin = moonGlowMargin(size)
    let box = size + margin * 2
    let c = Double(box) / 2
    let r = Double(size) / 2
    let lit = phase.waxing ? phase.elongation : 360 - phase.elongation
    let glow = 0.26 * phase.illumination * phase.illumination
    let shadows = shadeLayers.compactMap { layer in
      nightPath(c, r, min(max(lit - layer.offset, 0), 180), phase.waxing).map { (PathData.path($0), layer.opacity) }
    }
    ZStack {
      // Glow: solid from the centre to the limb, fading out to the edge of the box.
      Circle().fill(
        RadialGradient(
          stops: [
            .init(color: Brand.moonlight.opacity(glow), location: 0),
            .init(color: Brand.moonlight.opacity(glow), location: r / c),
            .init(color: Brand.moonlight.opacity(0), location: 1),
          ],
          center: .center,
          startRadius: 0,
          endRadius: box / 2
        )
      )
      Image("MoonTexture")
        .resizable()
        .interpolation(.high)
        .frame(width: size, height: size)
      Canvas { context, _ in
        for (path, opacity) in shadows {
          context.fill(path, with: .color(nightColor.opacity(opacity)))
        }
      }
    }
    .frame(width: box, height: box)
    .environment(\.layoutDirection, .leftToRight)
    .accessibilityHidden(true)
  }
}
