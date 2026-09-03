import { useSettingStore } from '@/provider/settings'

export function applyThemeColor(color: string) {
  if (typeof document === 'undefined' || !color.trim()) return
  document.documentElement.style.setProperty('--primary', color.trim())
}

export function useThemeColor() {
  const color = useSettingStore(state => state.settings.app.primaryColor)
  return {
    color,
    apply: applyThemeColor,
  }
}

export default useThemeColor
