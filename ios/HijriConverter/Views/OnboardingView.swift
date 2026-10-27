import HijriCore
import SwiftUI

private let slides = ["welcome", "convert", "methods", "occasions"]

/// First-run introduction (4 slides with original animated artwork). Also reachable from Settings →
/// "Show introduction again", in which case finishing just goes back (`onFinish`). The pager mirrors
/// in Arabic with the layout direction, so the next slide comes from the left.
struct OnboardingView: View {
  @Environment(\.appTheme) private var theme
  @Environment(AppModel.self) private var model
  let onFinish: () -> Void
  @State private var slide: Int? = 0

  var body: some View {
    let c = theme.colors
    let s = theme.strings
    let index = slide ?? 0
    let isLast = index == slides.count - 1
    let otherLanguage: Lang = theme.lang == .ar ? .en : .ar

    VStack(spacing: 0) {
      HStack {
        Button {
          model.update { $0.language = otherLanguage }
        } label: {
          HStack(spacing: Spacing.xs) {
            LucideIcon(icon: .languages, color: c.primary, size: 16)
            Text(otherLanguage == .ar ? "العربية" : "English").font(Typo.bodyStrong).foregroundStyle(c.primary)
          }
          .padding(.horizontal, Spacing.md)
          .frame(minHeight: 40)
          .background(Capsule().fill(c.surfaceAlt))
        }
        .buttonStyle(PressDimStyle())
        .accessibilityLabel(s["onboarding.switchLanguage"])
        .accessibilityIdentifier("onboarding.language")
        Spacer()
        if !isLast {
          Button(action: finish) {
            Text(s["onboarding.skip"]).font(Typo.bodyStrong).foregroundStyle(c.textMuted)
              .padding(.horizontal, Spacing.sm)
              .frame(minHeight: 44)
          }
          .buttonStyle(PressDimStyle())
          .accessibilityIdentifier("onboarding.skip")
        }
      }
      .padding(.horizontal, Spacing.xl)
      .padding(.vertical, Spacing.sm)
      .frame(minHeight: 56)

      GeometryReader { geo in
        let width = geo.size.width
        let artSize = min(width - Spacing.xl * 2, 340, geo.size.height * 0.42)
        ScrollView(.horizontal) {
          LazyHStack(spacing: 0) {
            ForEach(slides.indices, id: \.self) { i in
              slideView(slides[i], width: width, artSize: artSize)
                .containerRelativeFrame([.horizontal, .vertical])
                .id(i)
            }
          }
          .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollIndicators(.hidden)
        .scrollPosition(id: $slide)
      }

      HStack {
        HStack(spacing: Spacing.sm) {
          ForEach(slides.indices, id: \.self) { i in
            Capsule()
              .fill(c.primary)
              .frame(width: i == index ? 24 : 8, height: 8)
              .opacity(i == index ? 1 : 0.35)
          }
        }
        .animation(.easeInOut(duration: 0.22), value: index)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(s.t("onboarding.progress", ["current": index + 1, "total": slides.count]))
        Spacer()
        Button {
          if isLast {
            finish()
          } else {
            withAnimation(.easeInOut(duration: 0.3)) { slide = index + 1 }
          }
        } label: {
          HStack(spacing: Spacing.sm) {
            Text(s[isLast ? "onboarding.getStarted" : "onboarding.next"]).font(Typo.bodyStrong).foregroundStyle(c.onPrimary)
            LucideIcon(icon: isLast ? .check : (theme.isRtl ? .arrowLeft : .arrowRight), color: c.onPrimary, size: 18)
          }
          .padding(.horizontal, Spacing.xl)
          .frame(minHeight: 52)
          .background(Capsule().fill(c.primary))
        }
        .buttonStyle(PressScaleStyle())
        .accessibilityIdentifier(isLast ? "onboarding.getStarted" : "onboarding.next")
      }
      .padding(.horizontal, Spacing.xl)
      .padding(.top, Spacing.sm)
      .padding(.bottom, Spacing.lg)
    }
    .background(c.background.ignoresSafeArea())
  }

  private func finish() {
    model.update { $0.onboardingDone = true }
    onFinish()
  }

  @ViewBuilder
  private func slideView(_ key: String, width: CGFloat, artSize: CGFloat) -> some View {
    let c = theme.colors
    let s = theme.strings
    VStack(spacing: 0) {
      // As tall as the slide allows up to 420 pt, the text right under it, spare room below.
      ZStack(alignment: key == "methods" ? .bottom : .center) {
        HeroGradient(from: c.heroFrom, to: c.heroTo)
        switch key {
        case "welcome": WelcomeArt(size: artSize)
        case "convert": ConvertArt(size: artSize, lang: theme.lang)
        case "methods": MethodsArt(size: width - Spacing.xl * 2)
        default: OccasionsArt(size: artSize)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: 420)
      .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
      .padding(.horizontal, Spacing.xl)
      .padding(.top, Spacing.sm)
      // Served before the spacer below, which only gets what's left.
      .layoutPriority(1)

      VStack(spacing: Spacing.md) {
        Text(s["onboarding.\(key).title"])
          .font(Typo.displayMedium)
          .foregroundStyle(c.text)
          .accessibilityAddTraits(.isHeader)
        Text(s["onboarding.\(key).body"])
          .font(Typo.body)
          .foregroundStyle(c.textMuted)
      }
      .multilineTextAlignment(.center)
      .frame(maxWidth: 520)
      .padding(.horizontal, Spacing.xl)
      .padding(.top, Spacing.xl)
      .padding(.bottom, Spacing.lg)
      Spacer(minLength: 0)
    }
  }
}
