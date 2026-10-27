import XCTest

/// Launches the app on the simulator and saves screenshots for review — the iOS app can only be
/// looked at through CI (no Xcode on the development machine). CI uploads them as the
/// `ios-screenshots` artifact.
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

  func save(_ app: XCUIApplication, _ name: String) {
    let shot = app.screenshot()
    let attachment = XCTAttachment(screenshot: shot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    try? shot.pngRepresentation.write(to: screenshotDir.appendingPathComponent("\(name).png"))
  }

  func testLaunches() {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.staticTexts["todayHijri"].waitForExistence(timeout: 20))
    save(app, "01-launch")
  }
}
