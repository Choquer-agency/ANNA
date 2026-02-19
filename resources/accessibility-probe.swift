import CoreGraphics

let eventMask = (1 << CGEventType.flagsChanged.rawValue)

guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: CGEventMask(eventMask),
    callback: { _, _, event, _ in Unmanaged.passRetained(event) },
    userInfo: nil
) else {
    print("no")
    exit(1)
}

CFMachPortInvalidate(tap)
print("ok")
exit(0)
