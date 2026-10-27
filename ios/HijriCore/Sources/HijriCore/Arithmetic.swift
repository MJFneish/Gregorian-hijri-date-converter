import Foundation

// v1's (JavaScript) arithmetic, reproduced exactly: the engine was ported from TypeScript step by
// step, and the golden tests hold it to the same results as v1 and the Android app.

/// Floor division (JS `Math.floor(a / b)` on integers). Swift's `/` truncates toward zero.
@inlinable
public func floorDiv(_ a: Int, _ b: Int) -> Int {
  let q = a / b
  return (a % b != 0 && ((a < 0) != (b < 0))) ? q - 1 : q
}

/// The non-negative remainder that goes with `floorDiv`.
@inlinable
public func floorMod(_ a: Int, _ b: Int) -> Int {
  a - floorDiv(a, b) * b
}

/// JS `Math.round`: halves round up (toward +∞).
@inlinable
public func jsRound(_ x: Double) -> Int {
  Int((x + 0.5).rounded(.down))
}

/// JS `Number.prototype.toFixed`: rounds the exact binary value, an exact tie away from zero, with
/// '.' as the separator whatever the phone's locale. (`%.Nf` is exact too but breaks exact ties to
/// even, so those are handled first.)
public func toFixed(_ value: Double, _ digits: Int) -> String {
  let scale = pow(10.0, Double(digits))
  let product = value * scale
  let exact = fma(value, scale, -product) == 0
  if exact, abs(product - product.rounded(.towardZero)) == 0.5 {
    return String(format: "%.\(digits)f", product.rounded(.awayFromZero) / scale)
  }
  return String(format: "%.\(digits)f", value)
}
