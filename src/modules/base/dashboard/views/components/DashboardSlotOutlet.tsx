import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import type { DashboardSlotRegistration } from '../../register-dashboard-slot'
import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  getDashboardSlotsSnapshot,
  subscribeDashboardSlots,
  type DashboardSlotName,
} from '../../register-dashboard-slot'

const tx = createTextTranslator('base.dashboard.ui')

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
