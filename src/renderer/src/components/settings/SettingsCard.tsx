import { Children, type ReactNode } from 'react'

export function SettingsCard({
  title,
  children
}: {
  title?: string
  children: ReactNode
}): React.JSX.Element {
  const items = Children.toArray(children)

  return (
    <div>
      {title && (
        <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 px-1">
          {title}
        </h3>
      )}
      <div className="rounded-2xl" style={{ backgroundColor: '#FFFAF4' }}>
        {items.map((child, i) => (
          <div
            key={i}
            style={i < items.length - 1 ? { borderBottom: '1px solid #FFEBD0' } : undefined}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
