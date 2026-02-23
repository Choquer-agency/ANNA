import Foundation
import CoreGraphics
import AppKit

// anna-helper: Native macOS helper for Anna
// Subcommands:
//   paste    — Simulate Cmd+V using CGEvent (requires Accessibility, NOT Automation)
//   frontapp — Get frontmost app name and bundle ID (requires NO extra permission)

func simulatePaste() {
    let src = CGEventSource(stateID: .hidSystemState)

    // Key code 9 = 'v'
    guard let keyDown = CGEvent(keyboardEventSource: src, virtualKey: 9, keyDown: true),
          let keyUp = CGEvent(keyboardEventSource: src, virtualKey: 9, keyDown: false) else {
        fputs("error: Failed to create CGEvent\n", stderr)
        exit(1)
    }

    keyDown.flags = .maskCommand
    keyUp.flags = .maskCommand

    keyDown.post(tap: .cghidEventTap)
    keyUp.post(tap: .cghidEventTap)
}

func printFrontApp() {
    guard let app = NSWorkspace.shared.frontmostApplication else {
        print("{}")
        return
    }

    let name = app.localizedName ?? ""
    let bundleId = app.bundleIdentifier ?? ""

    // Output as JSON for easy parsing
    let escaped_name = name.replacingOccurrences(of: "\\", with: "\\\\")
                           .replacingOccurrences(of: "\"", with: "\\\"")
    let escaped_bundleId = bundleId.replacingOccurrences(of: "\\", with: "\\\\")
                                   .replacingOccurrences(of: "\"", with: "\\\"")

    print("{\"name\":\"\(escaped_name)\",\"bundleId\":\"\(escaped_bundleId)\"}")
}

// Main
guard CommandLine.arguments.count >= 2 else {
    fputs("Usage: anna-helper <paste|frontapp>\n", stderr)
    exit(1)
}

switch CommandLine.arguments[1] {
case "paste":
    simulatePaste()
case "frontapp":
    printFrontApp()
default:
    fputs("Unknown command: \(CommandLine.arguments[1])\n", stderr)
    exit(1)
}
