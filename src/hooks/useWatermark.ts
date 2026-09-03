import { useSettingStore } from '@/provider/settings'

export function useWatermark() {
  const enabled = useSettingStore(state => state.settings.app.enableWatermark)
  const text = useSettingStore(state => state.settings.app.watermarkText)
  return { enabled, text }
}

export default useWatermark
