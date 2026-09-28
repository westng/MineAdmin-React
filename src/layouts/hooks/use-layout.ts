import { useSyncExternalStore } from 'react'
import { useSettingStore } from '@/store/settings/use-settings'
import { useRuntime } from '@/hooks/runtime/use-runtime'
export function useLayout() {
  const layoutRegistry = useRuntime().layouts
  useSyncExternalStore(layoutRegistry.subscribe, layoutRegistry.getSnapshot, layoutRegistry.getSnapshot)
  const id = useSettingStore(state => state.settings.app.layout)
  return layoutRegistry.resolve(id)
}
