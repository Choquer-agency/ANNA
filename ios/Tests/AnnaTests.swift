import XCTest
import UIKit
@testable import Anna

final class AnnaTests: XCTestCase {
    @MainActor func testMicrophoneStartupOnPhysicalPhone() async throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Microphone startup must be verified on a physical iPhone")
        #else
        let recorder = AnnaRecorder()
        guard recorder.hasKey else { throw XCTSkip("Personal test key is not provisioned") }
        await recorder.enableSession()
        defer { recorder.disableSession() }
        XCTAssertEqual(recorder.state.phase, "ready", recorder.state.message)
        #endif
    }
    @MainActor func testKeyboardFitsAnIPhoneAndProvidesRequiredControls() throws {
        let controller = KeyboardViewController()
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 265))
        window.rootViewController = controller; window.makeKeyAndVisible()
        controller.loadViewIfNeeded(); controller.view.frame = window.bounds; controller.view.layoutIfNeeded()
        func buttons(_ view: UIView) -> [UIButton] { (view as? UIButton).map { [$0] } ?? view.subviews.flatMap(buttons) }
        let keys = buttons(controller.view)
        XCTAssertTrue(keys.contains { $0.accessibilityLabel == "Anna voice dictation" })
        let start = try XCTUnwrap(keys.first { $0.accessibilityLabel == "Anna voice dictation" })
        XCTAssertEqual(start.currentTitle, "Start Anna")
        XCTAssertLessThan(start.convert(start.bounds, to: controller.view).maxY, 52)
        XCTAssertTrue(keys.contains { $0.accessibilityLabel == "Space" })
        let space = try XCTUnwrap(keys.first { $0.accessibilityLabel == "Space" })
        XCTAssertEqual(space.bounds.height, 43, accuracy: 0.5)
        let bottomEdge = space.convert(space.bounds, to: controller.view).maxY
        XCTAssertFalse(keys.contains { !$0.isHidden && $0.convert($0.bounds, to: controller.view).minY > bottomEdge + 1 }, "The extension must not add a second footer below the space row")
        XCTAssertEqual(keys.filter { $0.titleLabel?.font.pointSize == 22 && ($0.currentTitle ?? "").count == 1 && ($0.currentTitle ?? "").first?.isLetter == true }.count, 26)
        for key in keys where !key.isHidden {
            let bounds = key.convert(key.bounds, to: controller.view)
            XCTAssertGreaterThanOrEqual(bounds.minX, 0)
            XCTAssertLessThanOrEqual(bounds.maxX, 402.5)
        }
        let image = UIGraphicsImageRenderer(bounds: controller.view.bounds).image { _ in controller.view.drawHierarchy(in: controller.view.bounds, afterScreenUpdates: true) }
        let attachment = XCTAttachment(image: image); attachment.lifetime = .keepAlways; add(attachment)
        try image.pngData()?.write(to: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("keyboard-preview.png"))
        var state = KeyboardState(); state.session = "test"; state.phase = "recording"; state.level = 0.65
        controller.updateState(state); controller.view.layoutIfNeeded()
        let panel = buttons(controller.view)
        XCTAssertTrue(panel.contains { $0.accessibilityLabel == "Cancel dictation" })
        let finish = try XCTUnwrap(panel.first { $0.accessibilityLabel == "Finish dictation" })
        XCTAssertTrue(finish.isEnabled)
        XCTAssertFalse(panel.contains { $0.accessibilityLabel == "Space" })
        let wave = try XCTUnwrap(controller.view.subviews.first { $0.accessibilityLabel == "Anna audio levels" })
        let bars = try XCTUnwrap(wave.subviews.first as? UIStackView).arrangedSubviews
        XCTAssertEqual(bars.count, 11)
        XCTAssertTrue(bars.allSatisfy { $0.bounds.width == 3 && $0.bounds.height >= 3 })
        let listening = UIGraphicsImageRenderer(bounds: controller.view.bounds).image { _ in controller.view.drawHierarchy(in: controller.view.bounds, afterScreenUpdates: true) }
        try listening.pngData()?.write(to: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("keyboard-listening-preview.png"))
        state.phase = "processing"; controller.updateState(state); XCTAssertFalse(finish.isEnabled)
        state.phase = "completed"; controller.updateState(state); controller.view.layoutIfNeeded()
        XCTAssertTrue(buttons(controller.view).contains { $0.accessibilityLabel == "Space" })
        window.isHidden = true
    }
    func testSpeakerChangesAndPausesCreateSeparateTurns() {
        let words: [[String: Any]] = [
            ["start": 0.0, "end": 0.3, "punctuated_word": "Hello,", "speaker": 0],
            ["start": 0.4, "end": 0.8, "punctuated_word": "Bryce.", "speaker": 0],
            ["start": 1.0, "end": 1.3, "punctuated_word": "Hi!", "speaker": 1],
            ["start": 4.0, "end": 4.3, "punctuated_word": "Again.", "speaker": 1],
            ["start": 5.0, "end": 5.3, "word": "unknown"]]
        let result = TranscriptParser.segments(from: words)
        XCTAssertEqual(result.count, 4)
        XCTAssertEqual(result[0].text, "Hello, Bryce.")
        XCTAssertEqual(result[1].speaker, "speaker-1")
        XCTAssertEqual(result[3].speaker, "unknown")
    }
    func testGlobalRenameDoesNotChangeOtherSpeakers() {
        var record = VoiceRecord(id: "test", title: "Test", kind: "meeting", filename: "test.m4a")
        record.segments = [SpeakerSegment(speaker: "speaker-0", start: 0, end: 1, text: "Hello"), SpeakerSegment(speaker: "speaker-1", start: 1, end: 2, text: "Hi"), SpeakerSegment(speaker: "speaker-0", start: 2, end: 3, text: "Again")]
        record.names = ["speaker-0": "Bryce", "speaker-1": "Kevin"]
        XCTAssertEqual(record.transcript, "Bryce: Hello\n\nKevin: Hi\n\nBryce: Again")
    }
    func testStaleOrOffMicrophoneCannotBeUsedByKeyboard() {
        var state = KeyboardState(); state.session = "session"; state.phase = "ready"
        XCTAssertTrue(state.isAvailable)
        state.updated = Date().addingTimeInterval(-4); XCTAssertFalse(state.isAvailable)
        state.updated = Date(); state.phase = "off"; XCTAssertFalse(state.isAvailable)
    }
}
