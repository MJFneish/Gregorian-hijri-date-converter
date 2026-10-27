import XCTest

/// Drives the app on the simulator and saves screenshots for review — the iOS app can only be looked
/// at through CI (no Xcode on the development machine). CI uploads them as the `ios-screenshots`
/// artifact, named in the order they were taken.
final class SmokeTests: XCTestCase {
  override func setUp() {
    continueAfterFailure = false
  }

  /// Where screenshots go: the simulator host's home (CI uploads ~/hijri-screenshots), else /tmp.
  private var screenshotDir: URL {
    let base = ProcessInfo.processInfo.environment["SIMULATOR_HOST_HOME"].map { URL(fileURLWithPath: $0) }
      ?? URL(fileURLWithPath: NSTemporaryDirectory())
    let dir = base.appendingPathComponent("hijri-screenshots")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private func save(_ app: XCUIApplication, _ name: String) {
    let shot = app.screenshot()
    let attachment = XCTAttachment(screenshot: shot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    try? shot.pngRepresentation.write(to: screenshotDir.appendingPathComponent("\(name).png"))
  }

  private func launchFresh() -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-uiTestReset", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
    app.launch()
    return app
  }

  /// Lets animations (the loading screen's fade, page transitions) finish.
  private func settle(_ seconds: Double = 1) {
    RunLoop.current.run(until: Date().addingTimeInterval(seconds))
  }

  private func tap(_ element: XCUIElement, _ name: String) {
    XCTAssertTrue(element.waitForExistence(timeout: 10), "\(name) not found")
    element.tap()
  }

  func testShell() {
    let app = launchFresh()
    XCTAssertTrue(app.buttons["onboarding.next"].waitForExistence(timeout: 20))
    settle(2) // the loading screen stays 1.2 s, then fades
    save(app, "01-onboarding-welcome")

    tap(app.buttons["onboarding.next"], "next")
    settle()
    save(app, "02-onboarding-convert")
    tap(app.buttons["onboarding.next"], "next")
    settle()
    save(app, "03-onboarding-methods")
    tap(app.buttons["onboarding.next"], "next")
    settle()
    save(app, "04-onboarding-occasions")
    tap(app.buttons["onboarding.getStarted"], "get started")
    settle()
    XCTAssertTrue(app.staticTexts["home.todayHijri"].waitForExistence(timeout: 5), "today card not found")
    save(app, "05-home")

    // Converter: a Hijri date three years on → Gregorian.
    tap(app.buttons["home.toGregorian"], "to Gregorian")
    settle(0.5)
    let year = app.pickerWheels.element(boundBy: 2)
    XCTAssertTrue(year.waitForExistence(timeout: 5), "year wheel not found")
    year.adjust(toPickerWheelValue: "1451")
    settle(0.5)
    save(app, "06-home-wheels")
    tap(app.buttons["home.convert"], "convert")
    settle(0.3)
    save(app, "07-converting")
    let date = app.staticTexts["result.date"]
    XCTAssertTrue(date.waitForExistence(timeout: 5), "result not found")
    XCTAssertTrue(date.label.contains("2029") || date.label.contains("2030"), "unexpected result \(date.label)")
    settle()
    save(app, "08-result")
    tap(app.buttons["home.copy"], "copy")
    settle(0.4)
    save(app, "09-copied")

    tap(app.buttons["tab.1"], "tools tab")
    settle()
    save(app, "10-tools")
    tap(app.buttons["tool.compare"], "compare row")
    settle()
    save(app, "11-tool-page")
    tap(app.buttons["page.back"], "back")
    settle()

    tap(app.buttons["tab.2"], "settings tab")
    settle()
    save(app, "12-settings")
    tap(app.buttons["settings.lang.ar"], "Arabic")
    settle()
    save(app, "13-settings-ar")
    tap(app.switches["settings.followSystem"], "follow system")
    settle(0.5)
    tap(app.buttons["settings.theme.dark"], "dark")
    settle()
    save(app, "14-settings-ar-dark")
    tap(app.buttons["tab.0"], "converter tab")
    settle()
    save(app, "15-home-ar-dark")
    tap(app.buttons["tab.2"], "settings tab")
    settle()

    let check = app.buttons["settings.checkUpdates"]
    for _ in 0 ..< 4 where !check.isHittable { app.swipeUp() }
    tap(check, "check for updates")
    XCTAssertTrue(app.staticTexts["settings.checkStatus"].waitForExistence(timeout: 20))
    save(app, "16-calendar-data")

    tap(app.buttons["settings.showIntro"], "show intro")
    settle()
    save(app, "17-intro-replay-ar")
    tap(app.buttons["onboarding.skip"], "skip")
    settle()
    XCTAssertTrue(app.buttons["settings.showIntro"].waitForExistence(timeout: 5))
    save(app, "18-back-to-settings")

    // Last: the share sheet is another process's UI, so nothing runs after it.
    tap(app.buttons["tab.0"], "converter tab")
    settle()
    tap(app.buttons["home.share"], "share")
    settle(8) // the first share sheet on a fresh simulator is slow to appear
    save(app, "19-share-sheet")
  }
}
