interface PlaceholderPanelProps {
  title: string
  phaseNote: string
}

export default function PlaceholderPanel({ title, phaseNote }: PlaceholderPanelProps) {
  return (
    <div
      className="bg-bg-panel rounded-lg p-4"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">{title}</h2>
      <p className="text-xs text-text-muted">{phaseNote}</p>
    </div>
  )
}
