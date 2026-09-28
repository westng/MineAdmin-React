import { createTextTranslator } from '@/services/i18n/translator'
import { Moon, Sun, type LucideIcon } from 'lucide-react'
import type { SettingsColorMode } from '../../api/settings'
import type { AppRuntime } from '@/provider/runtime/types'
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const tx = createTextTranslator(runtime, 'base.settings.ui')
  const settingsModes: Array<{ value: SettingsColorMode; label: string; icon: LucideIcon }> = [
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
  return { settingsModes }
}
