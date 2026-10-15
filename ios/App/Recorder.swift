import AVFoundation
import SwiftUI
import UIKit

private final class AudioSink: @unchecked Sendable {
    private let lock = NSLock()
    private var file: AVAudioFile?
    private var frames: AVAudioFramePosition = 0
    private var rate: Double = 1
    private var level: Float = 0
    private var error: String?
    func begin(_ file: AVAudioFile, rate: Double) { lock.lock(); defer { lock.unlock() }; self.file = file; frames = 0; self.rate = rate; error = nil }
    func end() -> Double { lock.lock(); defer { lock.unlock() }; file = nil; return Double(frames) / rate }
    func append(_ buffer: AVAudioPCMBuffer) {
        lock.lock(); defer { lock.unlock() }
        if let samples = buffer.floatChannelData?[0] {
            var sum: Float = 0
            for index in 0..<Int(buffer.frameLength) { sum += samples[index] * samples[index] }
            level = min(1, sqrt(sum / Float(max(1, buffer.frameLength))) * 12)
        }
        guard let file else { return }
        do { try file.write(from: buffer); frames += AVAudioFramePosition(buffer.frameLength) }
        catch { self.error = error.localizedDescription }
    }
    func snapshot() -> (Float, Double, String?) { lock.lock(); defer { lock.unlock() }; return (level, Double(frames) / rate, error) }
}

@MainActor final class AnnaRecorder: ObservableObject {
    @Published var state = KeyboardState()
    @Published var records: [VoiceRecord] = []
    @Published var activeID: String?
    @Published var duration: Double = 0
    @Published var hasKey = false
    private var engine: AVAudioEngine?
    private let sink = AudioSink()
    private var ticker: Timer?
    private var lastCommand = ""
    @Published private(set) var starting = false
    private var lastCheckpoint = -1
    private var recording: VoiceRecord?
    private var processing: Task<Void, Never>?
    private var interruptionObserver: NSObjectProtocol?
    private var backgroundTask = UIBackgroundTaskIdentifier.invalid
    static var folder: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Recordings") }

    init() {
        AnnaKeychain.importBootstrap(); hasKey = !AnnaKeychain.read().isEmpty
        try? FileManager.default.createDirectory(at: Self.folder, withIntermediateDirectories: true)
        records = ((try? FileManager.default.contentsOfDirectory(at: Self.folder, includingPropertiesForKeys: nil)) ?? [])
            .filter { $0.pathExtension == "json" }.compactMap { try? JSONDecoder().decode(VoiceRecord.self, from: Data(contentsOf: $0)) }.sorted { $0.created > $1.created }
        for index in records.indices where records[index].note == "Recording in progress" {
            records[index].note = "Recording was interrupted. Saved audio is available for transcription."; persist(records[index])
        }
        publish()
        interruptionObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] notification in
            guard (notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor in self?.disableSession(message: "Microphone interrupted by iOS. Your saved audio is preserved.") }
        }
    }
    func publish() { state.updated = Date(); try? AnnaShared.write(state, to: "state.json") }
    func refreshKey() { hasKey = !AnnaKeychain.read().isEmpty }
    func enableSession() async {
        guard recording == nil, processing == nil, !starting else { return }
        guard hasKey else { state.message = "Add your test Deepgram key in Settings first."; state.phase = "error"; publish(); return }
        starting = true
        defer { starting = false }
        state.message = "Starting microphone…"; publish()
        do { try await openMicrophone(); state.session = UUID().uuidString; state.mode = "dictation"; state.requestID = ""; state.text = ""; state.expires = Date().addingTimeInterval(15 * 60); state.phase = "ready"; state.message = "Keyboard ready · microphone active"; publish() }
        catch { microphoneFailure(error) }
    }
    private func openMicrophone() async throws {
        if engine != nil { return }
        guard await AVAudioApplication.requestRecordPermission() else { throw NSError(domain: "Anna", code: 2, userInfo: [NSLocalizedDescriptionKey: "Microphone permission is off. Enable it for Anna in iPhone Settings."]) }
        guard UIApplication.shared.applicationState == .active else { throw NSError(domain: "Anna", code: 7, userInfo: [NSLocalizedDescriptionKey: "Open Anna on your unlocked iPhone before enabling its microphone."]) }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])
        // iOS can still be releasing an interrupted or mirrored audio session.
        // Retry briefly while the app is foregrounded, then report the real error.
        for attempt in 0..<3 {
            do { try session.setActive(true); break }
            catch {
                if attempt == 2 { throw error }
                try? session.setActive(false, options: .notifyOthersOnDeactivation)
                try await Task.sleep(for: .milliseconds(attempt == 0 ? 250 : 750))
                guard UIApplication.shared.applicationState == .active else { throw error }
            }
        }
        let audio = AVAudioEngine()
        let input = audio.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            try? session.setActive(false)
            throw NSError(domain: "Anna", code: 3, userInfo: [NSLocalizedDescriptionKey: "No microphone input is available."])
        }
        let sink = self.sink
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in sink.append(buffer) }
        audio.prepare()
        do { try audio.start() } catch { input.removeTap(onBus: 0); try? session.setActive(false); throw error }
        engine = audio
        ticker = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } }
    }
    func start(kind: String, title: String = "", requestID: String = UUID().uuidString) async {
        guard recording == nil, processing == nil, !starting else { return }
        starting = true
        defer { starting = false }
        do {
            try await openMicrophone()
            let id = UUID().uuidString
            let format = engine!.inputNode.outputFormat(forBus: 0)
            let file = try AVAudioFile(forWriting: Self.folder.appendingPathComponent(id + ".m4a"), settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: format.sampleRate, AVNumberOfChannelsKey: format.channelCount, AVEncoderBitRateKey: 64_000], commonFormat: .pcmFormatFloat32, interleaved: false)
            try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUnlessOpen], ofItemAtPath: file.url.path)
            var record = VoiceRecord(id: id, title: title.isEmpty ? (kind == "meeting" ? "New meeting" : "Dictation") : title, kind: kind, filename: id + ".m4a")
            record.note = "Recording in progress"; recording = record; activeID = id; duration = 0; lastCheckpoint = -1; persist(record)
            sink.begin(file, rate: format.sampleRate)
            state.phase = "recording"; state.mode = kind; state.requestID = requestID; state.text = ""; state.message = kind == "meeting" ? "Meeting recording · no time limit" : "Listening…"; publish()
        } catch { microphoneFailure(error) }
    }
    func finish() {
        guard var record = recording else { return }
        record.duration = sink.end(); record.note = "Saved audio"; recording = nil; activeID = nil; persist(record)
        transcribe(record)
    }
    func cancel() {
        guard let record = recording else { return }
        _ = sink.end(); recording = nil; activeID = nil
        try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(record.filename))
        try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(record.id + ".json"))
        records.removeAll { $0.id == record.id }
        state.phase = engine == nil ? "off" : "ready"; state.requestID = ""; state.message = "Dictation cancelled"; publish()
    }
    func disableSession(message: String = "Keyboard microphone session is off") {
        if var record = recording { record.duration = sink.end(); record.note = message; persist(record); recording = nil; activeID = nil }
        engine?.inputNode.removeTap(onBus: 0); engine?.stop(); engine = nil
        ticker?.invalidate(); ticker = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        state.phase = "off"; state.session = ""; state.level = 0; state.message = message; publish()
    }
    private func tick() {
        let (level, seconds, error) = sink.snapshot(); state.level = level; duration = seconds
        if let error { disableSession(message: "Audio saving failed: " + error); return }
        if var record = recording {
            record.duration = seconds
            let checkpoint = Int(seconds) / 5
            if checkpoint != lastCheckpoint { lastCheckpoint = checkpoint; persist(record) }
            if record.kind == "dictation" && seconds >= 14.5 * 60 { state.message = "30 seconds or less left — wrap up your dictation" }
            if record.kind == "dictation" && seconds >= 15 * 60 { finish() }
        } else if !state.session.isEmpty && Date() >= state.expires && processing == nil { disableSession(); return }
        if let command = AnnaShared.read("command.json", as: KeyboardCommand.self), command.id != lastCommand {
            lastCommand = command.id
            if command.session == state.session && !state.session.isEmpty && Date().timeIntervalSince(command.created) < 10 && state.mode != "meeting" {
                if command.action == "start", recording == nil, processing == nil { Task { await start(kind: "dictation", requestID: command.id) } }
                else if command.action == "finish" { finish() }
                else if command.action == "cancel" { cancel() }
            }
        }
        publish()
    }
    func persist(_ record: VoiceRecord) {
        do {
            try JSONEncoder().encode(record).write(to: Self.folder.appendingPathComponent(record.id + ".json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            records.removeAll { $0.id == record.id }; records.append(record); records.sort { $0.created > $1.created }
        } catch { state.message = "Could not save meeting details: " + error.localizedDescription }
    }
    func transcribe(_ record: VoiceRecord) {
        guard processing == nil else { return }
        state.phase = "processing"; state.message = "Transcribing…"; publish()
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Anna transcription") { [weak self] in
            Task { @MainActor in self?.processing?.cancel() }
        }
        processing = Task {
            defer {
                processing = nil
                if backgroundTask != .invalid { UIApplication.shared.endBackgroundTask(backgroundTask); backgroundTask = .invalid }
                if state.session.isEmpty { engine?.inputNode.removeTap(onBus: 0); engine?.stop(); engine = nil; ticker?.invalidate(); ticker = nil; try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
            }
            do {
                let key = AnnaKeychain.read()
                guard !key.isEmpty else { throw NSError(domain: "Anna", code: 4, userInfo: [NSLocalizedDescriptionKey: "Add a Deepgram key in Settings, then retry this saved recording."]) }
                let query = record.kind == "meeting" ? "&diarize_model=latest" : ""
                var request = URLRequest(url: URL(string: "https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true" + query)!)
                request.httpMethod = "POST"; request.timeoutInterval = 1800
                request.setValue("Token " + key, forHTTPHeaderField: "Authorization"); request.setValue("audio/mp4", forHTTPHeaderField: "Content-Type")
                let (data, response) = try await URLSession.shared.upload(for: request, fromFile: Self.folder.appendingPathComponent(record.filename))
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw NSError(domain: "Anna", code: 5, userInfo: [NSLocalizedDescriptionKey: "Transcription request failed. Your recording is saved; check the API key and retry."]) }
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                let results = json?["results"] as? [String: Any]; let channels = results?["channels"] as? [[String: Any]]
                let alternatives = channels?.first?["alternatives"] as? [[String: Any]]
                let text = alternatives?.first?["transcript"] as? String ?? ""
                guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw NSError(domain: "Anna", code: 6, userInfo: [NSLocalizedDescriptionKey: "No speech was detected. Check microphone placement and the saved audio."]) }
                var completed = record
                completed.segments = record.kind == "meeting" ? TranscriptParser.segments(from: alternatives?.first?["words"] as? [[String: Any]] ?? []) : [SpeakerSegment(speaker: "dictation", start: 0, end: record.duration, text: text)]
                for segment in completed.segments where completed.names[segment.speaker] == nil { completed.names[segment.speaker] = "Speaker \(completed.names.count + 1)" }
                completed.note = "Transcribed with Deepgram Nova-3"; persist(completed)
                state.phase = "completed"; state.mode = "dictation"; state.text = record.kind == "dictation" ? text : ""; state.message = "Ready"; publish()
            } catch {
                var failed = record; failed.note = "Audio saved. " + error.localizedDescription; persist(failed); fail(error.localizedDescription)
            }
        }
    }
    private func fail(_ message: String) { state.phase = "error"; state.message = message; publish() }
    private func microphoneFailure(_ error: Error) {
        let details = error as NSError
        if details.domain == "Anna" { fail(details.localizedDescription); return }
        let reason: String
        switch details.code {
        case 561017449, 560557684:
            reason = "iOS is holding the microphone for another audio session. End any call or Continuity microphone use, keep Anna open on your unlocked iPhone, and try again."
        case 561145187:
            reason = "iOS could not start recording. Close iPhone Mirroring, then retry directly on your unlocked iPhone."
        default: reason = "Could not start the microphone: " + details.localizedDescription + ". Keep Anna open on your unlocked iPhone and retry."
        }
        fail(reason + " [\(details.domain): \(details.code)]")
    }
}
