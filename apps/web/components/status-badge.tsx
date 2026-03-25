type Variant = 'default' | 'success' | 'warning' | 'danger'

const AUTO_VARIANTS: Record<string, Variant> = {
  active: 'success',
  assigned: 'success',
  occupied: 'warning',
  posted: 'success',
  voided: 'danger',
  available: 'success',
  ok: 'success',
  inventory: 'default',
  maintenance: 'danger',
  retired: 'danger',
  cancelled: 'danger',
  inactive: 'danger',
  waitlisted: 'warning',
  reserved: 'default',
  checked_in: 'success',
  checked_out: 'default',
  cleaning: 'warning',
  out_of_service: 'danger',
  open: 'default',
  in_progress: 'warning',
  completed: 'success',
  charge: 'danger',
  payment: 'success',
  credit: 'success',
  refund: 'warning',
  unlock: 'success',
  lock: 'default',
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status, variant }: { status: string; variant?: Variant }) {
  const v = variant ?? AUTO_VARIANTS[status] ?? 'default'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANT_CLASSES[v]}`}
    >
      {status}
    </span>
  )
}
