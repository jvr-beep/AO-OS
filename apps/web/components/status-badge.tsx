// AO-OS StatusBadge using semantic tokens and icon+label
import { ReactNode } from 'react'

const STATUS_MAP: Record<string, { color: string; icon: ReactNode; label: string }> = {
  available: { color: 'bg-status-available text-surface-0', icon: '●', label: 'Available' },
  held: { color: 'bg-status-held text-surface-0', icon: '●', label: 'Held' },
  occupied: { color: 'bg-status-occupied text-surface-0', icon: '●', label: 'Occupied' },
  cleaning: { color: 'bg-status-cleaning text-surface-0', icon: '●', label: 'Cleaning' },
  'out_of_service': { color: 'bg-status-out-of-service text-surface-0', icon: '●', label: 'Out of Service' },
  active: { color: 'bg-success text-surface-0', icon: '●', label: 'Active' },
  inactive: { color: 'bg-critical text-surface-0', icon: '●', label: 'Inactive' },
  cancelled: { color: 'bg-critical text-surface-0', icon: '●', label: 'Cancelled' },
  completed: { color: 'bg-success text-surface-0', icon: '●', label: 'Completed' },
  warning: { color: 'bg-warning text-surface-0', icon: '●', label: 'Warning' },
  info: { color: 'bg-info text-surface-0', icon: '●', label: 'Info' },
  critical: { color: 'bg-critical text-surface-0', icon: '●', label: 'Critical' },
  // fallback
  default: { color: 'bg-surface-2 text-text-primary', icon: '●', label: '' },
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] || STATUS_MAP['default']
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entry.color}`}>
      <span className="text-base leading-none">{entry.icon}</span>
      {entry.label || status}
    </span>
  )
}
