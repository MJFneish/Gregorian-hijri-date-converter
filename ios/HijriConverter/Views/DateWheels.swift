import HijriCore
import SwiftUI
import UIKit

enum CalendarKind { case gregorian, hijri }

/// A day/month/year in either calendar, as the wheels edit it.
struct Ymd: Equatable {
  let year: Int
  let month: Int
  let day: Int
}

/// Five 44 pt rows, like the Android wheels.
let wheelHeight: CGFloat = 44 * 5

/// Day / month / year wheels for either calendar — native iOS wheel pickers (a native date picker
/// can't show Hijri months). Changing month or year clamps the day to the new month's length (e.g.
/// 30 Safar → 29 when that Safar has 29 days). Mirrors in Arabic with the layout direction. A wheel
/// reports its value once it comes to rest.
struct DateWheels: View {
  @Environment(\.appTheme) private var theme
  let calendar: CalendarKind
  let value: Ymd
  let onChange: (Ymd) -> Void
  let method: MethodId

  var body: some View {
    let s = theme.strings
    let lang = theme.lang
    let isHijri = calendar == .hijri
    let minYear = isHijri ? hijriMinYear : gregorianMinYear
    let maxYear = isHijri ? hijriMaxYear : gregorianMaxYear
    let monthLength = { (y: Int, m: Int) in isHijri ? hijriMonthLength(y, m, method) : gregorianMonthLength(y, m) }
    let dayCount = monthLength(value.year, value.month)
    let change = { (y: Int, m: Int, d: Int) in onChange(Ymd(year: y, month: m, day: min(d, monthLength(y, m)))) }

    WeightedRow(weights: [0.8, 1.6, 1.1], spacing: Spacing.xs) {
      column(s["picker.day"], id: "picker.day", selection: min(value.day, dayCount), values: Array(1 ... dayCount)) {
        localizeDigits($0, lang)
      } onChange: { change(value.year, value.month, $0) }
      column(s["picker.month"], id: "picker.month", selection: value.month, values: Array(1 ... 12)) {
        isHijri ? hijriMonthName($0, lang) : gregorianMonthName($0, lang)
      } onChange: { change(value.year, $0, value.day) }
      column(s["picker.year"], id: "picker.year", selection: min(max(value.year, minYear), maxYear), values: Array(minYear ... maxYear)) {
        localizeDigits($0, lang)
      } onChange: { change($0, value.month, value.day) }
    }
    // Rebuild the wheels at the new position when the direction switches calendars.
    .id(calendar)
  }

  private func column(
    _ label: String,
    id: String,
    selection: Int,
    values: [Int],
    text: @escaping (Int) -> String,
    onChange: @escaping (Int) -> Void
  ) -> some View {
    let c = theme.colors
    return VStack(spacing: Spacing.xs) {
      Text(label).font(Typo.caption).foregroundStyle(c.textMuted)
      Picker(label, selection: Binding(get: { selection }, set: onChange)) {
        ForEach(values, id: \.self) { v in
          Text(text(v))
            .font(Typo.body)
            .foregroundStyle(c.text)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .tag(v)
        }
      }
      .pickerStyle(.wheel)
      .frame(height: wheelHeight)
      .frame(maxWidth: .infinity)
      .clipped()
      .accessibilityIdentifier(id)
    }
  }
}

/// Children side by side, their widths in proportion to `weights` (the wheels' 0.8 / 1.6 / 1.1).
/// Mirrored in Arabic like any SwiftUI layout.
struct WeightedRow: Layout {
  let weights: [CGFloat]
  var spacing: CGFloat = 0

  private func widths(_ total: CGFloat, _ count: Int) -> [CGFloat] {
    let used = Array(weights.prefix(count))
    let sum = used.reduce(0, +)
    let free = max(total - spacing * CGFloat(count - 1), 0)
    return used.map { free * $0 / sum }
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.replacingUnspecifiedDimensions().width
    let heights = zip(subviews, widths(width, subviews.count)).map { subview, w in
      subview.sizeThatFits(ProposedViewSize(width: w, height: proposal.height)).height
    }
    return CGSize(width: width, height: heights.max() ?? 0)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX
    for (subview, w) in zip(subviews, widths(bounds.width, subviews.count)) {
      subview.place(at: CGPoint(x: x, y: bounds.minY), proposal: ProposedViewSize(width: w, height: bounds.height))
      x += w + spacing
    }
  }
}

/// Side-by-side wheel pickers otherwise take touches meant for their neighbours (each reports the
/// full width as its intrinsic size).
extension UIPickerView {
  override open var intrinsicContentSize: CGSize {
    CGSize(width: UIView.noIntrinsicMetric, height: super.intrinsicContentSize.height)
  }
}
