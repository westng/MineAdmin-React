import { Badge } from '@/components/reui/primitives/badge'
import { isActive, statusLabels } from '../data/display'

export function TaskStatus({ status }: { status: string }) {
  const variant =
    status === 'succeeded'
      ? 'success-light'
      : ['failed', 'timed_out'].includes(status)
        ? 'destructive-light'
        : ['partial_success', 'cancelling'].includes(status)
          ? 'warning-light'
          : isActive(status)
            ? 'primary-light'
            : 'secondary'

  return (
    <Badge variant={variant}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabels[status] || status}
    </Badge>
  )
}
