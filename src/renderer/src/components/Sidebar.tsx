import {
  Home,
  BookOpen,
  FileText,
  Type,
  StickyNote,
  Settings,
  HelpCircle
} from 'lucide-react'
import { AnnaLogo } from './AnnaLogo'

export type Page = 'home' | 'dictionary' | 'snippets' | 'style' | 'notes' | 'help'

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dictionary', label: 'Dictionary', icon: BookOpen },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'style', label: 'Style', icon: Type },
  { id: 'notes', label: 'Notes', icon: StickyNote }
]

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  settingsOpen?: boolean
  onSettingsOpen?: () => void
}

export function Sidebar({ currentPage, onNavigate, settingsOpen, onSettingsOpen }: SidebarProps): React.JSX.Element {
  return (
    <div
      className="w-56 flex flex-col h-full shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic light spacer */}
      <div className="h-10 shrink-0" />

      {/* Logo */}
      <div
        className="px-5 pb-6"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <AnnaLogo className="h-5 text-ink" />
          <span className="text-[10px] font-semibold bg-primary text-white px-1.5 py-0.5 rounded-full">
            Pro
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === currentPage
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors duration-200 ${
                isActive
                  ? 'font-bold text-primary'
                  : 'font-semibold text-ink-muted hover:bg-primary-soft cursor-pointer'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-3 pb-5 space-y-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => onSettingsOpen?.()}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
            settingsOpen
              ? 'bg-primary-soft font-bold text-primary'
              : 'font-semibold text-ink-muted hover:text-ink hover:bg-surface-alt/60 cursor-pointer'
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={() => onNavigate('help')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
            currentPage === 'help'
              ? 'bg-primary-soft font-bold text-primary'
              : 'font-semibold text-ink-muted hover:text-ink hover:bg-surface-alt/60 cursor-pointer'
          }`}
        >
          <HelpCircle size={18} />
          <span>Help</span>
        </button>
      </div>
    </div>
  )
}
