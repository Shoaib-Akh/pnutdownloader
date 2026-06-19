// Drop anywhere in your Xcode project.
// SwiftUI usage:  .background(Color.bgCard)
// UIKit usage:    view.backgroundColor = UIColor(Color.bgCard)

import SwiftUI

extension Color {

    // Primary (buttons, links, highlights)
    static let primary      = Color.adaptive(light: "#164E63", dark: "#06B6D4")
    static let primaryHover = Color.adaptive(light: "#155E75", dark: "#22D3EE")
    static let primaryText  = Color(hex: "#ECFEFF")
    static let primaryGlow  = Color(hex: "#06B6D4")

    // Background
    static let bgPage       = Color.adaptive(light: "#FAFAFA", dark: "#09090B")
    static let bgCard       = Color.adaptive(light: "#FFFFFF", dark: "#18181B")
    static let bgTint       = Color.adaptive(light: "#E0F7FA", dark: "#164E63")

    // Text
    static let textPrimary  = Color.adaptive(light: "#18181B", dark: "#F4F4F5")
    static let textSecondary = Color.adaptive(light: "#3F3F46", dark: "#A1A1AA")
    static let textMuted    = Color(hex: "#71717A")

    // Feedback
    static let success      = Color(hex: "#22C55E")
    static let error        = Color(hex: "#EF4444")

    // MARK: - Helpers (internal)

    private init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let n = UInt64(h, radix: 16) ?? 0
        self.init(
            red:   Double((n >> 16) & 0xFF) / 255,
            green: Double((n >> 8)  & 0xFF) / 255,
            blue:  Double(n         & 0xFF) / 255
        )
    }

    private static func adaptive(light: String, dark: String) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(hex: dark))
            : UIColor(Color(hex: light))
        })
    }
}
