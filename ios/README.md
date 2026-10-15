# Anna for iPhone — development preview

Native SwiftUI iPhone app plus a UIKit keyboard extension. Desktop Anna is unaffected.

## Build and install

Open `Anna.xcodeproj`, select the Anna scheme and your iPhone, and run. The project uses automatic signing with team `VAC2837QGB`. Both targets need the App Group `group.io.annatype.anna`. An active Apple Developer membership and an accepted current Program License Agreement are required to provision this capability.

`project.yml` is the XcodeGen source of truth. Regenerate with `xcodegen generate` after changing target settings. Build outputs and personal Xcode settings are ignored by Git.

## First test

1. Open Anna once and grant microphone permission when prompted. Save a personal Deepgram test key in Settings. The key stays in the main app's Keychain, never in the keyboard or source code.
2. iPhone Settings → General → Keyboard → Keyboards → Add New Keyboard → Anna. Select Anna and enable Allow Full Access.
3. In Anna, choose Enable keyboard session. The microphone remains active for a 15-minute session; idle frames are discarded, not saved or uploaded. The app shows an explicit disable button and iOS shows its microphone indicator.
4. Open Messages, select the Anna keyboard with the globe, and tap Start Anna in the permanent toolbar above the keys. During recording, a dark panel replaces the keys and shows live audio levels. Tap the top-right checkmark to finish or the top-left X to cancel. Transcription restores the keys and inserts the result. If the text field changes, automatic insertion is disabled; tap Insert text to insert the completed result deliberately.
5. For a meeting, use Meetings → Start meeting. Recording writes to disk continuously, including while the screen is locked. Finish to upload and transcribe. Rename a speaker to update all their turns; individual turns and their text can also be edited. Play the saved audio to check attribution.

## Limits of this preview

- Apple does not allow replacing the system keyboard microphone or recording directly in a keyboard extension. Anna provides its own keyboard button; its main app owns the microphone. Do not add private API or responder-chain app-launch workarounds.
- The keyboard uses a familiar staggered QWERTY layout, emoji/symbol panels, caps lock, hold-to-delete, and space-bar cursor dragging. Suggestions are local completions from UITextChecker and Apple's supplementary lexicon; they are not Apple's predictive text engine. Return adopts the host field's requested label and inserts a newline. The host app decides what that input does; Messages sends via its own arrow above the keyboard.
- Voice requires Full Access and an active main-app session. Basic QWERTY typing works without Full Access. Secure fields and apps that prohibit custom keyboards use the system keyboard.
- Dictation has a 15-minute recording limit with a warning in the final 30 seconds. Meetings have no product time limit. Battery, storage and iOS audio interruptions still apply.
- Audio is saved locally and sent to Deepgram Nova-3 after recording. Meetings request speaker diarization; inferred voices require review and do not establish a person's identity. Microphone placement and overlapping voices affect accuracy.
- Keep Anna open while processing long meetings. If a request fails or background execution expires, saved audio can be retried. Phone recording, locking and keyboard insertion must be tested on an actual device; simulator checks cannot prove those behaviors.
- This personal-device preview uses a Keychain API key. A distributed product should use authenticated server-side credentials, a background upload queue, account sync and production onboarding. This app does not yet sync desktop meetings or include the desktop model comparison options.

## Validation

`xcodebuild -project Anna.xcodeproj -scheme Anna -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test`

Tests cover speaker turn grouping, global speaker renaming, and rejecting stale/off keyboard sessions.
