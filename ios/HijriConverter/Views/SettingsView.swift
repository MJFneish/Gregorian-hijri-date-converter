import HijriCore
import SwiftUI

struct SettingsView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  @Environment(Navigator.self) private var navigator

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let settings = model.settings
    let followSystem = settings.themeMode == .system
    let previewToday = formatHijri(
      hijriOfJdn(todayJdn(), ConversionOptions(method: settings.method, adjustment: settings.adjustment)),
      theme.lang
    )
    let signedAdjustment = settings.adjustment > 0 ? "+\(settings.adjustment)" : String(settings.adjustment)
    let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""

    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        Text(s["settings.title"])
          .font(Typo.displayMedium)
          .foregroundStyle(c.text)
          .accessibilityAddTraits(.isHeader)

        // Language
        SectionLabel(text: s["settings.language"], first: true)
        SegmentedControl(
          options: [
            SegmentOption(value: Lang.en, label: "English", id: "settings.lang.en"),
            SegmentOption(value: Lang.ar, label: "العربية", id: "settings.lang.ar"),
          ],
          value: settings.language,
          onChange: { lang in model.update { $0.language = lang } }
        )

        // Appearance — follow-system switch, light/dark tiles otherwise
        SectionLabel(text: s["settings.appearance"])
        Card {
          HStack(spacing: Spacing.md) {
            IconBadge(icon: .contrast, tint: c.primary, background: c.surfaceAlt)
            VStack(alignment: .leading, spacing: 2) {
              Text(s["settings.followSystem"]).font(Typo.bodyStrong).foregroundStyle(c.text)
              Text(s["settings.followSystemHint"]).font(Typo.caption).foregroundStyle(c.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Toggle(
              s["settings.followSystem"],
              isOn: Binding(
                get: { followSystem },
                set: { on in model.update { $0.themeMode = on ? .system : (theme.isDark ? .dark : .light) } }
              )
            )
            .labelsHidden()
            .tint(c.primary)
            .accessibilityIdentifier("settings.followSystem")
          }
          if !followSystem {
            HStack(spacing: Spacing.sm) {
              ForEach(themeTiles, id: \.key) { tile in
                let mode = tile.mode
                let active = settings.themeMode == mode
                Button {
                  model.update { $0.themeMode = mode }
                } label: {
                  VStack(spacing: Spacing.xs) {
                    LucideIcon(icon: tile.icon, color: active ? c.primary : c.textMuted, size: 22)
                    Text(s[tile.key]).font(Typo.bodyStrong).foregroundStyle(active ? c.primary : c.text)
                  }
                  .frame(maxWidth: .infinity, minHeight: 72)
                  .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(active ? c.primarySoft : .clear))
                  .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(active ? c.primary : c.border, lineWidth: 1.5))
                }
                .buttonStyle(PressDimStyle())
                .accessibilityAddTraits(active ? [.isSelected] : [])
                .accessibilityIdentifier("settings.theme.\(mode.rawValue)")
              }
            }
            .padding(.top, Spacing.md)
            .transition(.opacity.combined(with: .move(edge: .top)))
          }
        }
        .animation(.easeOut(duration: 0.2), value: followSystem)

        // Calculation method
        SectionLabel(text: s["settings.method"])
        Text(s["settings.methodHint"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.bottom, Spacing.sm)
        VStack(spacing: Spacing.sm) {
          ForEach(MethodId.allCases, id: \.self) { id in
            MethodCard(id: id, active: id == settings.method) { model.update { $0.method = id } }
          }
        }

        // Manual adjustment
        SectionLabel(text: s["settings.adjustment"])
        Card {
          HStack(spacing: Spacing.md) {
            StepperButton(icon: .minus, label: s["settings.adjustmentMinus"], enabled: settings.adjustment > -maxAdjustment) {
              model.update { $0.adjustment = max(-maxAdjustment, $0.adjustment - 1) }
            }
            VStack(spacing: 0) {
              Text(localizeDigits(signedAdjustment, theme.lang)).font(Typo.displayMedium).foregroundStyle(c.text)
              Text(s["settings.adjustmentUnit"]).font(Typo.caption).foregroundStyle(c.textMuted)
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            StepperButton(icon: .plus, label: s["settings.adjustmentPlus"], enabled: settings.adjustment < maxAdjustment) {
              model.update { $0.adjustment = min(maxAdjustment, $0.adjustment + 1) }
            }
          }
          Text(s["settings.adjustmentHint"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.top, Spacing.md)
          Text(s.t("settings.adjustmentPreview", ["date": previewToday]))
            .font(Typo.bodyStrong)
            .foregroundStyle(c.primary)
            .padding(.top, Spacing.sm)
            .accessibilityIdentifier("settings.adjustmentPreview")
        }

        // Calendar data: month-start updates without a new release
        SectionLabel(text: s["settings.calendarData.title"])
        CalendarDataCard()

        // Help
        SectionLabel(text: s["settings.help"])
        Card(padding: 0) {
          Button {
            navigator.push(.onboarding(replay: true))
          } label: {
            HStack(spacing: Spacing.md) {
              IconBadge(icon: .sparkles, tint: c.primary, background: c.surfaceAlt)
              Text(s["settings.showIntro"]).font(Typo.bodyStrong).foregroundStyle(c.text)
                .frame(maxWidth: .infinity, alignment: .leading)
              LucideIcon(icon: theme.isRtl ? .chevronLeft : .chevronRight, color: c.textMuted, size: 20)
            }
            .padding(Spacing.lg)
            .frame(minHeight: 64)
          }
          .buttonStyle(PressDimStyle())
          .accessibilityIdentifier("settings.showIntro")
        }

        // About
        SectionLabel(text: s["settings.about"])
        Card {
          HStack(spacing: Spacing.md) {
            AppLogo(size: 52, tile: true)
            VStack(alignment: .leading, spacing: 2) {
              Text(s["app.name"]).font(Typo.subtitle).foregroundStyle(c.text)
              // In a left-to-right isolate, so a version keeps its order inside Arabic text.
              Text(s.t("settings.version", ["version": "\u{2066}\(localizeDigits(version, theme.lang))\u{2069}"]))
                .font(Typo.caption)
                .foregroundStyle(c.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(.bottom, Spacing.md)
          Text(s["settings.aboutBody"]).font(Typo.body).foregroundStyle(c.text)
          Text(s["settings.credits"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.top, Spacing.md)
        }

        HStack(alignment: .top, spacing: Spacing.sm) {
          LucideIcon(icon: .info, color: c.textMuted, size: 18)
          Text(s["settings.disclaimer"]).font(Typo.caption).foregroundStyle(c.textMuted)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(c.border, lineWidth: 1))
        .padding(.top, Spacing.xl)
      }
      .multilineTextAlignment(.leading)
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, Spacing.lg)
      .padding(.top, Spacing.md)
      .padding(.bottom, Spacing.xxxl)
    }
    .scrollIndicators(.hidden)
    .background(c.background)
  }
}

private struct ThemeTile {
  let mode: ThemeMode
  let key: String
  let icon: Lucide
}

private let themeTiles = [
  ThemeTile(mode: .light, key: "settings.light", icon: .sun),
  ThemeTile(mode: .dark, key: "settings.dark", icon: .moon),
]

private struct MethodCard: View {
  @Environment(\.appTheme) private var theme
  let id: MethodId
  let active: Bool
  let onSelect: () -> Void

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let shape = RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
    Button(action: onSelect) {
      HStack(alignment: .top, spacing: Spacing.md) {
        LucideIcon(icon: active ? .circleCheck : .circle, color: active ? c.primary : c.textMuted, size: 22)
        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: Spacing.sm) {
            Text(s["methods.\(id.rawValue).name"]).font(Typo.bodyStrong).foregroundStyle(c.text)
            if id == .iran { Tag(text: s["settings.defaultTag"], color: c.primary, background: c.surface) }
            if id == .ummalqura { Tag(text: s["settings.sunniTag"], color: c.accent, background: c.accentSoft) }
          }
          Text(s["methods.\(id.rawValue).description"]).font(Typo.caption).foregroundStyle(c.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .multilineTextAlignment(.leading)
      }
      .padding(Spacing.lg)
      .background(shape.fill(active ? c.primarySoft : c.card))
      .overlay(shape.stroke(active ? c.primary : c.border, lineWidth: 1.5))
    }
    .buttonStyle(PressScaleStyle())
    .accessibilityAddTraits(active ? [.isSelected] : [])
    .accessibilityIdentifier("settings.method.\(id.rawValue)")
  }
}

private struct StepperButton: View {
  @Environment(\.appTheme) private var theme
  let icon: Lucide
  let label: String
  let enabled: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      LucideIcon(icon: icon, color: theme.colors.primary, size: 20)
        .frame(width: 48, height: 48)
        .background(Circle().fill(theme.colors.surfaceAlt))
    }
    .buttonStyle(PressScaleStyle())
    .disabled(!enabled)
    .accessibilityLabel(label)
  }
}

/// Settings → Calendar data: which month tables are in use (bundled with the app, or downloaded from
/// the repo), when the app last checked, and a "Check for updates" button (TableUpdates).
private struct CalendarDataCard: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let tables = model.tables
    let checking = tables.status == .checking
    let dataDate = formatGregorian(localDate(parseIsoUtc(tables.generated)), theme.lang)
    let checkedText = tables.lastCheck.map {
      s.t("settings.calendarData.lastCheck", ["date": "\(formatGregorian(localDate($0), theme.lang)) \(formatTime($0, theme.lang))"])
    } ?? s["settings.calendarData.neverChecked"]
    let statusColor: Color = tables.status == .failed ? c.mourning : (tables.status == .updated ? c.celebration : c.textMuted)

    Card {
      HStack(spacing: Spacing.md) {
        IconBadge(icon: .cloudDownload, tint: c.primary, background: c.primarySoft)
        VStack(alignment: .leading, spacing: 2) {
          Text(s.t(tables.source == .downloaded ? "settings.calendarData.downloaded" : "settings.calendarData.builtIn", ["date": dataDate]))
            .font(Typo.bodyStrong)
            .foregroundStyle(c.text)
          Text(checkedText).font(Typo.caption).foregroundStyle(c.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      Text(s["settings.calendarData.hint"]).font(Typo.caption).foregroundStyle(c.textMuted).padding(.top, Spacing.md)
      Button {
        Task { await tables.check(force: true) }
      } label: {
        HStack(spacing: Spacing.sm) {
          if checking {
            ProgressView().tint(c.primary)
          } else {
            LucideIcon(icon: .refreshCw, color: c.primary, size: 18)
          }
          Text(s[checking ? "settings.calendarData.checking" : "settings.calendarData.check"])
            .font(Typo.bodyStrong)
            .foregroundStyle(c.primary)
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(c.border, lineWidth: 1))
      }
      .buttonStyle(PressScaleStyle(dimWhenDisabled: false))
      .disabled(checking)
      .padding(.top, Spacing.md)
      .accessibilityLabel(s["settings.calendarData.check"])
      .accessibilityIdentifier("settings.checkUpdates")
      if [.updated, .upToDate, .failed].contains(tables.status) {
        Text(s["settings.calendarData.status.\(tables.status.rawValue)"])
          .font(Typo.caption)
          .foregroundStyle(statusColor)
          .padding(.top, Spacing.sm)
          .accessibilityIdentifier("settings.checkStatus")
      }
    }
  }
}

/// "2026-10-26T10:38:09Z" → epoch ms.
private func parseIsoUtc(_ text: String) -> Int {
  let formatter = ISO8601DateFormatter()
  return formatter.date(from: text).map { Int($0.timeIntervalSince1970 * 1000) } ?? 0
}
