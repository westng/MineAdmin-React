import { createStore } from 'zustand/vanilla'
import type { SystemSettings } from '@/store/settings/types'
import globalConfigSettings, { defaultSettings } from './defaults'
import type { CacheStore } from '@/services/storage/cache'

function mergeSettings(
  current: SystemSettings,
  next: Partial<SystemSettings>,
  dashboardPage: SystemSettings['dashboardPage'],
): SystemSettings {
  const merged = {
    ...current,
    ...next,
    app: { ...current.app, ...next.app },
    dashboardPage: {
      ...current.dashboardPage,
      ...next.dashboardPage,
      name: dashboardPage.name,
      path: dashboardPage.path,
    },
  }
  Reflect.deleteProperty(merged, 'welcomePage')
  return merged
}

export interface SettingState {
  settings: SystemSettings
  title: string
  menuCollapseState: boolean
  setTitle: (title: string) => void
  getSettings: <K extends keyof SystemSettings>(type?: K) => SystemSettings[K] | SystemSettings
  setSettings: (next: Partial<SystemSettings>) => void
  toggleMenuCollapse: () => void
  setColorMode: (mode: SystemSettings['app']['colorMode']) => void
  setPrimaryColor: (color: string) => void
}

export function createSettingsStore(cache: CacheStore, title: string, dashboardPage: SystemSettings['dashboardPage']) {
  const settings = mergeSettings({ ...defaultSettings, dashboardPage }, globalConfigSettings, dashboardPage)
  const persistedSettings = cache.get<Partial<SystemSettings>>('settings', {})
  const initialSettings = mergeSettings(
    settings,
    {
      ...persistedSettings,
      app: { ...settings.app, watermarkText: title, ...persistedSettings.app },
    },
    dashboardPage,
  )
  if (
    Object.hasOwn(persistedSettings, 'welcomePage') ||
    (persistedSettings.dashboardPage &&
      (persistedSettings.dashboardPage.name !== dashboardPage.name ||
        persistedSettings.dashboardPage.path !== dashboardPage.path))
  ) {
    cache.set('settings', initialSettings)
  }
  return createStore<SettingState>((set, get) => ({
    settings: initialSettings,
    title,
    menuCollapseState: false,
    setTitle: title => set({ title }),
    getSettings: type => (type ? get().settings[type] : get().settings),
    setSettings: next =>
      set(state => {
        const nextSettings = mergeSettings(state.settings, next, dashboardPage)
        cache.set('settings', nextSettings)
        return { settings: nextSettings }
      }),
    toggleMenuCollapse: () => set(state => ({ menuCollapseState: !state.menuCollapseState })),
    setPrimaryColor: color =>
      set(state => {
        const nextSettings = { ...state.settings, app: { ...state.settings.app, primaryColor: color } }
        cache.set('settings', nextSettings)
        return { settings: nextSettings }
      }),
    setColorMode: mode => {
      set(state => {
        const nextSettings = { ...state.settings, app: { ...state.settings.app, colorMode: mode } }
        cache.set('settings', nextSettings)
        return { settings: nextSettings }
      })
    },
  }))
}
