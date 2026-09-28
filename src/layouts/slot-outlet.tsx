import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { Suspense, useSyncExternalStore, type ReactNode } from 'react'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { reportError, silentTelemetry } from '@/services/telemetry'
import { type ShellSlotName, type ShellSlotProps, type ShellSlotRegistration } from './slots'

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
  const tx = useTextTranslator('shell.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const runtime = useRuntime()
  const registry = runtime.slots
  const entries = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
  const matching = entries.filter(entry => entry.slot === slot)
  if (!matching.length) return fallback
  return matching.map(entry => (
    <ErrorBoundary
      key={entry.id}
      label={tx('扩展')}
      onError={error => reportError(runtime?.telemetry ?? silentTelemetry, error, `slot:${entry.id}`)}
    >
      <Suspense fallback={fallback}>
        <SlotContent entry={entry} props={props} />
      </Suspense>
    </ErrorBoundary>
  ))
}
