'use client'

import { useConnectionStatus } from '@/stores/price-store'

const STATUS_CONFIG = {
  connected: { color: 'bg-success', label: 'LIVE' },
  reconnecting: { color: 'bg-warning', label: 'CONNECTING' },
  disconnected: { color: 'bg-danger', label: 'OFFLINE' },
} as const

export default function ConnectionDot() {
  const status = useConnectionStatus()
  const config = STATUS_CONFIG[status]

  return (
    <div data-testid="connection-dot" className="flex items-center gap-1">
      <span className={`size-2 rounded-full ${config.color}`} />
      <span className="text-xs text-text-muted">{config.label}</span>
    </div>
  )
}
