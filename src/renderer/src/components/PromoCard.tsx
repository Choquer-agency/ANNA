interface PromoCardProps {
  onStartNow?: () => void
}

export function PromoCard({ onStartNow }: PromoCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl p-6 hover:scale-[1.005] transition-transform promo-mesh">
      <h2 className="text-xl font-semibold text-ink mb-2">
        Make ANNA sound like <em>you</em>
      </h2>
      <p className="text-sm font-medium text-ink-secondary mb-4">
        ANNA adapts to how you write in different apps. Personalize your style for{' '}
        <strong>messages</strong>, <strong>work chats</strong>, <strong>emails</strong>, and{' '}
        <strong>other apps</strong> so every word sounds like you.
      </p>
      <button
        onClick={onStartNow}
        className="px-5 py-2 bg-primary text-white text-sm rounded-full hover:bg-primary-hover active:scale-[0.98] transition-all"
      >
        Start now
      </button>
    </div>
  )
}
