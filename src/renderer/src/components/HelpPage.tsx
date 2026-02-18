import { useState, useEffect } from 'react'
import { Keyboard, Mic, Wand2, Type } from 'lucide-react'

export function HelpPage(): React.JSX.Element {
  const [hotkey, setHotkey] = useState('Alt+Space')

  useEffect(() => {
    window.annaAPI.getSetting('hotkey').then((val) => {
      if (val) setHotkey(val)
    })
  }, [])

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink mb-8">Help</h1>

      {/* Keyboard Shortcuts */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <Keyboard size={18} />
          Keyboard Shortcuts
        </h2>
        <div className="bg-surface-alt rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-ink-secondary">Start / Stop Recording</td>
                <td className="px-4 py-3 text-right">
                  <kbd className="px-2 py-1 bg-surface-raised border border-border rounded-lg text-xs font-mono">{hotkey}</kbd>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-ink-secondary">Stop Recording (while recording)</td>
                <td className="px-4 py-3 text-right">
                  <kbd className="px-2 py-1 bg-surface-raised border border-border rounded-lg text-xs font-mono">Esc</kbd>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <Mic size={18} />
          How It Works
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">1</span>
            <p className="text-sm text-ink-secondary">
              <strong>Record</strong> — Press <kbd className="px-1.5 py-0.5 bg-surface-alt rounded-lg text-xs font-mono">{hotkey}</kbd> to start recording your voice. A small indicator appears at the top of your screen.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm text-ink-secondary">
              <strong>Transcribe & Process</strong> — Press the hotkey again to stop. ANNA transcribes your speech and refines it using AI, applying your style profiles, dictionary, and snippets.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">3</span>
            <p className="text-sm text-ink-secondary">
              <strong>Paste</strong> — The polished text is automatically typed into whatever app you were using when you started recording.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <Wand2 size={18} />
          Features
        </h2>
        <ul className="space-y-2 text-sm text-ink-secondary">
          <li><strong>Dictionary</strong> — Teach ANNA how to spell names, acronyms, and technical terms.</li>
          <li><strong>Snippets</strong> — Define trigger words that expand into longer text automatically.</li>
          <li><strong>Style Profiles</strong> — Customize how ANNA formats text per app (casual for Messages, formal for Email).</li>
          <li><strong>Notes</strong> — Dictate directly into ANNA's built-in notes when the Notes page is focused.</li>
        </ul>
      </section>

      {/* Version */}
      <section>
        <h2 className="text-lg font-semibold text-ink mb-2 flex items-center gap-2">
          <Type size={18} />
          About
        </h2>
        <p className="text-sm text-ink-muted">ANNA v1.0.0</p>
      </section>
    </>
  )
}
