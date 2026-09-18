import { useSyncExternalStore } from 'react'
import { useSettingStore } from '@/provider/settings'
import { layoutRegistry } from '@/layouts/builtins'
export function useLayout() {
  useSyncExternalStore(layoutRegistry.subscribe, layoutRegistry.getSnapshot, layoutRegistry.getSnapshot)
  const id = useSettingStore(state => state.settings.app.layout)
  return layoutRegistry.resolve(id)
}
