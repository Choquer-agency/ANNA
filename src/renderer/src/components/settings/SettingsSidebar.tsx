import { useState, useEffect } from 'react'
import { SlidersHorizontal, Monitor, User, Users, CreditCard, ShieldCheck, Info } from 'lucide-react'

export type SettingsTab = 'general' | 'system' | 'profile' | 'team' | 'subscription' | 'privacy' | 'version'

const groups = [
  {
    label: 'PREFERENCES',
    tabs: [
      { id: 'general' as SettingsTab, label: 'General', icon: SlidersHorizontal },
      { id: 'system' as SettingsTab, label: 'System', icon: Monitor }
    ]
  },
  {
    label: 'ACCOUNT',
    tabs: [
      { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
      { id: 'team' as SettingsTab, label: 'Team', icon: Users },
      { id: 'subscription' as SettingsTab, label: 'Subscription', icon: CreditCard },
      { id: 'privacy' as SettingsTab, label: 'Privacy', icon: ShieldCheck }
    ]
  },
  {
    label: 'APP',
    tabs: [
      { id: 'version' as SettingsTab, label: 'Version', icon: Info }
    ]
  }
]

export function SettingsSidebar({
  activeTab,
  onTabChange
}: {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}): React.JSX.Element {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.annaAPI.getAppVersion().then(setVersion).catch(() => {})
  }, [])

  return (
    <div className="w-48 h-full border-r py-6 px-3 shrink-0 flex flex-col" style={{ backgroundColor: '#FFFAF4', borderColor: '#FFEBD0' }}>
      <div className="flex-1">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-3 mb-2">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'font-bold text-primary'
                        : 'font-semibold text-ink-muted hover:bg-primary-soft cursor-pointer'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {version && (
          <div className="text-[10px] text-ink-faint px-3 mt-3">v{version}</div>
        )}
      </div>
    </div>
  )
}
