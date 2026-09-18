import { useCallback } from 'react'
import { coreMessages } from '@/provider/i18n/messages'
import { create } from 'zustand'
import { localeRegistry } from '@/provider/i18n/registry'

const defaults = {
  'mineAdmin.tab.refresh': '刷新',
  'mineAdmin.tab.close': '关闭',
  'mineAdmin.tab.closeOther': '关闭其他',
  'mineAdmin.tab.closeLeft': '关闭左侧',
  'mineAdmin.tab.closeRight': '关闭右侧',
  'mineAdmin.tab.fixed': '固定标签',
  'mineAdmin.tab.fullscreen': '全屏',
  'dictionary.base.systemUser': '系统用户',
  'dictionary.base.normalUser': '普通用户',
  'dictionary.system.statusEnabled': '启用',
  'dictionary.system.statusDisabled': '禁用',
}
const disposers = [
  localeRegistry.register({
    id: 'core:zh_CN',
    namespace: 'app',
    locale: 'zh_CN',
    messages: { ...defaults, ...coreMessages.zh_CN },
  }),
]
disposers.push(
  localeRegistry.register({
    id: 'core:zh_TW',
    namespace: 'app',
    locale: 'zh_TW',
    messages: {
      ...coreMessages.zh_TW,
      'mineAdmin.tab.refresh': '重新整理',
      'mineAdmin.tab.close': '關閉',
      'mineAdmin.tab.closeOther': '關閉其他',
      'mineAdmin.tab.closeLeft': '關閉左側',
      'mineAdmin.tab.closeRight': '關閉右側',
      'mineAdmin.tab.fixed': '固定分頁',
      'mineAdmin.tab.fullscreen': '全螢幕',
      'dictionary.base.systemUser': '系統使用者',
      'dictionary.base.normalUser': '一般使用者',
      'dictionary.system.statusEnabled': '啟用',
      'dictionary.system.statusDisabled': '停用',
    },
  }),
)
disposers.push(
  localeRegistry.register({
    id: 'core:en_US',
    namespace: 'app',
    locale: 'en_US',
    messages: {
      ...coreMessages.en_US,
      'mineAdmin.tab.refresh': 'Refresh',
      'mineAdmin.tab.close': 'Close',
      'mineAdmin.tab.closeOther': 'Close others',
      'mineAdmin.tab.closeLeft': 'Close left',
      'mineAdmin.tab.closeRight': 'Close right',
      'mineAdmin.tab.fixed': 'Pin tab',
      'mineAdmin.tab.fullscreen': 'Fullscreen',
      'dictionary.base.systemUser': 'System user',
      'dictionary.base.normalUser': 'User',
      'dictionary.system.statusEnabled': 'Enabled',
      'dictionary.system.statusDisabled': 'Disabled',
    },
  }),
)
interface I18nState {
  locale: string
  revision: number
  setLocale: (locale: string) => void
  t: (key: string, fallback?: string) => string
}
const key = `${import.meta.env?.VITE_APP_STORAGE_PREFIX || 'mine_'}language`
export const useI18nStore = create<I18nState>((set, get) => ({
  locale: (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)) || 'zh_CN',
  revision: 0,
  setLocale: locale => {
    if (!locale.trim()) return
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, locale)
    set({ locale })
  },
  t: (key, fallback) => localeRegistry.translate(get().locale, 'app', key, fallback),
}))
disposers.push(localeRegistry.subscribe(() => useI18nStore.setState(state => ({ revision: state.revision + 1 }))))
if (import.meta.hot) import.meta.hot.dispose(() => disposers.forEach(dispose => dispose()))
export function useTrans(key: string, fallback?: string) {
  return useI18nStore(state => state.t(key, fallback))
}
export function translate(key: string, fallback?: string) {
  return useI18nStore.getState().t(key, fallback)
}
export function getLocales() {
  return localeRegistry.getLocales()
}
export default useI18nStore

/** Source-message keys stay readable in feature code; missing locales fall back through the registry. */
export function createTextTranslator(namespace: string) {
  return (message: string, values: Record<string, unknown> = {}) =>
    localeRegistry
      .translate(useI18nStore.getState().locale, namespace, message, message)
      .replace(/\{(\d+)\}/g, (placeholder, key: string) =>
        Object.hasOwn(values, key) ? String(values[key]) : placeholder,
      )
}
export function useLocaleRevision() {
  return useI18nStore(state => `${state.locale}:${state.revision}`)
}

export function useTranslate() {
  const locale = useI18nStore(state => state.locale)
  const revision = useI18nStore(state => state.revision)
  return useCallback(
    (key: string, fallback?: string) => {
      void revision
      return localeRegistry.translate(locale, 'app', key, fallback)
    },
    [locale, revision],
  )
}
