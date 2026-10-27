import HijriCore
import SwiftUI
import UIKit

/// Home = the Today card and the converter, nothing else (user request, 2026-10-26: no app name/icon
/// header, and every other feature lives on its own page under the Tools tab).
struct HomeView: View {
  @Environment(\.appTheme) private var theme
  @Environment(Navigator.self) private var navigator

  var body: some View {
    ScrollViewReader { proxy in
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          TodayCard(onPressMethod: { navigator.goToTab(TabIndex.settings) })
            .modifier(EnterFromBelow(delay: 0))
          ConverterSection(scrollToResult: {
            withAnimation(.easeInOut(duration: 0.35)) { proxy.scrollTo(resultAnchor, anchor: .top) }
          })
          .modifier(EnterFromBelow(delay: 0.08))
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.xxxl)
      }
      .scrollIndicators(.hidden)
    }
    .background(theme.colors.background)
  }
}

/// Fades in while rising 24 pt, once, unless Reduce Motion is on.
private struct EnterFromBelow: ViewModifier {
  let delay: Double
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown = false

  func body(content: Content) -> some View {
    let visible = shown || reduceMotion
    content
      .opacity(visible ? 1 : 0)
      .offset(y: visible ? 0 : 24)
      .onAppear { withAnimation(.easeOut(duration: 0.42).delay(delay)) { shown = true } }
  }
}

// MARK: - Today card

private let heroStars = [
  Star(x: 0.12, y: 0.03, radius: 1.6, opacity: 0.7),
  Star(x: 0.3, y: 0.04, radius: 1.1, opacity: 0.5),
  Star(x: 0.58, y: 0.06, radius: 1.3, opacity: 0.6),
  Star(x: 0.92, y: 0.6, radius: 1.2, opacity: 0.5),
]

/// Tonight's moon, beside the Gregorian date (the big Hijri date keeps the full width).
private let todayMoon: CGFloat = 64

/// Hero card: today in both calendars, tonight's real moon (the same disc as the converter result),
/// today's occasions, the Maghrib "eve" hint (the user chose midnight as the day change, with an
/// "eve of …" note after Maghrib — see HijriCore's Maghrib.swift), and the next upcoming occasion.
/// Re-evaluated every 30 s, so "today" and the eve hint roll over on their own.
struct TodayCard: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  let onPressMethod: () -> Void

  var body: some View {
    TimelineView(.periodic(from: .now, by: 30)) { _ in
      content(todaySummary(nowMillis(), model.conversion))
    }
  }

  private func content(_ summary: TodaySummary) -> some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let today = summary.today
    let moon = moonPhaseOnDay(today.jdn)
    let methodShort = s["methods.\(model.settings.method.rawValue).short"]
    let shape = RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
    return VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: Spacing.sm) {
        Text("\(s["home.today"]) · \(weekdayName(today.weekday, lang))")
          .font(Typo.label)
          .kerning(theme.isRtl ? 0 : 1)
          .foregroundStyle(c.onHeroMuted)
          .frame(maxWidth: .infinity, alignment: .leading)
        Button(action: onPressMethod) {
          HStack(spacing: 2) {
            Text(methodShort).font(Typo.caption).foregroundStyle(c.onHero)
            LucideIcon(icon: theme.isRtl ? .chevronLeft : .chevronRight, color: c.onHero, size: 14)
          }
          .padding(.horizontal, Spacing.md)
          .padding(.vertical, 6)
          .frame(minHeight: 32)
          .background(Capsule().fill(Color.white.opacity(0.16)))
          // 32 pt tall; the touch area reaches 48.
          .contentShape(Rectangle().inset(by: -8))
        }
        .buttonStyle(PressDimStyle())
        .accessibilityLabel(s.t("home.changeMethod", ["method": methodShort]))
        .accessibilityIdentifier("home.method")
      }
      .padding(.bottom, Spacing.md)

      Text(formatHijri(today.hijri, lang))
        .font(Typo.displayLarge)
        .foregroundStyle(c.onHero)
        .padding(.bottom, 2)
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier("home.todayHijri")
      HStack(spacing: Spacing.md) {
        VStack(alignment: .leading, spacing: Spacing.md) {
          Text(formatGregorian(today.gregorian, lang)).font(Typo.subtitle).foregroundStyle(c.onHeroMuted)
          SourceBadge(source: today.source, onDark: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        // The glow spills over; the disc lines up with the card's padding.
        MoonDisc(phase: moon, size: todayMoon).padding(-moonGlowMargin(todayMoon))
      }

      if !today.occasions.isEmpty {
        VStack(spacing: Spacing.sm) {
          ForEach(today.occasions, id: \.nameEn) { OccasionBadge(occasion: $0, onDark: true) }
        }
        .padding(.top, Spacing.md)
      }

      Rectangle().fill(Color.white.opacity(0.16)).frame(height: 0.5).padding(.vertical, Spacing.lg)

      InfoRow(icon: .moon) {
        Text(s.t("home.tonightMoon", [
          "phase": s["moon.phase.\(moon.name.rawValue)"],
          "percent": formatPercent(illuminationPercent(moon), lang),
        ]))
        .font(Typo.caption).foregroundStyle(c.onHeroMuted)
      }

      if let eve = summary.eve {
        InfoRow(icon: .moonStar) {
          Text(s.t("home.eveOf", ["date": formatHijri(eve.hijri, lang)])).font(Typo.bodyStrong).foregroundStyle(c.onHero)
          if !eve.occasions.isEmpty {
            Text(eve.occasions.map { $0.name(lang) }.joined(separator: " · ")).font(Typo.caption).foregroundStyle(c.heroGold)
          }
          Text(s["home.eveHint"]).font(Typo.caption).foregroundStyle(c.onHeroMuted)
        }
      } else if let maghrib = summary.maghrib {
        InfoRow(icon: .sunset) {
          Text(s.t("home.maghribAt", ["time": formatTime(maghrib, lang)])).font(Typo.caption).foregroundStyle(c.onHeroMuted)
        }
      }

      if let next = summary.next {
        let when = next.inDays == 1
          ? s["home.tomorrow"]
          : s.t("home.inDays", ["days": countPhrase(.day, next.inDays, lang, afterPreposition: true)])
        InfoRow(icon: .calendarClock) {
          Text(s.t("home.nextOccasion", ["name": next.day.occasions.map { $0.name(lang) }.joined(separator: " · "), "when": when]))
            .font(Typo.caption).foregroundStyle(c.onHeroMuted)
        }
      }
    }
    .padding(Spacing.xl)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(HeroGradient(from: c.heroFrom, to: c.heroTo, stars: heroStars))
    .clipShape(shape)
    .shadow(color: c.cardShadow, radius: 5, y: 2)
  }
}

private struct InfoRow<Content: View>: View {
  @Environment(\.appTheme) private var theme
  let icon: Lucide
  @ViewBuilder let content: Content

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.sm) {
      LucideIcon(icon: icon, color: theme.colors.heroGold, size: 18)
      VStack(alignment: .leading, spacing: 2) { content }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.top, Spacing.xs)
    .accessibilityElement(children: .combine)
  }
}

// MARK: - Converter

private enum Direction { case toHijri, toGregorian }

/// `run` is bumped on every Convert press so the result fades in even when the date didn't change.
private struct Conversion: Equatable {
  let jdn: Int
  let direction: Direction
  let run: Int
}

/// How long the result card shows its loading state. The lookup itself takes well under a
/// millisecond; this keeps the feedback readable instead of a one-frame flicker, and lets the scroll
/// to the result finish first.
private let minConverting: Duration = .milliseconds(550)

/// Scroll target just above the result card (the arrow bubble's top), so the card lands a little
/// below the top edge.
private let resultAnchor = "home.resultAnchor"

/// The converter. The wheels edit a *draft* (a JDN — one day on the shared timeline — plus the
/// direction); nothing is converted while they turn (user request: convert on demand, not on every
/// change). "Convert" scrolls Home to the result card, shows a loading state there, then applies the
/// draft. The result card always shows the last *applied* conversion and says so when the wheels
/// have moved since, so it never silently disagrees with them.
///
/// Switching direction keeps the draft's day; changing method/adjustment in Settings re-labels the
/// applied result instantly (same day, new authority).
struct ConverterSection: View {
  @Environment(\.appTheme) private var theme
  @Environment(\.displayScale) private var displayScale
  @Environment(AppModel.self) private var model
  @Environment(Navigator.self) private var navigator
  let scrollToResult: () -> Void

  @State private var direction = Direction.toHijri
  @State private var draftJdn = todayJdn()
  @State private var applied = Conversion(jdn: todayJdn(), direction: .toHijri, run: 0)
  @State private var converting = false

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let opts = model.conversion

    // Draft (wheels)
    let inputIsHijri = direction == .toGregorian
    let inputValue: Ymd = {
      if inputIsHijri {
        let h = hijriOfJdn(draftJdn, opts)
        return Ymd(year: h.year, month: h.month, day: h.day)
      }
      let g = jdnToGregorian(draftJdn)
      return Ymd(year: g.year, month: g.month, day: g.day)
    }()
    let draftIsToday = draftJdn == todayJdn()

    VStack(alignment: .leading, spacing: 0) {
      SectionLabel(text: s["home.convert"])
      Card {
        SegmentedControl(
          options: [
            SegmentOption(value: Direction.toHijri, label: s["home.toHijri"], icon: .moon, id: "home.toHijri"),
            SegmentOption(value: Direction.toGregorian, label: s["home.toGregorian"], icon: .sun, id: "home.toGregorian"),
          ],
          value: direction,
          onChange: { direction = $0 }
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel(s["home.direction"])
        Text(inputIsHijri ? s["home.pickHijri"] : s["home.pickGregorian"])
          .font(Typo.caption)
          .foregroundStyle(c.textMuted)
          .padding(.top, Spacing.md)
          .padding(.bottom, Spacing.sm)
        DateWheels(
          calendar: inputIsHijri ? .hijri : .gregorian,
          value: inputValue,
          onChange: { v in
            draftJdn = inputIsHijri ? jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) : gregorianToJdn(v.year, v.month, v.day)
          },
          method: opts.method
        )
        WeightedRow(weights: [1, 1.6], spacing: Spacing.md) {
          ActionButton(icon: .calendarCheck2, label: s["home.goToToday"], background: .clear, color: c.primary, border: c.border, id: "home.today") {
            draftJdn = todayJdn()
          }
          .disabled(draftIsToday)
          ActionButton(
            icon: .arrowLeftRight,
            label: converting ? s["home.converting"] : s["home.convertButton"],
            background: c.primary,
            color: c.onPrimary,
            busy: converting,
            hint: s["home.convertHint"],
            id: "home.convert",
            action: convert
          )
          .disabled(converting)
        }
        .padding(.top, Spacing.md)
      }

      Color.clear.frame(height: 0).id(resultAnchor)
      // The arrow overlaps the cards above and below; drawn over both.
      LucideIcon(icon: .arrowDown, color: c.onPrimary, size: 18)
        .frame(width: 36, height: 36)
        .background(Circle().fill(c.primary).shadow(color: .black.opacity(0.25), radius: 4, y: 2))
        .frame(maxWidth: .infinity)
        .padding(.vertical, -Spacing.md)
        .zIndex(2)
        .accessibilityHidden(true)

      Card {
        if converting {
          ResultSkeleton()
        } else {
          result(opts)
            .id(applied.run)
            .transition(.opacity)
        }
      }
    }
  }

  private func convert() {
    guard !converting else { return }
    converting = true
    scrollToResult()
    let next = Conversion(jdn: draftJdn, direction: direction, run: applied.run + 1)
    Task {
      try? await Task.sleep(for: minConverting)
      withAnimation(.easeOut(duration: 0.28)) {
        applied = next
        converting = false
      }
    }
  }

  /// The applied result — recomputed only from the applied conversion (and the method).
  private func result(_ opts: ConversionOptions) -> some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let info = dayInfo(applied.jdn, opts)
    let isStale = draftJdn != applied.jdn || direction != applied.direction
    let outputIsGregorian = applied.direction == .toGregorian
    let weekday = weekdayName(info.weekday, lang)
    let hijriText = formatHijri(info.hijri, lang)
    let gregorianText = formatGregorian(info.gregorian, lang)
    let resultText = outputIsGregorian ? gregorianText : hijriText
    let inputText = outputIsGregorian ? hijriText : gregorianText
    let sentence = "\(weekday)\(lang == .ar ? "، " : ", ")\(inputText) = \(resultText)"
    let label = outputIsGregorian ? s["home.resultGregorian"] : s["home.resultHijri"]
    let detail = "\(weekday) · \(inputText)"
    // The real Moon that evening — depends on the day only, not on the method/adjustment.
    let moon = moonPhaseOnDay(applied.jdn)
    let method = opts.method

    return VStack(alignment: .leading, spacing: 0) {
      if isStale {
        HStack(spacing: Spacing.sm) {
          LucideIcon(icon: .info, color: c.accent, size: 16)
          Text(s["home.staleResult"])
            .font(Typo.caption)
            .foregroundStyle(c.accent)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.accentSoft))
        .padding(.bottom, Spacing.md)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("home.stale")
      }
      ResultPanel(label: label, date: resultText, detail: detail, moon: moon, interactive: true)
      // Same row as the badge, so the result card doesn't grow (Home stays short).
      HStack(spacing: Spacing.sm) {
        SourceBadge(source: info.source)
        Spacer(minLength: 0)
        Button {
          navigator.push(.compareOffices(jdn: applied.jdn))
        } label: {
          HStack(spacing: 4) {
            LucideIcon(icon: .scale, color: c.primary, size: 16)
            Text(s["home.compareOffices"]).font(Typo.caption).foregroundStyle(c.primary)
            LucideIcon(icon: theme.isRtl ? .chevronLeft : .chevronRight, color: c.primary, size: 16)
          }
          .frame(minHeight: 40)
          .padding(.horizontal, Spacing.xs)
          .contentShape(Rectangle().inset(by: -4))
        }
        .buttonStyle(PressDimStyle())
        .accessibilityIdentifier("home.compare")
      }
      .padding(.top, Spacing.md)
      if !info.occasions.isEmpty {
        VStack(spacing: Spacing.sm) {
          ForEach(info.occasions, id: \.nameEn) { OccasionBadge(occasion: $0) }
        }
        .padding(.top, Spacing.md)
      }
      HStack(spacing: Spacing.md) {
        ActionButton(icon: .copy, label: s["home.copy"], background: c.primarySoft, color: c.primary, id: "home.copy") {
          UIPasteboard.general.string = sentence
          Toasts.shared.show(s["home.copied"])
        }
        ActionButton(icon: .share2, label: s["home.share"], background: c.primary, color: c.onPrimary, hint: s["home.shareHint"], id: "home.share") {
          // The image with the sentence as its caption; the caption alone if the image can't be made.
          ShareImage.share(
            ShareCard(info: info, label: label, date: resultText, detail: detail, moon: moon, method: method),
            theme: theme,
            scale: displayScale,
            message: "\(sentence)\n\(s.t("home.shareFooter", ["method": s["methods.\(method.rawValue).name"]]))",
            filename: "HijriConverter-\(isoDate(info.gregorian))"
          )
        }
      }
      .padding(.top, Spacing.lg)
    }
  }
}

/// A 48 pt button with an icon (or a spinner while `busy`) and a label. A busy button doesn't dim.
private struct ActionButton: View {
  let icon: Lucide
  let label: String
  let background: Color
  let color: Color
  var border: Color?
  var busy = false
  var hint: String?
  let id: String
  let action: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
    Button(action: action) {
      HStack(spacing: Spacing.sm) {
        if busy {
          ProgressView().tint(color).controlSize(.small)
        } else {
          LucideIcon(icon: icon, color: color, size: 18)
        }
        Text(label).font(Typo.bodyStrong).foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.8)
      }
      .padding(.horizontal, Spacing.sm)
      .frame(maxWidth: .infinity, minHeight: touchTarget)
      .background(shape.fill(background))
      .overlay(shape.stroke(border ?? .clear, lineWidth: 1))
    }
    .buttonStyle(PressScaleStyle(dimWhenDisabled: !busy))
    .accessibilityHint(hint ?? "")
    .accessibilityIdentifier(id)
  }
}

// MARK: - Result card parts

/// Faint stars on the night panel, kept off the moon's side of the moon row.
private let skyStars = [
  Star(x: 0.9, y: 0.08, radius: 1.2, opacity: 0.6),
  Star(x: 0.72, y: 0.16, radius: 0.9, opacity: 0.4),
  Star(x: 0.95, y: 0.34, radius: 1, opacity: 0.45),
  Star(x: 0.56, y: 0.05, radius: 0.8, opacity: 0.35),
  Star(x: 0.86, y: 0.62, radius: 0.9, opacity: 0.4),
]

/// The converted date, large, over the Moon as it looks that evening — the heart of the result card,
/// and the same view the share image is drawn from (ShareCard), so what's shared is exactly what's
/// on screen. Always dark, in both themes: the moon only reads as real on a night sky.
struct ResultPanel: View {
  @Environment(\.appTheme) private var theme
  let label: String
  let date: String
  let detail: String
  let moon: MoonPhase
  var interactive = false

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let name = s["moon.phase.\(moon.name.rawValue)"]
    let illumination = s.t("moon.illumination", ["percent": formatPercent(illuminationPercent(moon), lang)])
    let age = s.t("moon.age", ["days": formatDecimal(moon.age, lang)])
    VStack(alignment: .leading, spacing: 0) {
      // Letter spacing breaks Arabic joining, so only the Latin label gets it.
      Text(label).font(Typo.label).kerning(theme.isRtl ? 0 : 1).foregroundStyle(c.onHeroMuted)
      dateText(c)
      Text(detail).font(Typo.body).foregroundStyle(c.onHeroMuted)
      Rectangle().fill(Color.white.opacity(0.16)).frame(height: 0.5).padding(.vertical, Spacing.md)
      HStack(spacing: Spacing.lg) {
        // The glow spills into the padding; the disc itself lines up with the text above.
        MoonDisc(phase: moon).padding(-moonGlowMargin(moonSize))
        VStack(alignment: .leading, spacing: 2) {
          Text(name).font(Typo.subtitle).foregroundStyle(c.heroGold)
          Text(illumination).font(Typo.body).foregroundStyle(c.onHero)
          Text(age).font(Typo.caption).foregroundStyle(c.onHeroMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .accessibilityElement(children: .combine)
    }
    .padding(Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(HeroGradient(from: Brand.night, to: c.heroFrom, stars: skyStars))
    .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
  }

  @ViewBuilder private func dateText(_ c: AppColors) -> some View {
    let text = Text(date)
      .font(Typo.displayLarge)
      .foregroundStyle(c.onHero)
      .padding(.top, Spacing.xs)
      .accessibilityIdentifier("result.date")
    if interactive { text.textSelection(.enabled) } else { text }
  }
}

/// Placeholder for the result card while a conversion runs: a pulsing panel shaped like the night
/// panel it replaces, so the card barely changes height, plus a spinner with "Converting…".
struct ResultSkeleton: View {
  @Environment(\.appTheme) private var theme
  @State private var pulse = false

  var body: some View {
    let c = theme.colors
    let fill = c.textMuted.opacity(0.22)
    let bar = { (fraction: CGFloat, height: CGFloat) in SkeletonBar(fraction: fraction, height: height, color: fill) }
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: Spacing.sm) {
          bar(0.34, 12)
          bar(0.82, 34)
          bar(0.6, 16)
          HStack(spacing: Spacing.lg) {
            Circle().fill(fill).frame(width: moonSize, height: moonSize)
            VStack(alignment: .leading, spacing: Spacing.sm) {
              bar(0.7, 18)
              bar(0.55, 16)
              bar(0.62, 12)
            }
          }
          .padding(.top, Spacing.md * 2 + 1 - Spacing.sm)
        }
        .padding(Spacing.lg)
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(c.border, lineWidth: 1))
        RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(fill)
          .frame(width: 112, height: 26)
          .padding(.top, Spacing.md)
      }
      .opacity(pulse ? 1 : 0.45)
      HStack(spacing: Spacing.sm) {
        ProgressView().tint(c.primary).controlSize(.small)
        Text(theme.strings["home.converting"]).font(Typo.bodyStrong).foregroundStyle(c.primary)
      }
      .frame(minHeight: touchTarget)
      .padding(.top, Spacing.lg)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(theme.strings["home.converting"])
    .onAppear {
      withAnimation(.easeInOut(duration: 0.65).repeatForever(autoreverses: true)) { pulse = true }
    }
  }
}

/// A placeholder bar `fraction` of the available width wide, from the leading edge.
private struct SkeletonBar: View {
  let fraction: CGFloat
  let height: CGFloat
  let color: Color

  var body: some View {
    GeometryReader { g in
      RoundedRectangle(cornerRadius: Radius.sm, style: .continuous)
        .fill(color)
        .frame(width: g.size.width * fraction)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(height: height)
  }
}

/// Width of the shared image in points (rendered at the screen's scale, ~1000 px on most phones).
private let shareWidth: CGFloat = 360

/// What "Share" turns into an image: the result card as the user sees it (night panel with the moon,
/// source badge, occasions) with the calculation method as a footer — no app name or icon (user
/// request, 2026-10-26). A border instead of a shadow.
struct ShareCard: View {
  @Environment(\.appTheme) private var theme
  let info: DayInfo
  let label: String
  let date: String
  let detail: String
  let moon: MoonPhase
  let method: MethodId
  var highlight: Occasion?

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let others = info.occasions.filter { $0 != highlight }
    let shape = RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
    VStack(alignment: .leading, spacing: Spacing.md) {
      VStack(alignment: .leading, spacing: Spacing.md) {
        if let highlight { OccasionBadge(occasion: highlight) }
        ResultPanel(label: label, date: date, detail: detail, moon: moon)
        SourceBadge(source: info.source)
        if !others.isEmpty {
          VStack(spacing: Spacing.sm) {
            ForEach(others, id: \.nameEn) { OccasionBadge(occasion: $0) }
          }
        }
      }
      .padding(Spacing.lg)
      .background(shape.fill(c.card))
      .overlay(shape.stroke(c.border, lineWidth: 1))
      Text(s.t("home.shareMethod", ["method": s["methods.\(method.rawValue).name"]]))
        .font(Typo.caption)
        .foregroundStyle(c.textMuted)
    }
    .padding(Spacing.xl)
    .frame(width: shareWidth, alignment: .leading)
    .background(c.background)
  }
}
