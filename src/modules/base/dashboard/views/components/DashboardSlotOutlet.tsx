import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import type { DashboardSlotRegistration, DashboardSlotName } from '@/provider/extensions/dashboard'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

function SlotContent({ registration }: { registration: DashboardSlotRegistration }) {
  return registration.render()
}

export interface DashboardSlotOutletProps {
  slot?: DashboardSlotName
  fallback?: ReactNode
}

/**
 * 框架页面使用的稳定出口。没有业务注册时返回 fallback（默认为空）。
 */
export function DashboardSlotOutlet({ slot = 'main', fallback = null }: DashboardSlotOutletProps) {
  const tx = useTextTranslator('base.dashboard.ui')
  const { getSnapshot: getDashboardSlotsSnapshot, subscribe: subscribeDashboardSlots } = useRuntime().dashboard

  const localeRevision = useLocaleRevision()
  void localeRevision

  const registrations = useSyncExternalStore(
    subscribeDashboardSlots,
    getDashboardSlotsSnapshot,
    getDashboardSlotsSnapshot,
  )
  const visibleRegistrations = registrations.filter(registration => registration.slot === slot)

  if (visibleRegistrations.length === 0) return fallback

  return (
    <>
      {visibleRegistrations.map(registration => (
        <ErrorBoundary key={registration.id} label={tx('首页扩展')}>
          <SlotContent registration={registration} />
        </ErrorBoundary>
      ))}
    </>
  )
}
