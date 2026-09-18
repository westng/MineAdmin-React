import { createTextTranslator } from '@/provider/i18n'
import { Moon, Sun, type LucideIcon } from 'lucide-react'

const tx = createTextTranslator('base.settings.ui')

export type SettingsColorMode = 'light' | 'dark'

export const settingsModes: Array<{ value: SettingsColorMode; label: string; icon: LucideIcon }> = [
  {
    value: 'light',
    get label() {
      return tx('浅色')
    },
    icon: Sun,
  },
  {
    value: 'dark',
    get label() {
      return tx('深色')
    },
    icon: Moon,
  },
]
