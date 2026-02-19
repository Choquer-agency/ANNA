import { useState } from 'react'
import { SettingsSidebar, type SettingsTab } from './SettingsSidebar'
import { GeneralTab } from './tabs/GeneralTab'
import { SystemTab } from './tabs/SystemTab'
import { ProfileTab } from './tabs/ProfileTab'
import { TeamTab } from './tabs/TeamTab'
import { SubscriptionTab } from './tabs/SubscriptionTab'
import { PrivacyTab } from './tabs/PrivacyTab'
import { VersionTab } from './tabs/VersionTab'

const tabTitles: Record<SettingsTab, string> = {
  general: 'General',
  system: 'System',
  profile: 'Profile',
  team: 'Team',
  subscription: 'Subscription',
  privacy: 'Privacy',
  version: 'Version'
}

export function SettingsPage({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  function renderTab(): React.JSX.Element {
    switch (activeTab) {
      case 'general': return <GeneralTab />
      case 'system': return <SystemTab />
      case 'profile': return <ProfileTab />
      case 'team': return <TeamTab />
      case 'subscription': return <SubscriptionTab />
      case 'privacy': return <PrivacyTab />
      case 'version': return <VersionTab />
    }
  }

  return (
    <div className="flex h-full">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <h1 className="text-2xl font-semibold text-ink mb-6">{tabTitles[activeTab]}</h1>
        <div className="max-w-2xl">
          {renderTab()}
        </div>
      </div>
    </div>
  )
}
