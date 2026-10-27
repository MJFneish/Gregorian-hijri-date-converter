import HijriCore
import Observation
import SwiftUI

/// Pages opened over the tabs.
enum Route: Hashable {
  /// `replay` = opened again from Settings: finishing goes back instead of to the converter.
  case onboarding(replay: Bool)
  /// `jdn` = the day to compare (from the converter's result); nil = today.
  case compareOffices(jdn: Int?)
  case occasions, birthday, fasting, crescent, daysBetween
}

/// Logical tab indices — the order of the tab bar.
enum TabIndex {
  static let home = 0
  static let tools = 1
  static let settings = 2
}

/// How views move around: switch tab, open a page over the tabs, go back.
@MainActor
@Observable
final class Navigator {
  private(set) var stack: [Route] = []
  /// The tab pager's scroll position (one page per tab).
  var tab: Int? = TabIndex.home

  func goToTab(_ index: Int) {
    withAnimation(.easeInOut(duration: 0.24)) { tab = index }
  }

  func push(_ route: Route) {
    withAnimation(.easeInOut(duration: 0.28)) { stack.append(route) }
  }

  func back() {
    guard !stack.isEmpty else { return }
    withAnimation(.easeInOut(duration: 0.28)) { _ = stack.removeLast() }
  }
}

/// The loading screen stays up at least this long even when startup is instant — a flash reads as
/// a glitch, not as speed.
private let minLoadingVisible: Duration = .milliseconds(1200)

/// The app: the loading screen over everything at launch, the first-run introduction until it's
/// done, then three tabs (Converter · Tools · Settings) with tool pages opened over them. The tabs
/// stay alive under an open page, so the converter keeps its state.
struct RootView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.colorScheme) private var systemScheme
  @State private var navigator = Navigator()
  @State private var loading = true

  var body: some View {
    let mode = model.settings.themeMode
    let isDark = mode == .system ? systemScheme == .dark : mode == .dark
    let theme = AppTheme.make(isDark: isDark, lang: model.settings.language)
    // The night loading screen wants light status-bar text; after it, the theme decides (nil =
    // follow the phone, which also keeps `systemScheme` honest).
    let scheme: ColorScheme? = loading ? .dark : (mode == .system ? nil : (mode == .dark ? .dark : .light))
    ZStack {
      theme.colors.background.ignoresSafeArea()
      if !model.settings.onboardingDone {
        OnboardingView(onFinish: {})
      } else {
        TabsView()
          .accessibilityHidden(!navigator.stack.isEmpty)
        if let route = navigator.stack.last {
          page(route)
            .transition(route.isOnboarding ? .move(edge: .bottom) : .move(edge: .trailing))
            .zIndex(1)
        }
      }
      ToastHost().zIndex(2)
      if loading {
        LoadingView()
          .transition(.opacity)
          .zIndex(3)
      }
    }
    .environment(\.appTheme, theme)
    .environment(\.layoutDirection, theme.isRtl ? .rightToLeft : .leftToRight)
    .environment(navigator)
    .preferredColorScheme(scheme)
    .task {
      try? await Task.sleep(for: minLoadingVisible)
      withAnimation(.easeOut(duration: 0.38)) { loading = false }
    }
  }

  @ViewBuilder
  private func page(_ route: Route) -> some View {
    switch route {
    case .onboarding:
      OnboardingView(onFinish: { navigator.back() })
    default:
      ToolPage(route: route)
    }
  }
}

private extension Route {
  var isOnboarding: Bool {
    if case .onboarding = self { return true }
    return false
  }
}

private struct TabItem {
  let icon: Lucide
  let labelKey: String
}

private let tabItems = [
  TabItem(icon: .calendarRange, labelKey: "tabs.home"),
  TabItem(icon: .layoutGrid, labelKey: "tabs.tools"),
  TabItem(icon: .settings2, labelKey: "tabs.settings"),
]

/// Bottom tabs over a pager that follows the finger and snaps to a page. In Arabic the pages and the
/// tab bar mirror together (first tab on the right) with the layout direction.
struct TabsView: View {
  @Environment(\.appTheme) private var theme
  @Environment(Navigator.self) private var navigator

  var body: some View {
    @Bindable var navigator = navigator
    let c = theme.colors
    VStack(spacing: 0) {
      // Not lazy, so all three pages stay alive and the converter keeps its state across tabs — and
      // so each page gets the pager's size explicitly (a plain HStack of container-relative pages
      // grew past the screen).
      GeometryReader { geo in
        ScrollViewReader { proxy in
          ScrollView(.horizontal) {
            HStack(spacing: 0) {
              HomeView()
                .frame(width: geo.size.width, height: geo.size.height)
                .id(TabIndex.home)
              ToolsView()
                .frame(width: geo.size.width, height: geo.size.height)
                .id(TabIndex.tools)
              SettingsView()
                .frame(width: geo.size.width, height: geo.size.height)
                .id(TabIndex.settings)
            }
            .scrollTargetLayout()
          }
          .scrollTargetBehavior(.paging)
          .scrollIndicators(.hidden)
          .scrollPosition(id: $navigator.tab)
          .onChange(of: theme.isRtl) {
            // Switching language mirrors the pages but keeps the scroll offset, which then shows
            // another page (Settings → Arabic landed on the converter): put the current tab back.
            let tab = navigator.tab ?? TabIndex.home
            DispatchQueue.main.async {
              var instant = Transaction()
              instant.disablesAnimations = true
              withTransaction(instant) { proxy.scrollTo(tab) }
            }
          }
        }
      }
      // Scrolled content stops at the status bar instead of running under the clock.
      .overlay(alignment: .top) {
        c.background.frame(height: 0).ignoresSafeArea(edges: .top).allowsHitTesting(false)
      }

      HairlineDivider()
      HStack(spacing: 0) {
        ForEach(tabItems.indices, id: \.self) { index in
          let tab = tabItems[index]
          let active = (navigator.tab ?? TabIndex.home) == index
          let color = active ? c.primary : c.textMuted
          Button {
            navigator.goToTab(index)
          } label: {
            VStack(spacing: 2) {
              LucideIcon(icon: tab.icon, color: color, size: 22, lineWidth: active ? 2.4 : 2)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.xs)
                .background(Capsule().fill(c.primarySoft).opacity(active ? 1 : 0))
              Text(theme.strings[tab.labelKey])
                .font(.system(size: 13, weight: active ? .bold : .medium))
                .foregroundStyle(color)
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .padding(.top, Spacing.sm)
            .padding(.bottom, Spacing.xs)
          }
          .buttonStyle(PressDimStyle())
          .accessibilityAddTraits(active ? [.isSelected] : [])
          .accessibilityIdentifier("tab.\(index)")
        }
      }
      .background(c.surface.ignoresSafeArea(edges: .bottom))
    }
  }
}
