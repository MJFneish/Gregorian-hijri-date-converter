import HijriCore
import SwiftUI

private struct Tool {
  let route: Route
  let icon: Lucide
  let key: String
}

/// Every page reachable from the Tools tab, in display order. A new tool = a `Route`, a page in
/// `ToolPage`, an entry here and `tools.<key>.title/description` strings.
private let tools = [
  Tool(route: .compareOffices(jdn: nil), icon: .scale, key: "compare"),
  Tool(route: .occasions, icon: .calendarHeart, key: "occasions"),
  Tool(route: .birthday, icon: .cake, key: "birthday"),
  Tool(route: .fasting, icon: .utensilsCrossed, key: "fasting"),
  Tool(route: .crescent, icon: .telescope, key: "crescent"),
  Tool(route: .daysBetween, icon: .hourglass, key: "daysBetween"),
]

private func toolKey(_ route: Route) -> String? {
  switch route {
  case .compareOffices: "compare"
  case .occasions: "occasions"
  case .birthday: "birthday"
  case .fasting: "fasting"
  case .crescent: "crescent"
  case .daysBetween: "daysBetween"
  case .onboarding: nil
  }
}

/// The Tools tab: everything beyond the converter, one row per page, so Home stays just the Today
/// card and the converter (user request, 2026-10-26 — the app is a converter, not a calendar).
struct ToolsView: View {
  @Environment(\.appTheme) private var theme
  @Environment(Navigator.self) private var navigator

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        Text(s["tools.title"])
          .font(Typo.displayMedium)
          .foregroundStyle(c.text)
          .accessibilityAddTraits(.isHeader)
        Text(s["tools.subtitle"])
          .font(Typo.body)
          .foregroundStyle(c.textMuted)
          .padding(.bottom, Spacing.lg)
        Card(padding: 0) {
          VStack(spacing: 0) {
            ForEach(tools.indices, id: \.self) { index in
              let tool = tools[index]
              if index > 0 { HairlineDivider() }
              Button {
                navigator.push(tool.route)
              } label: {
                HStack(spacing: Spacing.md) {
                  IconBadge(icon: tool.icon, tint: c.primary, background: c.primarySoft, size: 44, iconSize: 22)
                  VStack(alignment: .leading, spacing: 2) {
                    Text(s["tools.\(tool.key).title"]).font(Typo.bodyStrong).foregroundStyle(c.text)
                    Text(s["tools.\(tool.key).description"]).font(Typo.caption).foregroundStyle(c.textMuted)
                  }
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .multilineTextAlignment(.leading)
                  LucideIcon(icon: theme.isRtl ? .chevronLeft : .chevronRight, color: c.textMuted, size: 20)
                }
                .frame(minHeight: 72)
                .padding(.vertical, Spacing.md)
              }
              .buttonStyle(PressScaleStyle())
              .accessibilityIdentifier("tool.\(tool.key)")
            }
          }
          .padding(.horizontal, Spacing.md)
          .padding(.vertical, Spacing.xs)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, Spacing.lg)
      .padding(.top, Spacing.md)
      .padding(.bottom, Spacing.xxxl)
    }
    .scrollIndicators(.hidden)
    .background(c.background)
  }
}

/// The page for a tool route.
struct ToolPage: View {
  @Environment(\.appTheme) private var theme
  let route: Route

  var body: some View {
    let s = theme.strings
    let key = toolKey(route) ?? "compare"
    // Each tool is ported in its own pre-release; until then its page says so.
    PageScreen(title: s["tools.\(key).title"], subtitle: s["tools.\(key).description"]) {
      CenteredNote(text: "Coming in the next 2.0.0 pre-release.")
        .padding(.top, Spacing.xxl)
    }
  }
}
