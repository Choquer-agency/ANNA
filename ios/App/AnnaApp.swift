import SwiftUI
import AVFoundation

@main struct AnnaApp: App {
    @StateObject private var recorder = AnnaRecorder()
    var body: some Scene {
        WindowGroup { AnnaHome().environmentObject(recorder).tint(.orange) }
    }
}

struct AnnaHome: View {
    @EnvironmentObject var recorder: AnnaRecorder
    @State private var testText = ""
    @State private var key = ""
    @State private var settingsMessage = ""
    var body: some View {
        TabView {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HStack { AnnaMark().fill(.orange).frame(width: 34, height: 30); Text("ANNA").font(.largeTitle.bold()); Spacer(); Text("iPhone preview").font(.caption).foregroundStyle(.secondary) }
                        Text("Your voice. Your words.").font(.title2.bold())
                        Text(recorder.state.message).foregroundStyle(.secondary)
                        if recorder.state.phase == "recording" {
                            HStack { VoicePill(level: recorder.state.level); Text(time(recorder.duration)).monospacedDigit(); Spacer() }
                            Button("Finish & transcribe") { recorder.finish() }.buttonStyle(.borderedProminent)
                            if recorder.state.mode == "dictation" {
                                Button("Cancel dictation", role: .destructive) { recorder.cancel() }
                            }
                        } else {
                            Button { Task { await recorder.start(kind: "dictation") } } label: { Label("Start dictation", systemImage: "mic.fill") }.buttonStyle(.borderedProminent).disabled(recorder.state.phase == "processing")
                        }
                        Divider()
                        Text("Anna in your keyboard").font(.headline)
                        Text("Enable a microphone session here, then switch to the Anna keyboard in Messages or another app. Tap the A to start, then tap again to transcribe.").font(.subheadline).foregroundStyle(.secondary)
                        if recorder.state.session.isEmpty {
                            Button(recorder.starting ? "Starting microphone…" : "Enable keyboard session") { Task { await recorder.enableSession() } }.buttonStyle(.bordered).disabled(recorder.starting || recorder.activeID != nil || recorder.state.phase == "processing")
                        } else {
                            Label("Microphone active · 15-minute session", systemImage: "mic.fill").foregroundStyle(.orange)
                            Button("Turn microphone session off") { recorder.disableSession() }.buttonStyle(.bordered)
                        }
                        if recorder.state.phase == "error" { Text(recorder.state.message).font(.footnote).foregroundStyle(.red).textSelection(.enabled) }
                        Text("While enabled, the microphone stays active so the keyboard can start instantly. Audio is only saved after you start a dictation. iOS shows its microphone indicator.").font(.caption).foregroundStyle(.secondary)
                        Text("Try your keyboard here").font(.headline)
                        TextEditor(text: $testText).frame(height: 130).padding(8).background(.quaternary, in: RoundedRectangle(cornerRadius: 14))
                        if let recent = recorder.records.first(where: { $0.kind == "dictation" && !$0.segments.isEmpty }) {
                            Text("Latest dictation").font(.headline)
                            Text(recent.segments.map(\.text).joined(separator: " ")).textSelection(.enabled)
                            Button("Copy text") { UIPasteboard.general.string = recent.segments.map(\.text).joined(separator: " ") }
                        }
                    }.padding(24)
                }.background(Color.orange.opacity(0.035)).navigationTitle("Home").navigationBarTitleDisplayMode(.inline)
            }.tabItem { Label("Home", systemImage: "house") }
            NavigationStack {
                List {
                    Section {
                        Text("Put your phone near the centre of the table. Anna separates voices after recording; speaker names can be edited.").foregroundStyle(.secondary)
                        if recorder.activeID != nil && recorder.state.mode == "meeting" {
                            HStack { VoicePill(level: recorder.state.level); Text(time(recorder.duration)).monospacedDigit() }
                            Button("Finish meeting") { recorder.finish() }
                        } else {
                            Button { Task { await recorder.start(kind: "meeting") } } label: { Label("Start meeting", systemImage: "mic.fill") }.disabled(recorder.activeID != nil || recorder.state.phase == "processing")
                        }
                        Text("No recording time limit. Calls, low storage, battery loss or iOS interruptions can stop recording. Saved audio stays on this phone.").font(.caption).foregroundStyle(.secondary)
                        if recorder.state.phase == "processing" { ProgressView("Processing — keep Anna open for long meetings") }
                    }
                    Section("Recordings") {
                        ForEach(recorder.records.filter { $0.kind == "meeting" }) { record in
                            NavigationLink { MeetingDetail(id: record.id) } label: {
                                VStack(alignment: .leading, spacing: 5) { Text(record.title).font(.headline); Text(record.created, style: .date).font(.caption); Text(record.note).font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                    }
                }.navigationTitle("Meetings")
            }.tabItem { Label("Meetings", systemImage: "person.2") }
            NavigationStack {
                Form {
                    Section("Keyboard setup") {
                        Text("Settings → General → Keyboard → Keyboards → Add New Keyboard → Anna. Then select Anna and enable Allow Full Access.")
                        Text("Use the globe button to switch to Anna. Normal typing works without Full Access; voice needs the shared connection to the main app.").font(.caption)
                        Button("Open iPhone Settings") { UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!) }
                    }
                    Section("Personal test · Deepgram Nova-3") {
                        Text(recorder.hasKey ? "API key saved securely on this phone" : "Add a Deepgram API key to transcribe")
                        SecureField("Deepgram API key", text: $key).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button("Save key securely") {
                            do { try AnnaKeychain.save(key.trimmingCharacters(in: .whitespacesAndNewlines)); key = ""; recorder.refreshKey(); settingsMessage = "Saved in Keychain" } catch { settingsMessage = error.localizedDescription }
                        }.disabled(key.isEmpty)
                        Text(settingsMessage).font(.caption)
                        Text("Recorded audio is sent to Deepgram when you finish. The keyboard never receives your API key. This preview stores recordings locally and does not sync with desktop Anna.").font(.caption).foregroundStyle(.secondary)
                    }
                }.navigationTitle("Settings")
            }.tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

func time(_ seconds: Double) -> String { let s = max(0, Int(seconds)); return String(format: "%02d:%02d:%02d", s / 3600, s / 60 % 60, s % 60) }

struct MeetingDetail: View {
    @EnvironmentObject var recorder: AnnaRecorder
    var id: String
    @State private var player: AVAudioPlayer?
    var record: VoiceRecord? { recorder.records.first { $0.id == id } }
    var body: some View {
        Form {
            if let record {
                Section {
                    TextField("Meeting title", text: Binding(get: { self.record?.title ?? "" }, set: { value in update { $0.title = value } }))
                    Text(time(record.duration)).monospacedDigit()
                    HStack {
                        Button("Play audio") { do { player = try AVAudioPlayer(contentsOf: AnnaRecorder.folder.appendingPathComponent(record.filename)); player?.play() } catch {} }.disabled(recorder.activeID != nil)
                        Button("Stop") { player?.stop() }
                    }
                    Text(record.note).font(.caption).foregroundStyle(.secondary)
                    Button("Transcribe saved audio") { recorder.transcribe(record) }.disabled(recorder.activeID != nil || recorder.state.phase == "processing")
                    Button("Copy transcript") { UIPasteboard.general.string = record.transcript }.disabled(record.segments.isEmpty)
                }
                Section("Name the speakers") {
                    ForEach(record.names.keys.sorted(), id: \.self) { speaker in
                        TextField(speaker, text: Binding(get: { self.record?.names[speaker] ?? speaker }, set: { value in update { $0.names[speaker] = value } }))
                    }
                }
                Section("Transcript") {
                    ForEach(record.segments) { segment in
                        VStack(alignment: .leading) {
                            HStack {
                                Text(time(segment.start)).font(.caption).foregroundStyle(.secondary)
                                Picker("Speaker", selection: Binding(get: { self.record?.segments.first { $0.id == segment.id }?.speaker ?? segment.speaker }, set: { value in update { rec in if let i = rec.segments.firstIndex(where: { $0.id == segment.id }) { rec.segments[i].speaker = value } } })) {
                                    ForEach(record.names.keys.sorted(), id: \.self) { Text(record.names[$0] ?? $0).tag($0) }
                                }
                            }
                            TextField("Words", text: Binding(get: { self.record?.segments.first { $0.id == segment.id }?.text ?? "" }, set: { value in update { rec in if let i = rec.segments.firstIndex(where: { $0.id == segment.id }) { rec.segments[i].text = value } } }), axis: .vertical)
                        }
                    }
                }
            }
        }.navigationTitle("Meeting").onDisappear { player?.stop() }
    }
    func update(_ edit: (inout VoiceRecord) -> Void) { guard var value = record else { return }; edit(&value); recorder.persist(value) }
}
