# ANNA — Wispr Flow Clone: Build Plan

> **Goal:** Build a native macOS voice dictation app that mirrors Wispr Flow's core experience - Called ANNA — system-wide AI-powered transcription with a polished companion UI, full session history, and smart post-processing.

---

## Tech Stack Overview

| Layer | Technology | Why |
|---|---|---|
| Desktop App Shell | **Electron** (Node.js + React) | Cross-platform path, fastest to prototype UI, avoids Swift learning curve |
| UI Framework | **React + Tailwind CSS** | Component-based, easy to achieve Wispr's clean aesthetic |
| Audio Capture | **node-microphone** or **naudiodon** (PortAudio bindings) | Reliable cross-platform mic access from Node |
| Voice Activity Detection | **@ricky0123/vad-web** (Silero VAD) | Detects speech start/stop, avoids silence being sent to API |
| Speech-to-Text | **OpenAI Whisper API** (`whisper-1`) | Best accuracy, fast, handles filler word removal |
| AI Post-Processing | **Claude API** (`claude-opus-4-6` or `claude-sonnet-4-6`) | Cleans transcripts, adapts tone to target app context |
| Text Injection | **@nut-tree/nut-js** or **robotjs** | Simulates keyboard paste into the active window |
| Global Hotkeys | **electron-globalShortcut** | System-wide push-to-talk trigger |
| Database (local) | **SQLite via better-sqlite3** | Stores session history, dictionary, snippets, stats |
| Active App Detection | **active-win** npm package | Detects which app is in focus for context-aware prompting |
| Audio File Storage | Local filesystem (`.webm` / `.wav`) | Stores raw audio per session for "Download Audio" feature |

---

## App Architecture

```
┌─────────────────────────────────────┐
│          Electron Main Process       │
│  - Global hotkey listener            │
│  - Active window detection           │
│  - Audio capture & VAD               │
│  - Whisper API call                  │
│  - Claude post-processing            │
│  - Text injection                    │
│  - SQLite session logging            │
└──────────────┬──────────────────────┘
               │ IPC Bridge
┌──────────────▼──────────────────────┐
│        React Renderer (UI)           │
│  - Home dashboard + session log      │
│  - Dictionary / Snippets / Style     │
│  - Notes                             │
│  - Settings                          │
└─────────────────────────────────────┘
```

---

## Phase 1: Foundation & Audio Pipeline
**Goal:** Record audio via hotkey, transcribe it, inject it into the active app.

### 1.1 Project Scaffold
- [ ] Init Electron + React app using `electron-vite` (cleanest setup)
- [ ] Set up Tailwind CSS with custom design tokens matching Wispr's aesthetic (cream/off-white bg, dark text, minimal chrome)
- [ ] Configure `better-sqlite3` and create initial DB schema:
  - `sessions` table: `id`, `created_at`, `raw_transcript`, `processed_transcript`, `audio_path`, `app_context`, `word_count`, `duration_seconds`, `status`
  - `snippets` table: `id`, `trigger`, `expansion`, `created_at`
  - `dictionary` table: `id`, `word`, `replacement`
  - `settings` table: `key`, `value`

### 1.2 Global Hotkey + Audio Capture
- [ ] Register a global hotkey (default: `Option+Space`, user-configurable) via `electron.globalShortcut`
- [ ] On keydown: begin audio recording via `naudiodon` or `node-microphone`, write to temp `.wav` file
- [ ] Implement Silero VAD to auto-stop if user goes silent for >1.5 seconds
- [ ] On keyup (or VAD silence): stop recording, save audio file to `~/Library/Application Support/VoiceFlow/audio/{session_id}.wav`

### 1.3 Transcription
- [ ] POST audio file to **OpenAI Whisper API** (`/v1/audio/transcriptions`)
- [ ] Receive raw transcript
- [ ] Detect active app using `active-win` — capture `app.name` and `app.bundleId`

### 1.4 AI Post-Processing
- [ ] Send raw transcript + app context to **Claude API** with a system prompt like:
  ```
  You are a voice transcription post-processor. Clean up the transcript:
  remove filler words (um, uh, like), fix punctuation, and adapt the 
  tone for the target app context: {app_name}. 
  Return only the cleaned text, nothing else.
  ```
- [ ] Apply user's custom Dictionary replacements (simple string replace after LLM call)
- [ ] Apply Snippets expansion (trigger word → full expansion)

### 1.5 Text Injection
- [ ] Use `robotjs` or `@nut-tree/nut-js` to:
  1. Copy processed transcript to clipboard
  2. Simulate `Cmd+V` into the active window
- [ ] Fallback: if injection fails, show a floating "Click to copy" toast notification

### 1.6 Session Logging
- [ ] On each successful transcription, write to `sessions` table with all fields
- [ ] Save processed + raw transcript, audio file path, app context, word count, duration
- [ ] Track cumulative stats in `settings`: `total_words`, `total_sessions`, `first_session_date`

**Phase 1 Deliverable:** Working push-to-talk dictation that transcribes and pastes text into any app. Sessions logged to SQLite.

---

## Phase 2: Core UI — Home Dashboard & Session History
**Goal:** Build the companion app UI matching Wispr's layout.

### 2.1 App Shell & Sidebar
- [ ] Left sidebar with navigation: Home, Dictionary, Snippets, Style, Notes, Settings, Help
- [ ] Sidebar icons matching Wispr's style (use Lucide React icons)
- [ ] Pro badge indicator on the logo
- [ ] Bottom sidebar: "Invite your team," "Get a free month," Settings, Help

### 2.2 Home Dashboard
- [ ] Header: "Welcome back, {name}" with stats row:
  - 🌟 **X weeks** (weeks since first session)
  - 🚀 **X words** (total words dictated, formatted as `238.4K`)
  - 🏆 **X WPM** (rolling average words per minute)
- [ ] "Make Flow sound like you" promo card (Style feature CTA)
- [ ] **Session History Feed** — today's sessions listed chronologically:
  - Timestamp (e.g., `02:15 PM`)
  - Processed transcript preview (truncated at ~200 chars with expand)
  - On hover: reveal action buttons

### 2.3 Session History Item — Actions
Each session card should expose on hover:
- **Copy Transcript** button — copies processed text to clipboard with a confirmation toast
- **More Options** dropdown:
  - 🔄 **Retry Transcription** — re-sends audio file through Whisper + Claude pipeline
  - ⬇️ **Download Audio** — triggers file download of the `.wav` for that session
  - 📋 **Copy Raw Transcript** — copies pre-LLM text
  - ❌ **Delete Session** — removes from DB and deletes audio file
- **App context badge** — small icon/label showing which app it was dictated into (e.g., "Chrome", "Slack")

### 2.4 Date Grouping
- [ ] Group sessions by date: TODAY, YESTERDAY, then date headers (e.g., `FEB 15`)
- [ ] Infinite scroll or "Load More" pagination for older sessions

**Phase 2 Deliverable:** Full home dashboard with real session history, copy actions, and retry/download functionality.

---

## Phase 3: Dictionary, Snippets & Style
**Goal:** Let users customize how ANNA processes their voice.

### 3.1 Dictionary
- [ ] Table view of custom word mappings (e.g., "choquer" → "Choquer Creative")
- [ ] Add/edit/delete entries
- [ ] Applied as a post-processing step after LLM cleaning
- [ ] Handles proper nouns, brand names, technical terms the STT gets wrong

### 3.2 Snippets
- [ ] Trigger word + expansion pairs (e.g., "myemail" → "bryce@choquercreative.com")
- [ ] Expanded inline after transcription before injection
- [ ] Support multi-word triggers

### 3.3 Style Profiles
- [ ] Per-app style configuration — user can set tone for:
  - **Messages** (iMessage, WhatsApp): casual, no punctuation
  - **Work Chats** (Slack, Teams): professional-casual
  - **Emails**: formal, full punctuation
  - **Other / Default**: neutral
- [ ] Each profile has a custom system prompt addendum sent to Claude
- [ ] App detection (`active-win`) routes to the right profile automatically
- [ ] UI shows profile cards, each editable with a text area for custom instructions

**Phase 3 Deliverable:** Users can fully personalize vocabulary and writing style per context.

---

## Phase 4: Notes & Advanced Features
**Goal:** Add the Notes section and power-user features.

### 4.1 Notes
- [ ] Dedicated notes area where users can dictate longer-form content
- [ ] Rich text display (markdown rendered)
- [ ] Notes are saved separately from the session log
- [ ] "New Note" button opens a blank note; user activates hotkey and dictates into it directly

### 4.2 Floating Overlay (Recording Indicator)
- [ ] When recording is active, show a small floating overlay on screen:
  - Pulsing red dot + waveform animation
  - Shows current detected app context
  - Draggable, always on top
- [ ] Overlay disappears after injection with a brief success flash

### 4.3 Retry Pipeline
- [ ] **Retry** re-reads the saved `.wav` file and re-runs Whisper + Claude
- [ ] User can optionally edit the system prompt for a one-off retry (e.g., "Make this more formal")
- [ ] Result replaces the session's processed transcript

### 4.4 Settings Panel
- [ ] **Hotkey configuration** — rebind push-to-talk key
- [ ] **API keys** — OpenAI and Anthropic key input (stored in macOS Keychain via `keytar`)
- [ ] **Default style** — choose fallback style profile
- [ ] **Audio quality** — 16kHz vs 44.1kHz recording
- [ ] **Auto-paste toggle** — disable auto-inject, always require manual copy
- [ ] **Launch at login** toggle

**Phase 4 Deliverable:** Complete app experience with Notes, floating recording indicator, retry UX, and full settings.

---

## Phase 5: Polish, Performance & Distribution
**Goal:** Make it shippable.

### 5.1 Performance
- [ ] Move audio processing and API calls to a Node worker thread to avoid blocking UI
- [ ] Cache `active-win` results to avoid redundant lookups
- [ ] Optimize SQLite queries with indexes on `created_at`

### 5.2 Onboarding Flow
- [ ] First-launch wizard:
  1. Request Accessibility permissions (required for text injection)
  2. Request Microphone permissions
  3. API key setup
  4. Hotkey configuration
  5. Record a test dictation
- [ ] Graceful permission error states with instructions

### 5.3 UI Polish
- [ ] Match Wispr's exact color palette: warm off-white background (`#F9F7F3`), dark text (`#1A1A1A`), subtle card borders
- [ ] Custom app icon
- [ ] Smooth transitions on session card hover states
- [ ] Toast notification system for copy confirmations, errors, retries
- [ ] Empty state for no sessions yet

### 5.4 Error Handling
- [ ] API failure → log session as `status: 'failed'`, show retry option
- [ ] No internet → queue session locally, retry when online
- [ ] Injection failure → show clipboard fallback toast every time

### 5.5 Distribution
- [ ] Package with `electron-builder` for macOS `.dmg`
- [ ] Code sign with Apple Developer certificate (required for Accessibility permissions to work reliably)
- [ ] Auto-update via `electron-updater` pointing to a GitHub Releases feed

**Phase 5 Deliverable:** Signed, distributable `.dmg` ready for beta testing.

---

## File Structure

```
ANNA/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   ├── hotkey.ts            # Global shortcut registration
│   │   ├── audio.ts             # Mic capture, VAD, file saving
│   │   ├── transcribe.ts        # Whisper API call
│   │   ├── process.ts           # Claude post-processing
│   │   ├── inject.ts            # Text injection via robotjs
│   │   ├── activeWindow.ts      # active-win wrapper
│   │   └── db.ts                # SQLite setup & queries
│   ├── renderer/                # React app
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Dashboard + session feed
│   │   │   ├── Dictionary.tsx
│   │   │   ├── Snippets.tsx
│   │   │   ├── Style.tsx
│   │   │   └── Notes.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SessionCard.tsx  # History item with actions
│   │   │   ├── StatsBar.tsx
│   │   │   ├── Overlay.tsx      # Floating recording indicator
│   │   │   └── Toast.tsx
│   │   └── hooks/
│   │       ├── useSessions.ts
│   │       └── useStats.ts
│   └── shared/
│       └── types.ts             # Shared TypeScript interfaces
├── electron.vite.config.ts
├── package.json
└── PLAN.md                      # This file
```

---

## MVP Scope (Phases 1–2)

To get a working prototype fast, prioritize in this order:

1. Audio capture → Whisper → inject (the core loop works)
2. Session logging to SQLite
3. Home UI with session feed, Copy Transcript, and More Options
4. Retry and Download Audio on each session

Everything else (Dictionary, Snippets, Style, Notes) is additive polish on top of that working core.

---

## Key Gotchas for Claude Code / Cursor

- **Accessibility permissions on macOS:** `robotjs` and `nut-js` require the app to be granted Accessibility access in System Preferences. During development, add your Terminal and Electron dev binary to the list.
- **Audio file format:** Whisper API accepts `.wav`, `.mp3`, `.webm`. Record as 16kHz mono `.wav` — smallest file size, fastest upload, best Whisper accuracy.
- **Electron + native modules:** `better-sqlite3`, `naudiodon`, and `robotjs` are native Node modules. They must be rebuilt for the Electron Node version using `electron-rebuild` after `npm install`.
- **VAD threshold tuning:** Start with Silero VAD's default sensitivity. Users in noisy environments will need a manual sensitivity slider in settings.
- **Text injection race condition:** After simulating `Cmd+V`, add a 50ms delay before restoring clipboard — some apps read clipboard asynchronously.