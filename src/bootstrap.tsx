import { useSettingStore } from '@/provider/settings'
import { initializePlugins } from '@/provider/plugins'
import { useI18nStore } from '@/i18n'

export async function bootstrap() {
  const { settings, setColorMode } = useSettingStore.getState()
  setColorMode(settings.app.colorMode)
  if (settings.app.primaryColor) document.documentElement.style.setProperty('--primary', settings.app.primaryColor)
  useI18nStore.getState().setLocale(getUserLanguage())
  await initializePlugins()
}

function getUserLanguage() {
  return localStorage.getItem(`${import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'}language`) || 'zh_CN'
}
