export function SettingsRow({
  label,
  description,
  children
}: {
  label: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="px-5 py-4 flex items-center justify-between">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm text-ink">{label}</div>
        {description && (
          <div className="text-xs text-ink-muted mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
