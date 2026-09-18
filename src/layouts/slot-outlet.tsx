import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useContext, useSyncExternalStore, type ReactNode } from 'react'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { RuntimeContext } from '@/provider/runtime/context'
import { reportError, silentTelemetry } from '@/services/telemetry'
import { shellSlots, type ShellSlotName, type ShellSlotProps, type ShellSlotRegistration } from './slots'

const tx = createTextTranslator('shell.ui')
function SlotContent({ entry, props }: { entry: ShellSlotRegistration; props: ShellSlotProps }) {
  if (entry.match && !entry.match(props.pathname ?? '')) return null
  const Component = entry.component
  return <Component {...props} />
}
export function ShellSlotOutlet({
  slot,
  fallback = null,
  ...props
}: ShellSlotProps & { slot: ShellSlotName; fallback?: ReactNode }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const runtime = useContext(RuntimeContext)
  const entries = useSyncExternalStore(shellSlots.subscribe, shellSlots.getSnapshot, shellSlots.getSnapshot)
  const matching = entries.filter(entry => entry.slot === slot)
  if (!matching.length) return fallback
  return matching.map(entry => (
    <ErrorBoundary
      key={entry.id}
      label={tx('扩展')}
      onError={error => reportError(runtime?.telemetry ?? silentTelemetry, error, `slot:${entry.id}`)}
    >
      <SlotContent entry={entry} props={props} />
    </ErrorBoundary>
  ))
}
