import UIKit
import SwiftUI

final class KeyboardViewController: UIInputViewController {
    private let stack = UIStackView()
    private let status = UILabel()
    private let voice = UIButton(type: .system)
    private var timer: Timer?
    private var shifted = false
    private var numbers = false
    private var requested = ""
    private var consumed = ""
    private var before: String?
    private var mayInsert = false
    private var latest = KeyboardState()
    private var lastRender = ""
    private var waveform: KeyboardWaveform?
    private var finishButton: UIButton?

    private var symbols = false
    private var emoji = false
    private var capsLock = false
    private var lastShift = Date.distantPast
    private var repeatDelete: Timer?
    private var suggestions: [String] = []
    private var lexicon: [UILexiconEntry] = []
    private var suggestionButtons: [UIButton] = []
    private var toolbarSpace: UIView?
    private var returnButton: UIButton?
    private var cursorX: CGFloat = 0
    private var keyRows: [UIView] = []
    private let checker = UITextChecker()
    private var heightConstraint: NSLayoutConstraint?

    override func viewDidLoad() {
        super.viewDidLoad()
        heightConstraint = view.heightAnchor.constraint(equalToConstant: 330)
        heightConstraint?.priority = .defaultHigh; heightConstraint?.isActive = true
        status.font = .systemFont(ofSize: 11); status.textAlignment = .center
        status.adjustsFontSizeToFitWidth = true; status.minimumScaleFactor = 0.8
        requestSupplementaryLexicon { [weak self] value in
            DispatchQueue.main.async { self?.lexicon = value.entries; self?.refreshSuggestions() }
        }
        render()
    }
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        autoShift(); render(); updateState()
        timer?.invalidate(); timer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in self?.updateState() }
    }
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated); timer?.invalidate(); timer = nil; repeatDelete?.invalidate(); mayInsert = false
    }
    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        if !requested.isEmpty && textDocumentProxy.documentContextBeforeInput != before { mayInsert = false }
        autoShift(); refreshSuggestions(); refreshReturn()
    }
    private func autoShift() {
        guard !capsLock else { return }
        let context = textDocumentProxy.documentContextBeforeInput ?? ""
        let trimmed = context.trimmingCharacters(in: .whitespaces)
        let value = context.isEmpty || context.hasSuffix("\n") || (context.hasSuffix(" ") && [".", "!", "?"].contains(String(trimmed.suffix(1))))
        if value != shifted { shifted = value; if isViewLoaded { render() } }
    }
    private var ink: UIColor { traitCollection.userInterfaceStyle == .dark ? .white : .black }
    private var keyColor: UIColor { traitCollection.userInterfaceStyle == .dark ? UIColor(white: 0.35, alpha: 1) : .white }
    private func button(_ title: String, size: CGFloat = 22, action: @escaping () -> Void) -> UIButton {
        let b = UIButton(type: .system); b.setTitle(title, for: .normal); b.setTitleColor(ink, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: size); b.backgroundColor = keyColor; b.layer.cornerRadius = 11
        b.addAction(UIAction { _ in action() }, for: .touchUpInside)
        b.addAction(UIAction { _ in b.alpha = 0.6 }, for: .touchDown)
        b.addAction(UIAction { _ in b.alpha = 1 }, for: [.touchUpInside, .touchUpOutside, .touchCancel])
        return b
    }
    private func icon(_ name: String, action: @escaping () -> Void) -> UIButton {
        let b = button("", action: action); b.setImage(UIImage(systemName: name, withConfiguration: UIImage.SymbolConfiguration(pointSize: 16)), for: .normal); b.tintColor = ink; return b
    }
    private func insert(_ value: String) {
        textDocumentProxy.insertText(value)
        if shifted && !capsLock { shifted = false; render() }
        refreshSuggestions(); autoShift()
    }
    private func row(_ keys: [String], inset: CGFloat = 0, leading: UIButton? = nil, trailing: UIButton? = nil) -> UIView {
        let container = UIView(); let r = UIStackView(); r.spacing = 6; r.distribution = .fillEqually
        r.translatesAutoresizingMaskIntoConstraints = false; container.addSubview(r)
        NSLayoutConstraint.activate([r.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: inset), r.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -inset), r.topAnchor.constraint(equalTo: container.topAnchor), r.bottomAnchor.constraint(equalTo: container.bottomAnchor)])
        let leftGap = UIView(), rightGap = UIView()
        if let leading { r.addArrangedSubview(leading) }
        if leading != nil && !numbers { r.addArrangedSubview(leftGap) }
        if leading != nil && !numbers { r.distribution = .fill }
        for key in keys {
            let b = button(key) { [weak self] in self?.insert(key) }; r.addArrangedSubview(b)
            if leading != nil && !numbers { b.widthAnchor.constraint(equalTo: container.widthAnchor, multiplier: 0.1, constant: -5.4).isActive = true }
        }
        if leading != nil && !numbers { r.addArrangedSubview(rightGap) }
        if let trailing { r.addArrangedSubview(trailing) }
        if let leading, let trailing, !numbers {
            leading.widthAnchor.constraint(equalTo: container.widthAnchor, multiplier: 0.115).isActive = true
            leading.widthAnchor.constraint(equalTo: trailing.widthAnchor).isActive = true
            leftGap.widthAnchor.constraint(equalTo: rightGap.widthAnchor).isActive = true
        }
        return container
    }
    private var isVoicePanel: Bool { latest.isAvailable && latest.mode == "dictation" && ["recording", "processing"].contains(latest.phase) }
    private func render() {
        lastRender = isVoicePanel ? "voice" : "keys"
        heightConstraint?.constant = isVoicePanel ? 270 : 265
        waveform = nil; finishButton = nil; returnButton = nil; suggestionButtons = []
        for v in view.subviews { v.removeFromSuperview() }
        view.backgroundColor = traitCollection.userInterfaceStyle == .dark ? UIColor(white: 0.16, alpha: 1) : UIColor(red: 227.0 / 255, green: 228.0 / 255, blue: 230.0 / 255, alpha: 1)
        stack.axis = .vertical; stack.spacing = 11; stack.translatesAutoresizingMaskIntoConstraints = false
        for v in stack.arrangedSubviews { stack.removeArrangedSubview(v); v.removeFromSuperview() }
        view.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6), stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6), stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 4), stack.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -5)])
        if isVoicePanel { renderVoicePanel(); return }
        let top = UIStackView(); top.spacing = 3; suggestionButtons = []
        let spacer = UIView(); spacer.isHidden = true; toolbarSpace = spacer; top.addArrangedSubview(spacer)
        for index in 0..<3 {
            let b = button("", size: 18) { [weak self] in self?.useSuggestion(index) }; b.backgroundColor = .clear; b.layer.shadowOpacity = 0
            let divider = UIView(); divider.backgroundColor = ink.withAlphaComponent(0.1); divider.translatesAutoresizingMaskIntoConstraints = false; b.addSubview(divider)
            NSLayoutConstraint.activate([divider.trailingAnchor.constraint(equalTo: b.trailingAnchor), divider.centerYAnchor.constraint(equalTo: b.centerYAnchor), divider.widthAnchor.constraint(equalToConstant: 0.5), divider.heightAnchor.constraint(equalToConstant: 24)])
            suggestionButtons.append(b); top.addArrangedSubview(b)
        }
        stack.addArrangedSubview(top)
        for b in suggestionButtons.dropFirst() { b.widthAnchor.constraint(equalTo: suggestionButtons[0].widthAnchor).isActive = true }
        voice.setImage(nil, for: .normal); voice.setTitle("Start Anna", for: .normal)
        voice.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold); voice.setTitleColor(.black, for: .normal)
        voice.backgroundColor = .white; voice.layer.cornerRadius = 17; voice.accessibilityLabel = "Anna voice dictation"
        voice.removeTarget(nil, action: nil, for: .allEvents); voice.addTarget(self, action: #selector(tapVoice), for: .touchUpInside)
        top.addArrangedSubview(voice); voice.widthAnchor.constraint(equalToConstant: 98).isActive = true
        voice.heightAnchor.constraint(equalToConstant: 34).isActive = true
        top.alignment = .center; top.heightAnchor.constraint(equalToConstant: 40).isActive = true
        if emoji {
            for keys in ["😀 😃 😄 😁 😅 😂 🙂 😊", "😍 🥰 😎 🤔 🙄 😢 😭 😡", "👍 👎 👏 🙌 ❤️ 🎉 🔥 ✅"] {
                let r = row(keys.components(separatedBy: " ")); stack.addArrangedSubview(r); r.heightAnchor.constraint(equalToConstant: 43).isActive = true
            }
        } else {
            let rows = numbers ? (symbols ? [Array("[]{}#%^*+="), Array("_\\|~<>€£¥•"), Array(".,?!'")] : [Array("1234567890"), Array("-/:;()$&@\""), Array(".,?!'")]) : [Array("qwertyuiop"), Array("asdfghjkl"), Array("zxcvbnm")]
            for (index, keys) in rows.enumerated() {
                let labels = keys.map { shifted && !numbers ? String($0).uppercased() : String($0) }
                let r: UIView
                if index == 2 {
                    let shift = numbers ? button(symbols ? "123" : "#+=", size: 16) { [weak self] in self?.symbols.toggle(); self?.render() } : icon(capsLock ? "capslock.fill" : shifted ? "shift.fill" : "shift") { [weak self] in
                        guard let self else { return }; let doubleTap = Date().timeIntervalSince(lastShift) < 0.35; lastShift = Date(); capsLock = doubleTap; shifted = doubleTap || !shifted; render()
                    }
                    let delete = icon("delete.left") { [weak self] in self?.textDocumentProxy.deleteBackward(); self?.refreshSuggestions(); self?.autoShift() }
                    delete.addGestureRecognizer(UILongPressGestureRecognizer(target: self, action: #selector(holdDelete(_:))))
                    r = row(labels, leading: shift, trailing: delete)
                } else { r = row(labels, inset: index == 1 && !numbers ? 20 : 0) }
                stack.addArrangedSubview(r); r.heightAnchor.constraint(equalToConstant: 43).isActive = true
            }
        }
        let bottom = UIStackView(); bottom.spacing = 6; stack.addArrangedSubview(bottom)
        let numeric = button(numbers || emoji ? "ABC" : "123", size: 18) { [weak self] in guard let self else { return }; if emoji { emoji = false; numbers = false } else { numbers.toggle() }; symbols = false; render() }
        bottom.addArrangedSubview(numeric); numeric.widthAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.11).isActive = true
        let faces = icon("face.smiling") { [weak self] in self?.emoji.toggle(); self?.render() }; bottom.addArrangedSubview(faces); faces.widthAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.11).isActive = true
        faces.setImage(UIImage(systemName: "face.smiling", withConfiguration: UIImage.SymbolConfiguration(pointSize: 15)), for: .normal)
        let space = button("", size: 18) { [weak self] in self?.insert(" ") }; space.accessibilityLabel = "Space"; space.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(moveCursor(_:)))); bottom.addArrangedSubview(space)
        let enter = icon("return") { [weak self] in self?.insert("\n") }; returnButton = enter; bottom.addArrangedSubview(enter); enter.widthAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.24).isActive = true
        bottom.heightAnchor.constraint(equalToConstant: 43).isActive = true
        // Face ID iPhones supply their own switcher below the extension.
        // Other devices request an in-keyboard switcher through this trait.
        if needsInputModeSwitchKey {
            let globe = icon("globe") {}; globe.accessibilityLabel = "Next keyboard"
            globe.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
            bottom.insertArrangedSubview(globe, at: 1)
            globe.widthAnchor.constraint(equalToConstant: 34).isActive = true
        }
        status.translatesAutoresizingMaskIntoConstraints = false; status.isHidden = true; view.addSubview(status)
        NSLayoutConstraint.activate([status.leadingAnchor.constraint(equalTo: top.leadingAnchor), status.trailingAnchor.constraint(equalTo: voice.leadingAnchor, constant: -6), status.centerYAnchor.constraint(equalTo: top.centerYAnchor)])
        refreshSuggestions(); refreshReturn()
    }
    private func renderVoicePanel() {
        view.backgroundColor = UIColor(white: 0.12, alpha: 1)
        stack.removeFromSuperview()
        let top = UIStackView(); top.translatesAutoresizingMaskIntoConstraints = false
        top.alignment = .center; top.distribution = .equalSpacing
        let close = panelButton("xmark", label: "Cancel dictation") { [weak self] in self?.tapCancel() }
        let finish = panelButton("checkmark", label: "Finish dictation") { [weak self] in self?.tapVoice() }
        finishButton = finish; top.addArrangedSubview(close); top.addArrangedSubview(finish); view.addSubview(top)
        let wave = KeyboardWaveform(); waveform = wave; wave.accessibilityLabel = "Anna audio levels"; wave.isAccessibilityElement = true; wave.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(wave)
        status.textColor = .white; status.font = .systemFont(ofSize: 14); status.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(status)
        NSLayoutConstraint.activate([
            top.topAnchor.constraint(equalTo: view.topAnchor, constant: 8), top.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12), top.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12), top.heightAnchor.constraint(equalToConstant: 44),
            wave.centerXAnchor.constraint(equalTo: view.centerXAnchor), wave.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -10), wave.widthAnchor.constraint(equalToConstant: 118), wave.heightAnchor.constraint(equalToConstant: 42),
            status.topAnchor.constraint(equalTo: wave.bottomAnchor, constant: 10), status.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 22), status.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -22)
        ])
        status.isHidden = false
        if needsInputModeSwitchKey {
            let globe = panelButton("globe", label: "Next keyboard") {}; globe.backgroundColor = .clear; globe.tintColor = .white
            globe.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
            globe.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(globe)
            NSLayoutConstraint.activate([globe.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12), globe.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8)])
        }
        UIView.performWithoutAnimation { waveform?.level = latest.level; view.layoutIfNeeded() }
    }
    private func panelButton(_ symbol: String, label: String, action: @escaping () -> Void) -> UIButton {
        let b = UIButton(type: .system); b.setImage(UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 19, weight: .semibold)), for: .normal)
        b.backgroundColor = .white; b.tintColor = .black; b.layer.cornerRadius = 22; b.accessibilityLabel = label
        b.widthAnchor.constraint(equalToConstant: 44).isActive = true; b.heightAnchor.constraint(equalToConstant: 44).isActive = true
        b.addAction(UIAction { _ in action() }, for: .touchUpInside); return b
    }
    private func refreshReturn() {
        let label: String?
        switch textDocumentProxy.returnKeyType ?? .default {
        case .send: label = "Send"
        case .search: label = "Search"
        case .go: label = "Go"
        case .done: label = "Done"
        case .next: label = "Next"
        case .join: label = "Join"
        default: label = nil
        }
        returnButton?.setTitle(label, for: .normal); returnButton?.setImage(label == nil ? UIImage(systemName: "return") : nil, for: .normal)
        returnButton?.titleLabel?.font = .systemFont(ofSize: 17)
    }
    private var prefix: String { String((textDocumentProxy.documentContextBeforeInput ?? "").split(whereSeparator: { !$0.isLetter && $0 != "'" }).last ?? "") }
    private func refreshSuggestions() {
        let context = textDocumentProxy.documentContextBeforeInput ?? ""
        let word = context.last?.isLetter == true ? prefix : ""
        if word.isEmpty { suggestions = ["I", "The", "I'm"] }
        else {
            let range = NSRange(location: 0, length: (word as NSString).length)
            let completions = checker.completions(forPartialWordRange: range, in: word, language: "en_US") ?? []
            let personal = lexicon.filter { $0.userInput.lowercased().hasPrefix(word.lowercased()) }.map(\.documentText)
            var seen = Set<String>(); suggestions = ([word] + personal + completions).filter { seen.insert($0).inserted }.prefix(3).map { $0 }
        }
        for (i, button) in suggestionButtons.enumerated() { button.setTitle(i < suggestions.count ? suggestions[i] : "", for: .normal) }
    }
    private func useSuggestion(_ index: Int) {
        guard index < suggestions.count else { return }; let value = suggestions[index]
        let context = textDocumentProxy.documentContextBeforeInput ?? ""
        if context.last?.isLetter == true { for _ in prefix { textDocumentProxy.deleteBackward() } }
        insert(value + " ")
    }
    @objc private func holdDelete(_ gesture: UILongPressGestureRecognizer) {
        if gesture.state == .began { textDocumentProxy.deleteBackward(); repeatDelete = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { [weak self] _ in self?.textDocumentProxy.deleteBackward(); self?.refreshSuggestions() } }
        else if gesture.state != .changed { repeatDelete?.invalidate(); repeatDelete = nil; autoShift() }
    }
    @objc private func moveCursor(_ gesture: UIPanGestureRecognizer) {
        if gesture.state == .began { cursorX = 0; mayInsert = false }
        let x = gesture.translation(in: view).x; let offset = Int((x - cursorX) / 8)
        if offset != 0 { textDocumentProxy.adjustTextPosition(byCharacterOffset: offset); cursorX += CGFloat(offset * 8) }
    }
    func updateState(_ supplied: KeyboardState? = nil) {
        latest = supplied ?? AnnaShared.read("state.json", as: KeyboardState.self) ?? KeyboardState()
        if lastRender != (isVoicePanel ? "voice" : "keys") { render() }
        status.textColor = isVoicePanel ? .white : ink
        status.font = .systemFont(ofSize: isVoicePanel ? 14 : 11)
        waveform?.level = latest.level
        finishButton?.isEnabled = latest.phase == "recording"
        finishButton?.alpha = latest.phase == "recording" ? 1 : 0.4
        let message: String
        if isVoicePanel { message = latest.phase == "processing" ? "Transcribing…" : "Listening" }
        else if !hasFullAccess { message = "Enable Allow Full Access for Anna voice. Typing still works." }
        else if !latest.isAvailable { message = "Open Anna → Enable keyboard session, then return here." }
        else if latest.mode == "meeting" { message = "Anna is recording a meeting. Finish it in the app." }
        else if latest.phase == "recording" { message = "Listening \(String(repeating: "▮", count: max(1, Int(latest.level * 8)))) · tap A to finish" }
        else if latest.phase == "completed" && latest.requestID == requested && consumed != requested && !requested.isEmpty {
            if mayInsert && textDocumentProxy.documentContextBeforeInput == before {
                consumed = requested; mayInsert = false; textDocumentProxy.insertText(latest.text)
                message = "Inserted · tap A for another dictation"
            } else { message = "Text ready · tap A to insert into this field" }
        } else { message = latest.phase == "processing" ? "Transcribing…" : latest.message + " · tap A" }
        status.text = message.replacingOccurrences(of: "tap A", with: "tap Start Anna")
        let showHint = !isVoicePanel && (!hasFullAccess || !latest.isAvailable || latest.phase == "error" || latest.mode == "meeting")
        status.isHidden = !isVoicePanel && !showHint
        suggestionButtons.forEach { $0.isHidden = showHint }
        toolbarSpace?.isHidden = !showHint
        voice.setTitle(latest.phase == "completed" && latest.requestID == requested && consumed != requested && !requested.isEmpty ? "Insert text" : "Start Anna", for: .normal)
        voice.isEnabled = latest.phase != "processing" && latest.mode != "meeting"
        voice.alpha = voice.isEnabled ? 1 : 0.5
    }
    @objc private func tapVoice() {
        guard hasFullAccess, latest.isAvailable, latest.mode != "meeting" else { updateState(); return }
        if latest.phase == "completed", latest.requestID == requested, !requested.isEmpty, consumed != requested {
            consumed = requested; mayInsert = false; textDocumentProxy.insertText(latest.text); updateState(); return
        }
        if latest.phase == "recording" { send("finish"); return }
        guard latest.phase != "processing" else { return }
        before = textDocumentProxy.documentContextBeforeInput; mayInsert = true; requested = send("start")
    }
    @objc private func tapCancel() { mayInsert = false; _ = send("cancel") }
    @discardableResult private func send(_ action: String) -> String {
        let command = KeyboardCommand(session: latest.session, action: action)
        do { try AnnaShared.write(command, to: "command.json") } catch { status.text = error.localizedDescription }
        return command.id
    }
}

private final class KeyboardWaveform: UIView {
    private var heights: [NSLayoutConstraint] = []
    var level: Float = 0 { didSet {
        for (i, height) in heights.enumerated() {
            let taper = 1 - Double(abs(i - 5)) / 5 * 0.7
            height.constant = 3 + min(1, max(0, Double(level))) * taper * 30
        }
        UIView.animate(withDuration: 0.12) { self.layoutIfNeeded() }
    } }
    override init(frame: CGRect) {
        super.init(frame: frame)
        let row = UIStackView(); row.spacing = 6; row.alignment = .center; row.translatesAutoresizingMaskIntoConstraints = false; addSubview(row)
        NSLayoutConstraint.activate([row.centerXAnchor.constraint(equalTo: centerXAnchor), row.centerYAnchor.constraint(equalTo: centerYAnchor), row.heightAnchor.constraint(equalToConstant: 42)])
        for _ in 0..<11 {
            let bar = UIView(); bar.backgroundColor = .white; bar.layer.cornerRadius = 1.5; row.addArrangedSubview(bar)
            let h = bar.heightAnchor.constraint(equalToConstant: 3); h.isActive = true; heights.append(h)
            bar.widthAnchor.constraint(equalToConstant: 3).isActive = true
        }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
