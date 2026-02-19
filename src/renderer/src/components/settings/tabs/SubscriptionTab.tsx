import { SettingsCard } from '../SettingsCard'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

export function SubscriptionTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  return (
    <div className="space-y-6">
      <SettingsCard title="Current Plan">
        <div className="px-5 py-5">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-semibold text-ink">Anna Pro</span>
            <span className="text-sm text-ink-muted">$XX/yr</span>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="px-4 py-2 text-sm text-ink-secondary border border-border rounded-xl hover:bg-surface-alt transition-colors">
              View features
            </button>
            <button onMouseMove={onMouseMove} className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all">
              <span className="relative z-[2]">Manage subscription</span>
            </button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Collaborate">
        <div className="px-5 py-5">
          <h3 className="text-sm font-medium text-ink mb-1">Use Anna with your team</h3>
          <p className="text-xs text-ink-muted mb-4">Share dictionaries, snippets, and more</p>
          <button onMouseMove={onMouseMove} className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all">
            <span className="relative z-[2]">Invite team</span>
          </button>
        </div>
      </SettingsCard>

      <div className="flex items-center justify-between px-1">
        <button className="text-xs text-primary hover:underline">Subscription FAQ</button>
        <button className="text-xs text-ink-muted hover:text-ink">Questions? Get in touch</button>
      </div>
    </div>
  )
}
