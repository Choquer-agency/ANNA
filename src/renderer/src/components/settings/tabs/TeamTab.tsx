import { useState, useEffect } from 'react'
import { Users, BookOpen, BarChart3, MessageSquare, Shield, Library, Sparkles, CheckCircle } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'

type View = 'explainer' | 'form' | 'success'

const TEAM_SIZES = ['2-5', '6-15', '16-50', '51-200', '200+']

export function TeamTab(): React.JSX.Element {
  const [view, setView] = useState<View>('explainer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      window.annaAPI.getUsername(),
      window.annaAPI.refreshProfile(),
    ]).then(([username, profile]) => {
      if (username) setName(username)
      if (profile?.email) setEmail(profile.email)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!name || !email || !company || !teamSize) return

    setSubmitting(true)
    setError('')
    try {
      await window.annaAPI.submitTeamWaitlist({ name, email, company, teamSize })
      setView('success')
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (view === 'success') {
    return (
      <div className="max-w-lg">
        <SettingsCard>
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="mx-auto text-green-500" size={40} />
            <h3 className="text-lg font-semibold text-ink">You're on the list!</h3>
            <p className="text-sm text-ink-muted">
              We'll reach out when Anna Teams is ready. Thanks for your interest.
            </p>
          </div>
        </SettingsCard>
      </div>
    )
  }

  if (view === 'form') {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink mb-1">Join the Waitlist</h2>
          <p className="text-sm text-ink-muted">
            Tell us about your team and we'll be in touch.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-transparent text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-transparent text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-transparent text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring"
              placeholder="Company name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Number of Employees</label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring"
              required
            >
              <option value="">Select team size</option>
              {TEAM_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-accent-red">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !name || !email || !company || !teamSize}
              className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => setView('explainer')}
              className="text-sm text-ink-muted hover:text-ink"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <SettingsCard>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="text-primary" size={22} />
            </div>
            <h2 className="text-lg font-semibold text-ink">Anna Teams</h2>
          </div>

          <p className="text-sm text-ink-secondary leading-relaxed">
            We're building Anna for teams — bringing voice-first writing to your entire
            organization with tools that make everyone better.
          </p>

          <div className="space-y-3">
            {[
              { icon: BarChart3, text: 'Activity digests — daily and weekly team summaries' },
              { icon: Sparkles, text: 'Dictation coaching — quality trends and tips per member' },
              { icon: BookOpen, text: 'Shared dictionary — company terminology synced to everyone' },
              { icon: MessageSquare, text: 'Shared styles — consistent brand voice across the org' },
              { icon: Shield, text: 'Admin review — coach and QA team dictations' },
              { icon: Library, text: 'Vocabulary packs — domain-specific terms at the org level' },
              { icon: Users, text: 'Cross-app summaries — daily recaps of team communication' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <Icon className="text-ink-muted mt-0.5 shrink-0" size={16} />
                <span className="text-sm text-ink-muted">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView('form')}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            Join Waitlist
          </button>
        </div>
      </SettingsCard>
    </div>
  )
}
