import SwiftUI
import UIKit

/// Shares cards as images: renders the card off screen at the screen's scale, saves it as a JPEG
/// in the caches folder and opens the share sheet with the caption (the caption alone if the image
/// can't be made). The card is rendered with the current theme and language, so the image matches
/// the screen.
@MainActor
enum ShareImage {
  static func share<Card: View>(_ card: Card, theme: AppTheme, scale: CGFloat, message: String, filename: String) {
    let renderer = ImageRenderer(
      content: card
        .environment(\.appTheme, theme)
        .environment(\.layoutDirection, theme.isRtl ? .rightToLeft : .leftToRight)
        .environment(\.colorScheme, theme.isDark ? .dark : .light)
    )
    renderer.scale = scale
    var items: [Any] = [message]
    if let image = renderer.uiImage, let file = writeJpeg(image, filename) {
      items.append(file)
    }
    present(UIActivityViewController(activityItems: items, applicationActivities: nil))
  }

  private static func writeJpeg(_ image: UIImage, _ name: String) -> URL? {
    let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("shared")
    // Only the latest image is kept.
    try? FileManager.default.removeItem(at: dir)
    guard (try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)) != nil,
          let data = image.jpegData(compressionQuality: 0.95) else { return nil }
    let file = dir.appendingPathComponent("\(name).jpg")
    return (try? data.write(to: file)) != nil ? file : nil
  }

  /// Over whatever is on screen; anchored mid-screen where the sheet is a popover (iPad).
  private static func present(_ controller: UIViewController) {
    let window = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first
    guard var top = window?.rootViewController else { return }
    while let presented = top.presentedViewController { top = presented }
    if let popover = controller.popoverPresentationController, let view = window {
      popover.sourceView = view
      popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
      popover.permittedArrowDirections = []
    }
    top.present(controller, animated: true)
  }
}
