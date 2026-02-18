import Foundation
import CoreGraphics

var fnDown = false
var tapRef: CFMachPort?

func eventCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    // Re-enable tap if macOS disables it due to timeout
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let tap = tapRef {
            CGEvent.tapEnable(tap: tap, enable: true)
        }
        return Unmanaged.passRetained(event)
    }

    if type == .flagsChanged {
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)

        // keyCode 63 = fn/globe key
        if keyCode == 63 {
            let flags = event.flags

            if flags.contains(.maskSecondaryFn) && !fnDown {
                fnDown = true
                print("fn_press")
                fflush(stdout)
            } else if !flags.contains(.maskSecondaryFn) && fnDown {
                fnDown = false
            }

            // Consume the event to prevent emoji picker / input source switch
            return nil
        }
    }

    return Unmanaged.passRetained(event)
}

// Create event tap for flagsChanged events
let eventMask = (1 << CGEventType.flagsChanged.rawValue)

guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: CGEventMask(eventMask),
    callback: eventCallback,
    userInfo: nil
) else {
    fputs("error: Failed to create event tap. Check accessibility permissions.\n", stderr)
    exit(1)
}

tapRef = eventTap

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: eventTap, enable: true)

print("ready")
fflush(stdout)

CFRunLoopRun()
