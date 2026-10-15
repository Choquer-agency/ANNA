import Foundation

enum AnnaShared {
    static let group = "group.io.annatype.anna"
    static var directory: URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) }
    static func read<T: Decodable>(_ name: String, as type: T.Type) -> T? {
        guard let url = directory?.appendingPathComponent(name), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
    static func write<T: Encodable>(_ value: T, to name: String) throws {
        guard let folder = directory else { throw NSError(domain: "Anna", code: 1, userInfo: [NSLocalizedDescriptionKey: "Anna’s shared keyboard container is unavailable. Enable Full Access for the Anna keyboard."]) }
        try JSONEncoder().encode(value).write(to: folder.appendingPathComponent(name), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}

struct KeyboardState: Codable {
    var session = ""
    var updated = Date()
    var phase = "off"
    var mode = "dictation"
    var requestID = ""
    var level: Float = 0
    var text = ""
    var message = "Open Anna and enable the keyboard microphone session."
    var expires = Date()
    var isAvailable: Bool { !session.isEmpty && Date().timeIntervalSince(updated) < 3 && phase != "off" }
}

struct KeyboardCommand: Codable {
    var id = UUID().uuidString
    var session: String
    var action: String
    var created = Date()
}

struct SpeakerSegment: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var speaker: String
    var start: Double
    var end: Double
    var text: String
}

struct VoiceRecord: Codable, Identifiable {
    var id: String
    var title: String
    var created = Date()
    var kind: String
    var duration: Double = 0
    var filename: String
    var segments: [SpeakerSegment] = []
    var names: [String: String] = [:]
    var note = ""
    var transcript: String { segments.map { "\(names[$0.speaker] ?? $0.speaker): \($0.text)" }.joined(separator: "\n\n") }
}

enum TranscriptParser {
    static func segments(from words: [[String: Any]]) -> [SpeakerSegment] {
        var result: [SpeakerSegment] = []
        for word in words {
            guard let start = word["start"] as? Double, let end = word["end"] as? Double,
                  let text = (word["punctuated_word"] ?? word["word"]) as? String, !text.isEmpty else { continue }
            let speaker = (word["speaker"] as? Int).map { "speaker-\($0)" } ?? "unknown"
            if let previous = result.last, previous.speaker == speaker, start - previous.end < 1.5, end - previous.start < 25 {
                result[result.count - 1].text += " " + text
                result[result.count - 1].end = end
            } else { result.append(SpeakerSegment(speaker: speaker, start: start, end: end, text: text)) }
        }
        return result
    }
}
