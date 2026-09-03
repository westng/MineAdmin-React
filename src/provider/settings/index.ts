import { create } from 'zustand'
import type { SystemSettings } from '@/types/global'
import globalConfigSettings from './settings.config'
import cache from '@/hooks/useCache'

const defaultSettings: SystemSettings = {
  app: {
    colorMode: 'autoMode',
    useLocale: 'zh_CN',
    whiteRoute: ['login'],
    layout: 'classic',
    pageAnimate: 'ma-slide-down',
    enableWatermark: false,
    primaryColor: '#2563EB',
    asideDark: false,
    showBreadcrumb: true,
    loadUserSetting: true,
    watermarkText: import.meta.env.VITE_APP_TITLE,
  },
  mainAside: { showIcon: true, showTitle: true, enableOpenFirstRoute: false },
  subAside: { showIcon: true, showTitle: true, fixedAsideState: false, showCollapseButton: true },
  tabbar: { enable: true, mode: 'rectangle' },
  toolBars: [],
  copyright: {
    enable: true,
    dates: new Date().getFullYear().toString(),
    company: 'MineAdmin Team',
    website: 'https://www.mineadmin.com',
    putOnRecord: '豫ICP备00000000号-1',
  },
}

const settings = { ...defaultSettings, ...globalConfigSettings, app: { ...defaultSettings.app, ...globalConfigSettings.app } }
const persistedSettings = cache.get<Partial<SystemSettings>>('settings', {})
const initialSettings: SystemSettings = {
  ...settings,
  ...persistedSettings,
  app: { ...settings.app, ...persistedSettings.app },
}

interface SettingState {
  settings: SystemSettings
  title: string
  menuCollapseState: boolean
  setTitle: (title: string) => void
  getSettings: <K extends keyof SystemSettings>(type?: K) => SystemSettings[K] | SystemSettings
  setSettings: (next: Partial<SystemSettings>) => void
  toggleMenuCollapse: () => void
  setColorMode: (mode: SystemSettings['app']['colorMode']) => void
}

export const useSettingStore = create<SettingState>((set, get) => ({
  settings: initialSettings,
  title: import.meta.env.VITE_APP_TITLE,
  menuCollapseState: false,
  setTitle: title => set({ title }),
  getSettings: type => type ? get().settings[type] : get().settings,
  setSettings: next => set(state => {
    const nextSettings = {
      ...state.settings,
      ...next,
      app: { ...state.settings.app, ...next.app },
    }
    cache.set('settings', nextSettings)
    if (typeof document !== 'undefined' && nextSettings.app.primaryColor) document.documentElement.style.setProperty('--primary', nextSettings.app.primaryColor)
    return { settings: nextSettings }
  }),
  toggleMenuCollapse: () => set(state => ({ menuCollapseState: !state.menuCollapseState })),
  setColorMode: mode => {
    const resolvedMode = mode === 'autoMode' && typeof window !== 'undefined'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark')
    set(state => {
      const nextSettings = { ...state.settings, app: { ...state.settings.app, colorMode: mode } }
      cache.set('settings', nextSettings)
      return { settings: nextSettings }
    })
  },
}))
