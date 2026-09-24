import { createTextTranslator } from '@/provider/i18n'
import { Moon, Sun, type LucideIcon } from 'lucide-react'
import type { SettingsColorMode } from '../../api/settings'

const tx = createTextTranslator('base.settings.ui')

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
