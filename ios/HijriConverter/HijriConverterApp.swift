import HijriCore
import SwiftUI

@main
struct HijriConverterApp: App {
  @State private var model = AppModel()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environment(model)
    }
  }
}
