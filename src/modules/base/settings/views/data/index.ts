import { Moon, Sun, type LucideIcon } from 'lucide-react'

export type SettingsColorMode = 'light' | 'dark'

export const settingsModes: Array<{ value: SettingsColorMode; label: string; icon: LucideIcon }> = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]
