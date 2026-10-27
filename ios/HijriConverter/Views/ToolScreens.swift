import HijriCore
import SwiftUI

// MARK: - Shared parts

/// A tappable date row (label + date, calendar icon) that opens a picker — callers attach a
/// `datePickerSheet`. `onToday` adds a "Today" chip (nil when the date already is today).
struct DateField: View {
  @Environment(\.appTheme) private var theme
  let label: String
  let value: String
  var minHeight: CGFloat = 64
  var id = "dateField"
  let onTap: () -> Void
  var onToday: (() -> Void)?

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    HStack(spacing: Spacing.md) {
      Button(action: onTap) {
        HStack(spacing: Spacing.md) {
          LucideIcon(icon: .calendarDays, color: c.primary, size: 20)
          VStack(alignment: .leading, spacing: 2) {
            Text(label).font(Typo.caption).foregroundStyle(c.textMuted)
            Text(value).font(Typo.bodyStrong).foregroundStyle(c.text)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(minHeight: minHeight - Spacing.sm * 2)
      }
      .buttonStyle(PressDimStyle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(label + ": " + value)
      .accessibilityHint(s["between.tapToChange"])
      .accessibilityAddTraits(.isButton)
      .accessibilityIdentifier(id)
      if let onToday {
        Button(action: onToday) {
          HStack(spacing: 4) {
            LucideIcon(icon: .calendarCheck2, color: c.primary, size: 14)
            Text(s["home.today"]).font(Typo.caption).foregroundStyle(c.primary)
          }
          .padding(.horizontal, Spacing.sm + 2)
          .padding(.vertical, 6)
          .background(Capsule().fill(c.primarySoft))
          // 30 pt tall; the touch area reaches 48.
          .contentShape(Rectangle().inset(by: -9))
        }
        .buttonStyle(PressDimStyle())
        .accessibilityLabel(s["between.setToday"])
      }
    }
    .padding(.horizontal, Spacing.md)
    .padding(.vertical, Spacing.sm)
    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.surfaceAlt))
  }
}

/// Bottom sheet with date wheels; changes apply only on "Done".
private struct DatePickerSheet: View {
  @Environment(\.appTheme) private var theme
  @Environment(\.dismiss) private var dismiss
  let title: String
  let calendar: CalendarKind
  let method: MethodId
  let onConfirm: (Ymd) -> Void
  @State var draft: Ymd

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    VStack(spacing: 0) {
      Text(title)
        .font(Typo.title)
        .foregroundStyle(c.text)
        .padding(.top, Spacing.xl)
        .padding(.bottom, Spacing.md)
      DateWheels(calendar: calendar, value: draft, onChange: { draft = $0 }, method: method)
      HStack(spacing: Spacing.md) {
        Button { dismiss() } label: {
          Text(s["common.cancel"]).font(Typo.bodyStrong).foregroundStyle(c.text)
            .frame(maxWidth: .infinity, minHeight: touchTarget)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.surfaceAlt))
        }
        .buttonStyle(PressScaleStyle())
        Button {
          onConfirm(draft)
          dismiss()
        } label: {
          Text(s["common.done"]).font(Typo.bodyStrong).foregroundStyle(c.onPrimary)
            .frame(maxWidth: .infinity, minHeight: touchTarget)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.primary))
        }
        .buttonStyle(PressScaleStyle())
        .accessibilityIdentifier("sheet.done")
      }
      .padding(.top, Spacing.lg)
    }
    .padding(.horizontal, Spacing.lg)
    .padding(.bottom, Spacing.lg)
    .presentationDetents([.height(440)])
    .presentationDragIndicator(.visible)
    .presentationBackground(c.surface)
  }
}

extension View {
  /// Opens `DatePickerSheet` while `isPresented`; the theme and direction are passed on explicitly.
  func datePickerSheet(
    isPresented: Binding<Bool>,
    theme: AppTheme,
    title: String,
    calendar: CalendarKind,
    initial: Ymd,
    method: MethodId,
    onConfirm: @escaping (Ymd) -> Void
  ) -> some View {
    sheet(isPresented: isPresented) {
      DatePickerSheet(title: title, calendar: calendar, method: method, onConfirm: onConfirm, draft: initial)
        .environment(\.appTheme, theme)
        .environment(\.layoutDirection, theme.isRtl ? .rightToLeft : .leftToRight)
        .preferredColorScheme(theme.isDark ? .dark : .light)
    }
  }
}

private func ymd(_ date: some YmdDate) -> Ymd { Ymd(year: date.year, month: date.month, day: date.day) }

// MARK: - Compare offices

/// Tools → Compare offices: one day under every office's calendar, measured against the user's
/// chosen one ("a day ahead / behind"), plus when each office started its current month. Lebanese
/// Shia follow different marjas, so the same evening can be the 1st for one and the 30th for
/// another. Opened from the Tools tab (today) or from the converter's result (that day). The
/// ±adjustment isn't applied here: these are the offices' own calendars.
struct CompareOfficesView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @State private var jdn: Int
  @State private var picking = false

  init(jdn: Int?) {
    _jdn = State(initialValue: jdn ?? todayJdn())
  }

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let reference = opts.method
    let rows = compareOffices(jdn, reference)
    let offsets = rows.map(\.offset)
    let spread = (offsets.max() ?? 0) - (offsets.min() ?? 0)
    let gregorian = jdnToGregorian(jdn)
    let weekday = weekdayName(weekdayOfJdn(jdn), lang)
    let agree = spread == 0

    PageScreen(title: s["tools.compare.title"], subtitle: s["tools.compare.description"]) {
      DateField(
        label: s["compare.date"],
        value: "\(weekday) · \(formatGregorian(gregorian, lang))",
        id: "compare.date",
        onTap: { picking = true },
        onToday: jdn != todayJdn() ? { jdn = todayJdn() } : nil
      )

      HStack(spacing: Spacing.sm) {
        LucideIcon(icon: agree ? .circleCheck : .gitCompareArrows, color: agree ? c.celebration : c.accent, size: 18)
        Text(agree ? s["compare.agree"] : s.t("compare.differ", ["days": countPhrase(.day, spread, lang, afterPreposition: true)]))
          .font(Typo.bodyStrong)
          .foregroundStyle(agree ? c.celebration : c.accent)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(Spacing.md)
      .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(agree ? c.celebrationSoft : c.accentSoft))
      .padding(.vertical, Spacing.lg)
      .accessibilityElement(children: .combine)

      Card(padding: Spacing.xs) {
        ForEach(Array(rows.enumerated()), id: \.element.method) { index, row in
          let mine = row.method == reference
          if index > 0 { HairlineDivider().padding(.horizontal, Spacing.md) }
          VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: Spacing.sm) {
              Text(s["methods.\(row.method.rawValue).name"]).font(Typo.caption).foregroundStyle(c.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
              if mine {
                Tag(text: s["compare.yourChoice"], color: c.onPrimary, background: c.primary)
              } else if row.method == .ummalqura {
                Tag(text: s["settings.sunniTag"], color: c.textMuted, background: c.surfaceAlt)
              }
            }
            Text(formatHijri(row.hijri, lang)).font(Typo.title).foregroundStyle(c.text).padding(.vertical, Spacing.xs)
            HStack(spacing: Spacing.sm) {
              SourceBadge(source: row.source)
              Spacer(minLength: 0)
              if !mine {
                let text = row.offset == 0
                  ? s["compare.same"]
                  : s.t(row.offset > 0 ? "compare.ahead" : "compare.behind", ["days": countPhrase(.day, abs(row.offset), lang, afterPreposition: true)])
                Tag(
                  text: text,
                  color: row.offset == 0 ? c.celebration : c.accent,
                  background: row.offset == 0 ? c.celebrationSoft : c.accentSoft
                )
              }
            }
          }
          .padding(Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(mine ? c.primarySoft : .clear))
          .accessibilityElement(children: .combine)
        }
      }

      SectionLabel(text: s["compare.monthTitle"])
      Card(padding: Spacing.xs) {
        ForEach(Array(rows.enumerated()), id: \.element.method) { index, row in
          if index > 0 { HairlineDivider().padding(.horizontal, Spacing.md) }
          VStack(alignment: .leading, spacing: 2) {
            Text(s["methods.\(row.method.rawValue).short"]).font(Typo.bodyStrong).foregroundStyle(c.text)
            Text(s.t("compare.monthStarted", [
              "month": hijriMonthName(row.hijri.month, lang),
              "date": "\(weekdayName(weekdayOfJdn(row.monthStart), lang)) \(formatGregorian(jdnToGregorian(row.monthStart), lang))",
              "length": countPhrase(.day, row.monthLength, lang),
            ]))
            .font(Typo.body)
            .foregroundStyle(c.textMuted)
          }
          .padding(Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityElement(children: .combine)
        }
      }

      if opts.adjustment != 0 {
        HStack(alignment: .top, spacing: Spacing.sm) {
          LucideIcon(icon: .info, color: c.textMuted, size: 16)
          Text(s["compare.adjustmentNote"]).font(Typo.caption).foregroundStyle(c.textMuted)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.top, Spacing.lg)
      }
    }
    .datePickerSheet(
      isPresented: $picking,
      theme: theme,
      title: s["compare.date"],
      calendar: .gregorian,
      initial: ymd(gregorian),
      method: reference,
      onConfirm: { v in jdn = gregorianToJdn(v.year, v.month, v.day) }
    )
  }
}

// MARK: - Occasions

private enum OccasionFilter { case all, mourning, celebration }

private struct MonthGroup: Identifiable {
  let id: String
  let title: String
  var items: [UpcomingOccasion]
}

/// Tools → Occasions: every occasion in the coming Hijri year under the user's method, grouped by
/// Hijri month, with a countdown — and each one shareable as an image (the same card as the
/// converter's share, led by that occasion).
struct OccasionsView: View {
  @Environment(\.appTheme) private var theme
  @Environment(\.displayScale) private var displayScale
  @Environment(AppModel.self) private var model
  @State private var filter = OccasionFilter.all

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let groups = monthGroups(upcomingOccasions(todayJdn(), opts), lang)

    PageScreen(title: s["tools.occasions.title"], subtitle: s["tools.occasions.description"]) {
      SegmentedControl(
        options: [
          SegmentOption(value: OccasionFilter.all, label: s["occasions.all"], id: "occasions.all"),
          SegmentOption(value: OccasionFilter.mourning, label: s["occasions.mourning"], id: "occasions.mourning"),
          SegmentOption(value: OccasionFilter.celebration, label: s["occasions.celebration"], id: "occasions.celebration"),
        ],
        value: filter,
        onChange: { filter = $0 }
      )

      ForEach(groups) { group in
        SectionLabel(text: group.title)
        Card(padding: 0) {
          VStack(spacing: 0) {
            ForEach(Array(group.items.enumerated()), id: \.offset) { index, u in
              if index > 0 { HairlineDivider() }
              row(u, opts)
            }
          }
          .padding(.horizontal, Spacing.md)
          .padding(.vertical, Spacing.xs)
        }
      }
    }
  }

  private func monthGroups(_ all: [UpcomingOccasion], _ lang: Lang) -> [MonthGroup] {
    let list = switch filter {
    case .all: all
    case .mourning: all.filter { $0.occasion.kind == .mourning }
    case .celebration: all.filter { $0.occasion.kind == .celebration }
    }
    var groups: [MonthGroup] = []
    for u in list {
      let key = "\(u.day.hijri.year)-\(u.day.hijri.month)"
      if groups.last?.id != key {
        groups.append(MonthGroup(id: key, title: "\(hijriMonthName(u.day.hijri.month, lang)) \(localizeDigits(u.day.hijri.year, lang))", items: []))
      }
      groups[groups.count - 1].items.append(u)
    }
    return groups
  }

  private func row(_ u: UpcomingOccasion, _ opts: ConversionOptions) -> some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let name = u.occasion.name(lang)
    let style = KindStyle.of(u.occasion.kind, c)
    let soon = u.inDays <= 1
    let countdown = switch u.inDays {
    case 0: s["occasions.today"]
    case 1: s["occasions.tomorrow"]
    default: s.t("occasions.inDays", ["days": countPhrase(.day, u.inDays, lang, afterPreposition: true)])
    }
    return HStack(spacing: Spacing.md) {
      IconBadge(icon: style.icon, tint: style.fg, background: style.bg)
      VStack(alignment: .leading, spacing: 2) {
        Text(name).font(Typo.bodyStrong).foregroundStyle(c.text)
        Text(verbatim: "\(formatHijri(u.day.hijri, lang)) · \(weekdayName(u.day.weekday, lang)) \(formatGregorian(u.day.gregorian, lang))")
          .font(Typo.caption)
          .foregroundStyle(c.textMuted)
        Tag(text: countdown, color: soon ? c.onPrimary : c.primary, background: soon ? c.primary : c.primarySoft)
          .padding(.top, Spacing.xs)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)
      Button {
        share(u, opts)
      } label: {
        LucideIcon(icon: .share2, color: c.primary, size: 18)
          .frame(width: touchTarget, height: touchTarget)
          .background(Circle().fill(c.surfaceAlt))
      }
      .buttonStyle(PressScaleStyle())
      .accessibilityLabel(s.t("occasions.share", ["name": name]))
    }
    .padding(.vertical, Spacing.md)
  }

  private func share(_ u: UpcomingOccasion, _ opts: ConversionOptions) {
    let s = theme.strings
    let lang = theme.lang
    let name = u.occasion.name(lang)
    let weekday = weekdayName(u.day.weekday, lang)
    let hijri = formatHijri(u.day.hijri, lang)
    let gregorian = formatGregorian(u.day.gregorian, lang)
    let method = opts.method
    ShareImage.share(
      ShareCard(
        info: u.day,
        label: s["home.resultHijri"],
        date: hijri,
        detail: "\(weekday) · \(gregorian)",
        moon: moonPhaseOnDay(u.day.jdn),
        method: method,
        highlight: u.occasion
      ),
      theme: theme,
      scale: displayScale,
      message: "\(name)\n\(weekday)\(lang == .ar ? "، " : ", ")\(hijri) = \(gregorian)\n"
        + s.t("home.shareFooter", ["method": s["methods.\(method.rawValue).name"]]),
      filename: "HijriConverter-\(isoDate(u.day.gregorian))"
    )
  }
}

// MARK: - Days between

private enum BetweenField { case from, to }

/// Tools → Days between: the days between two dates, plus the same span in years/months/days of the
/// chosen calendar — handy for ages in Hijri years. Defaults to "since 1 Muharram of this Hijri
/// year".
struct DaysBetweenView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @State private var calendar = CalendarKind.hijri
  @State private var toJdn = todayJdn()
  @State private var fromJdn: Int?
  @State private var editing: BetweenField?

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let isHijri = calendar == .hijri
    let from = fromJdn ?? jdnOfHijri(HijriDate(hijriOfJdn(todayJdn(), opts).year, 1, 1), opts)
    let toYmd = { (jdn: Int) -> Ymd in isHijri ? ymd(hijriOfJdn(jdn, opts)) : ymd(jdnToGregorian(jdn)) }
    let fromYmd = { (v: Ymd) -> Int in
      isHijri ? jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) : gregorianToJdn(v.year, v.month, v.day)
    }
    let format = { (jdn: Int) -> String in
      isHijri ? formatHijri(hijriOfJdn(jdn, opts), lang) : formatGregorian(jdnToGregorian(jdn), lang)
    }
    let a = min(from, toJdn)
    let b = max(from, toJdn)
    let days = b - a
    let span = isHijri
      ? spanBetween(
        hijriOfJdn(a, opts),
        hijriOfJdn(b, opts),
        monthLength: { hijriMonthLength($0, $1, opts.method) },
        toJdn: { jdnFromHijri(HijriDate($0, $1, $2), opts.method) }
      )
      : spanBetween(jdnToGregorian(a), jdnToGregorian(b), monthLength: gregorianMonthLength, toJdn: { gregorianToJdn($0, $1, $2) })
    let weeks = days / 7
    let weeksText: String? = weeks > 0
      ? joinParts([countPhrase(.week, weeks, lang)] + (days % 7 > 0 ? [countPhrase(.day, days % 7, lang)] : []), lang)
      : nil

    PageScreen(title: s["between.title"], subtitle: s["tools.daysBetween.description"]) {
      Card {
        SegmentedControl(
          options: [
            SegmentOption(value: CalendarKind.hijri, label: s["common.hijri"], id: "between.hijri"),
            SegmentOption(value: CalendarKind.gregorian, label: s["common.gregorian"], id: "between.gregorian"),
          ],
          value: calendar,
          onChange: { calendar = $0 }
        )
        VStack(spacing: 0) {
          DateField(label: s["between.from"], value: format(from), minHeight: 56, id: "between.from", onTap: { editing = .from })
          // The swap button overlaps both fields.
          Button {
            fromJdn = toJdn
            toJdn = from
          } label: {
            LucideIcon(icon: .arrowDownUp, color: c.primary, size: 16)
              .frame(width: 36, height: 36)
              .background(Circle().fill(c.card))
              .overlay(Circle().stroke(c.border, lineWidth: 1))
          }
          .buttonStyle(PressScaleStyle())
          .accessibilityLabel(s["between.swap"])
          .accessibilityIdentifier("between.swap")
          .padding(.vertical, -10)
          .zIndex(2)
          DateField(
            label: s["between.to"],
            value: format(toJdn),
            minHeight: 56,
            id: "between.to",
            onTap: { editing = .to },
            onToday: toJdn != todayJdn() ? { toJdn = todayJdn() } : nil
          )
        }
        .padding(.top, Spacing.lg)

        VStack(spacing: 0) {
          Text(formatNumber(days, lang)).font(Typo.displayMedium).foregroundStyle(c.primary)
          Text(s["between.daysLabel"]).font(Typo.bodyStrong).foregroundStyle(c.text)
          Text(spanPhrase(span, lang)).font(Typo.body).foregroundStyle(c.text).padding(.top, Spacing.sm)
          if let weeksText {
            Text(verbatim: "≈ \(weeksText)").font(Typo.caption).foregroundStyle(c.textMuted)
          }
          if from > toJdn {
            Text(s["between.reversed"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.top, Spacing.xs)
          }
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.lg)
        .padding(.horizontal, Spacing.md)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.primarySoft))
        .padding(.top, Spacing.lg)
        .accessibilityElement(children: .combine)
      }
    }
    .datePickerSheet(
      isPresented: Binding(get: { editing != nil }, set: { if !$0 { editing = nil } }),
      theme: theme,
      title: editing == .to ? s["between.to"] : s["between.from"],
      calendar: calendar,
      initial: toYmd(editing == .to ? toJdn : from),
      method: opts.method,
      onConfirm: { v in
        if editing == .to { toJdn = fromYmd(v) } else { fromJdn = fromYmd(v) }
      }
    )
  }
}
