import HijriCore
import SwiftUI

/// A small icon + caption line under a field or a card's content.
private struct Note: View {
  @Environment(\.appTheme) private var theme
  let icon: Lucide
  let text: String
  var color: Color?

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.sm) {
      LucideIcon(icon: icon, color: theme.colors.textMuted, size: 14).padding(.top, 2)
      Text(text).font(Typo.caption).foregroundStyle(color ?? theme.colors.textMuted)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

private func ymdOf(_ date: some YmdDate) -> Ymd { Ymd(year: date.year, month: date.month, day: date.day) }

// MARK: - Hijri birthday

/// Where the picker opens when no birth date is saved yet.
private let defaultAgeDays = 30 * 365

/// Tools → Hijri birthday: the birth date in the Hijri calendar, the next Hijri birthday (with a
/// countdown and its Gregorian date — it moves ~11 days earlier every Gregorian year) and the age in
/// Hijri vs Gregorian years. The birth date can be entered in either calendar and is kept on the
/// phone only (settings).
struct BirthdayView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @State private var calendar = CalendarKind.gregorian
  @State private var picking = false

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let birthJdn = model.settings.birthJdn
    let today = todayJdn()
    let info = birthJdn.flatMap { $0 <= today ? hijriBirthday($0, today, opts) : nil }
    let isHijri = calendar == .hijri
    let fieldValue = birthJdn.map {
      isHijri ? formatHijri(hijriOfJdn($0, opts), lang) : formatGregorian(jdnToGregorian($0), lang)
    } ?? s["birthday.notSet"]
    let dateLine = { (jdn: Int) in "\(weekdayName(weekdayOfJdn(jdn), lang)) \(formatGregorian(jdnToGregorian(jdn), lang))" }
    let pickerJdn = birthJdn ?? today - defaultAgeDays

    PageScreen(title: s["tools.birthday.title"], subtitle: s["tools.birthday.description"]) {
      Text(s["birthday.enterIn"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.bottom, Spacing.sm)
      SegmentedControl(
        options: [
          SegmentOption(value: CalendarKind.gregorian, label: s["common.gregorian"], id: "birthday.gregorian"),
          SegmentOption(value: CalendarKind.hijri, label: s["common.hijri"], id: "birthday.hijri"),
        ],
        value: calendar,
        onChange: { calendar = $0 }
      )
      DateField(label: s["birthday.birthDate"], value: fieldValue, id: "birthday.date", onTap: { picking = true })
        .padding(.top, Spacing.md)
      Note(icon: .lock, text: s["birthday.private"]).padding(.top, Spacing.sm)

      if let birthJdn, birthJdn > today {
        Text(s["birthday.future"]).font(Typo.body).foregroundStyle(c.mourning).padding(.top, Spacing.lg)
      }

      if let info, let birthJdn {
        SectionLabel(text: s["birthday.nextTitle"])
        Card {
          HStack(spacing: Spacing.md) {
            LucideIcon(icon: .cake, color: c.accent, size: 26)
              .frame(width: 52, height: 52)
              .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.accentSoft))
            VStack(alignment: .leading, spacing: 0) {
              Text(
                info.next.inDays == 0
                  ? s["birthday.today"]
                  : info.next.inDays == 1
                    ? s["birthday.tomorrow"]
                    : s.t("birthday.inDays", ["days": countPhrase(.day, info.next.inDays, lang, afterPreposition: true)])
              )
              .font(Typo.displayMedium)
              .foregroundStyle(c.primary)
              Text(s.t("birthday.turning", ["age": localizeDigits(info.next.turning, lang)])).font(Typo.body).foregroundStyle(c.text)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .accessibilityElement(children: .combine)
          HairlineDivider().padding(.vertical, Spacing.md)
          Text(formatHijri(info.next.hijri, lang)).font(Typo.title).foregroundStyle(c.text)
          Text(dateLine(info.next.jdn)).font(Typo.body).foregroundStyle(c.textMuted)
          if info.next.clamped {
            Note(icon: .info, text: s.t("birthday.clamped", ["month": hijriMonthName(info.next.hijri.month, lang)]))
              .padding(.top, Spacing.sm)
          }
        }

        SectionLabel(text: s["birthday.bornTitle"])
        Card {
          Text(formatHijri(info.birthHijri, lang)).font(Typo.title).foregroundStyle(c.text)
          Text(dateLine(birthJdn)).font(Typo.body).foregroundStyle(c.textMuted)
        }

        SectionLabel(text: s["birthday.ageTitle"])
        Card {
          Text(s["birthday.hijriAge"]).font(Typo.caption).foregroundStyle(c.textMuted)
          Text(spanPhrase(info.hijriAge, lang)).font(Typo.subtitle).foregroundStyle(c.text).padding(.bottom, Spacing.md)
          Text(s["birthday.gregorianAge"]).font(Typo.caption).foregroundStyle(c.textMuted)
          Text(spanPhrase(info.gregorianAge, lang)).font(Typo.subtitle).foregroundStyle(c.text)
          Text(s["birthday.why"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.top, Spacing.md)
        }

        Button {
          model.update { $0.birthJdn = nil }
        } label: {
          Text(s["birthday.forget"]).font(Typo.bodyStrong).foregroundStyle(c.mourning)
            .frame(maxWidth: .infinity, minHeight: touchTarget)
        }
        .buttonStyle(PressDimStyle())
        .padding(.top, Spacing.lg)
        .accessibilityIdentifier("birthday.forget")
      }
    }
    .datePickerSheet(
      isPresented: $picking,
      theme: theme,
      title: s["birthday.birthDate"],
      calendar: calendar,
      initial: isHijri ? ymdOf(hijriOfJdn(pickerJdn, opts)) : ymdOf(jdnToGregorian(pickerJdn)),
      method: opts.method,
      onConfirm: { v in
        let jdn = isHijri ? jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) : gregorianToJdn(v.year, v.month, v.day)
        model.update { $0.birthJdn = jdn }
      }
    )
  }
}

// MARK: - Fasting days

/// Shown by default: this Hijri month and the next two; "Show the whole year" extends to 12.
private let shortMonths = 3
private let yearMonths = 12

private struct FastingMonth: Identifiable {
  let id: String
  let year: Int
  let month: Int
  let title: String
  var days: [FastingDay]
}

/// Tools → Fasting days: the recommended (mustahab) fasts coming up, grouped by Hijri month under the
/// user's method, with countdowns. A list only — no reminders (user's choice, 2026-10-26). Rules and
/// sources: HijriCore's Fasting.swift.
struct FastingView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @State private var wholeYear = false

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let groups = months(opts, lang)
    let gregorianOf = { (jdn: Int) in formatGregorian(jdnToGregorian(jdn), lang) }

    PageScreen(title: s["tools.fasting.title"], subtitle: s["tools.fasting.description"]) {
      ForEach(groups) { group in
        SectionLabel(text: group.title)
        if wholeMonths.contains(group.month) {
          let last = hijriMonthLength(group.year, group.month, opts.method)
          HStack(spacing: Spacing.sm) {
            LucideIcon(icon: .sparkles, color: c.celebration, size: 18)
            VStack(alignment: .leading, spacing: 0) {
              Text(s[group.month == 7 ? "fasting.rajab" : "fasting.shaban"]).font(Typo.bodyStrong).foregroundStyle(c.celebration)
              Text(s.t("fasting.range", [
                "from": gregorianOf(jdnOfHijri(HijriDate(group.year, group.month, 1), opts)),
                "to": gregorianOf(jdnOfHijri(HijriDate(group.year, group.month, last), opts)),
              ]))
              .font(Typo.caption)
              .foregroundStyle(c.celebration)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(Spacing.md)
          .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.celebrationSoft))
          .padding(.bottom, Spacing.sm)
          .accessibilityElement(children: .combine)
        }
        Card(padding: 0) {
          VStack(spacing: 0) {
            ForEach(Array(group.days.enumerated()), id: \.element.day.jdn) { index, f in
              if index > 0 { HairlineDivider() }
              row(f, gregorianOf)
            }
          }
          .padding(.horizontal, Spacing.md)
          .padding(.vertical, Spacing.xs)
        }
      }

      if !wholeYear {
        Button {
          wholeYear = true
        } label: {
          Text(s["fasting.showYear"]).font(Typo.bodyStrong).foregroundStyle(c.primary)
            .frame(maxWidth: .infinity, minHeight: touchTarget)
        }
        .buttonStyle(PressDimStyle())
        .padding(.top, Spacing.md)
        .accessibilityIdentifier("fasting.showYear")
      }

      SectionLabel(text: s["fasting.notesTitle"])
      Card {
        VStack(alignment: .leading, spacing: Spacing.md) {
          ForEach(["forbidden", "ashura", "conditions"], id: \.self) { key in
            Note(icon: .info, text: s["fasting.note.\(key)"], color: c.text)
          }
          Note(icon: .bookOpen, text: s["fasting.note.sources"])
        }
      }
    }
  }

  private func months(_ opts: ConversionOptions, _ lang: Lang) -> [FastingMonth] {
    let today = todayJdn()
    let end = monthsAhead(today, wholeYear ? yearMonths : shortMonths, opts)
    var groups: [FastingMonth] = []
    for f in fastingDays(today, end, opts) {
      let key = "\(f.day.hijri.year)-\(f.day.hijri.month)"
      if groups.last?.id != key {
        groups.append(FastingMonth(
          id: key,
          year: f.day.hijri.year,
          month: f.day.hijri.month,
          title: "\(hijriMonthName(f.day.hijri.month, lang)) \(localizeDigits(f.day.hijri.year, lang))",
          days: []
        ))
      }
      groups[groups.count - 1].days.append(f)
    }
    return groups
  }

  private func row(_ f: FastingDay, _ gregorianOf: (Int) -> String) -> some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let abstain = f.reasons.contains(.ashuraAbstain)
    let arafahCaution = f.reasons.contains(.arafah) && f.day.source != .official
    let fg = abstain ? c.mourning : c.primary
    let countdown = switch f.inDays {
    case 0: s["occasions.today"]
    case 1: s["occasions.tomorrow"]
    default: s.t("occasions.inDays", ["days": countPhrase(.day, f.inDays, lang, afterPreposition: true)])
    }
    return HStack(spacing: Spacing.md) {
      VStack(spacing: 0) {
        Text(localizeDigits(f.day.hijri.day, lang)).font(Typo.title).foregroundStyle(fg)
        Text(weekdayName(f.day.weekday, lang)).font(Typo.caption).foregroundStyle(fg).lineLimit(1)
      }
      .frame(width: 84)
      .padding(.vertical, Spacing.xs)
      .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(abstain ? c.mourningSoft : c.primarySoft))
      VStack(alignment: .leading, spacing: 0) {
        ForEach(f.reasons, id: \.self) { r in
          HStack(spacing: Spacing.xs) {
            Text(s["fasting.reason.\(r.rawValue)"]).font(Typo.bodyStrong).foregroundStyle(abstain ? c.mourning : c.text)
            if sistaniOnly.contains(r) { Tag(text: s["fasting.sistani"], color: c.textMuted, background: c.surfaceAlt) }
          }
        }
        Text(gregorianOf(f.day.jdn)).font(Typo.caption).foregroundStyle(c.textMuted)
        if arafahCaution {
          HStack(alignment: .top, spacing: Spacing.xs) {
            LucideIcon(icon: .triangleAlert, color: c.accent, size: 14).padding(.top, 2)
            Text(s["fasting.arafahCaution"]).font(Typo.caption).foregroundStyle(c.accent)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(.top, Spacing.xs)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Tag(text: countdown, color: f.inDays <= 1 ? c.onPrimary : c.primary, background: f.inDays <= 1 ? c.primary : c.primarySoft)
    }
    .padding(.vertical, Spacing.md)
    .accessibilityElement(children: .combine)
  }
}

// MARK: - Crescent forecast

/// How many month starts ahead the stepper goes.
private let maxAhead = 11

private func addMonths(_ m: YearMonth, _ n: Int) -> YearMonth {
  let index = m.year * 12 + (m.month - 1) + n
  return YearMonth(year: floorDiv(index, 12), month: floorMod(index, 12) + 1)
}

/// Tools → Crescent forecast: can the new crescent be seen on the evenings of the 29th and 30th,
/// from Beirut (Fadlallah's reference), Najaf (Sistani) and Iran (best of the 6 cities the Iran
/// prediction uses)? Odeh's criterion, run on the phone (HijriCore's Crescent.swift — the same rule
/// the month tables are built with), plus each office's expected 1st of the new month. The
/// astronomy runs off the main thread, with a "Calculating…" state.
struct CrescentView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @State private var ahead = 0
  @State private var forecast: MonthStartForecast?

  private struct Key: Equatable {
    let ending: YearMonth
    let opts: ConversionOptions
  }

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    let opts = model.conversion
    let currentHijri = hijriOfJdn(todayJdn(), opts)
    let ending = addMonths(YearMonth(year: currentHijri.year, month: currentHijri.month), ahead)
    let starting = addMonths(ending, 1)
    let monthTitle = { (m: YearMonth) in "\(hijriMonthName(m.month, lang)) \(localizeDigits(m.year, lang))" }
    let dateOf = { (jdn: Int) in "\(weekdayName(weekdayOfJdn(jdn), lang)) \(formatGregorian(jdnToGregorian(jdn), lang))" }

    PageScreen(title: s["tools.crescent.title"], subtitle: s["tools.crescent.description"]) {
      HStack(spacing: Spacing.sm) {
        stepButton(theme.isRtl ? .chevronRight : .chevronLeft, s["crescent.previous"], id: "crescent.previous") {
          ahead = max(0, ahead - 1)
        }
        .disabled(ahead == 0)
        VStack(spacing: 0) {
          Text(s.t("crescent.startOf", ["month": monthTitle(starting)])).font(Typo.title).foregroundStyle(c.text)
            .accessibilityAddTraits(.isHeader)
          Text(s.t("crescent.endOf", ["month": monthTitle(ending)])).font(Typo.caption).foregroundStyle(c.textMuted)
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        stepButton(theme.isRtl ? .chevronLeft : .chevronRight, s["crescent.next"], id: "crescent.next") {
          ahead = min(maxAhead, ahead + 1)
        }
        .disabled(ahead == maxAhead)
      }

      if let forecast, forecast.ending == ending {
        content(forecast, starting: starting, dateOf: dateOf)
      } else {
        VStack(spacing: Spacing.sm) {
          ProgressView().tint(c.primary)
          Text(s["crescent.calculating"]).font(Typo.caption).foregroundStyle(c.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
      }
    }
    .task(id: Key(ending: ending, opts: opts)) {
      forecast = nil
      let result = await Task.detached(priority: .userInitiated) { monthStartForecast(ending, opts) }.value
      if !Task.isCancelled { forecast = result }
    }
  }

  @ViewBuilder
  private func content(_ f: MonthStartForecast, starting: YearMonth, dateOf: @escaping (Int) -> String) -> some View {
    let c = theme.colors
    let s = theme.strings
    let lang = theme.lang
    if let at = f.conjunction {
      let local = localDate(at)
      HStack(spacing: Spacing.md) {
        LucideIcon(icon: .moonStar, color: c.primary, size: 20)
        VStack(alignment: .leading, spacing: 0) {
          Text(s["crescent.conjunction"]).font(Typo.caption).foregroundStyle(c.primary)
          Text(s.t("crescent.conjunctionAt", [
            "date": "\(weekdayName(weekdayOfJdn(gregorianToJdn(local)), lang)) \(formatGregorian(local, lang))",
            "time": formatTime(at, lang),
          ]))
          .font(Typo.bodyStrong)
          .foregroundStyle(c.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(Spacing.md)
      .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(c.primarySoft))
      .padding(.top, Spacing.lg)
      .accessibilityElement(children: .combine)
    }

    ForEach(f.evenings, id: \.jdn) { evening in
      SectionLabel(text: s.t("crescent.evening", [
        "day": localizeDigits(evening.monthDay, lang),
        "month": hijriMonthName(f.ending.month, lang),
        "date": dateOf(evening.jdn),
      ]))
      Card(padding: 0) {
        VStack(spacing: 0) {
          place(s["crescent.place.beirut"], s["crescent.hint.beirut"], evening.beirut)
          HairlineDivider()
          place(s["crescent.place.najaf"], s["crescent.hint.najaf"], evening.najaf)
          HairlineDivider()
          place(
            s.t("crescent.place.iran", ["city": s["crescent.city.\(evening.iran.key)"]]),
            s["crescent.hint.iran"],
            evening.iran.report
          )
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.xs)
      }
    }

    SectionLabel(text: s.t("crescent.expected", ["month": hijriMonthName(starting.month, lang)]))
    Card(padding: 0) {
      VStack(spacing: 0) {
        ForEach(Array(f.starts.enumerated()), id: \.element.method) { index, start in
          if index > 0 { HairlineDivider() }
          HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 0) {
              Text(s["methods.\(start.method.rawValue).short"]).font(Typo.bodyStrong).foregroundStyle(c.text)
              Text(dateOf(start.jdn)).font(Typo.caption).foregroundStyle(c.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            SourceBadge(source: start.source)
          }
          .padding(.vertical, Spacing.md)
          .accessibilityElement(children: .combine)
        }
      }
      .padding(.horizontal, Spacing.md)
      .padding(.vertical, Spacing.xs)
    }

    Note(icon: .info, text: s["crescent.how"]).padding(.top, Spacing.lg)
  }

  private func place(_ name: String, _ hint: String, _ report: CrescentReport) -> some View {
    let c = theme.colors
    let s = theme.strings
    let (fg, bg): (Color, Color) = switch report.visibility {
    case .nakedEye: (c.celebration, c.celebrationSoft)
    case .opticalMaybeEye: (c.primary, c.primarySoft)
    case .opticalOnly: (c.accent, c.accentSoft)
    default: (c.textMuted, c.surfaceAlt)
    }
    return VStack(alignment: .leading, spacing: 4) {
      Text(name).font(Typo.bodyStrong).foregroundStyle(c.text)
      Tag(text: s["crescent.visibility.\(report.visibility.rawValue)"], color: fg, background: bg)
      if let text = details(report) {
        Text(text).font(Typo.caption).foregroundStyle(c.textMuted)
      }
      Text(hint).font(Typo.caption).foregroundStyle(c.textMuted)
    }
    .padding(.vertical, Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }

  private func details(_ r: CrescentReport) -> String? {
    let s = theme.strings
    let lang = theme.lang
    guard r.visibility != .notBorn, let ageHours = r.ageHours else { return nil }
    let age = s.t("crescent.hours", ["n": localizeDigits(jsRound(ageHours), lang)])
    guard let lag = r.lagMinutes else { return s.t("crescent.age", ["age": age]) }
    if lag <= 0 { return s.t("crescent.ageSetsFirst", ["age": age]) }
    return s.t("crescent.ageLag", ["age": age, "lag": s.t("crescent.minutes", ["n": localizeDigits(jsRound(lag), lang)])])
  }

  private func stepButton(_ icon: Lucide, _ label: String, id: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      LucideIcon(icon: icon, color: theme.colors.text, size: 22)
        .frame(width: touchTarget, height: touchTarget)
        .background(Circle().fill(theme.colors.surfaceAlt))
    }
    .buttonStyle(PressScaleStyle())
    .accessibilityLabel(label)
    .accessibilityIdentifier(id)
  }
}
