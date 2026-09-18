import type { AppRuntime } from '@/provider/runtime/context'
import type { Disposer } from '@/services/registry'
/** Application-specific integrations are provided through the local application entry. */
export async function setupApplication(_runtime: AppRuntime): Promise<Disposer> {
  return () => undefined
}
