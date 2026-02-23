import Foundation
import CoreGraphics
import AppKit

// anna-helper: Native macOS helper for Anna
// Subcommands:
//   paste       — Simulate Cmd+V using CGEvent (requires Accessibility, NOT Automation)
//   paste-to    — Activate target app by bundle ID, then simulate Cmd+V
//   frontapp    — Get frontmost app name and bundle ID (requires NO extra permission)

func activateApp(bundleId: String) -> Bool {
    guard let app = NSRunningApplication.runningApplications(
        withBundleIdentifier: bundleId
    ).first else {
        fputs("warn: No running app with bundle ID \(bundleId)\n", stderr)
        return false
    }

    let activated = app.activate()
    if !activated {
        fputs("warn: activate() returned false for \(bundleId)\n", stderr)
        return false
    }

    // Wait up to 500ms for the app to become frontmost
    let deadline = Date().addingTimeInterval(0.5)
    while Date() < deadline {
        if NSWorkspace.shared.frontmostApplication?.bundleIdentifier == bundleId {
            return true
        }
        Thread.sleep(forTimeInterval: 0.02)
    }

    fputs("warn: Timed out waiting for \(bundleId) to activate\n", stderr)
    return false
}

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
    Thread.sleep(forTimeInterval: 0.05)
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
    fputs("Usage: anna-helper <paste|paste-to|frontapp>\n", stderr)
    exit(1)
}

switch CommandLine.arguments[1] {
case "paste":
    simulatePaste()

case "paste-to":
    guard CommandLine.arguments.count >= 3 else {
        fputs("Usage: anna-helper paste-to <bundleId>\n", stderr)
        exit(1)
    }
    let bundleId = CommandLine.arguments[2]
    let activated = activateApp(bundleId: bundleId)
    if activated {
        Thread.sleep(forTimeInterval: 0.05)
    }
    simulatePaste()

case "frontapp":
    printFrontApp()

default:
    fputs("Unknown command: \(CommandLine.arguments[1])\n", stderr)
    exit(1)
}
