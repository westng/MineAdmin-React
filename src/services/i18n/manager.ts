import { createStore } from 'zustand/vanilla'
import { coreMessages } from './messages'
import type { LocaleRegistry } from './registry'
import type { StorageAdapter } from '@/services/storage'
export interface I18nState {
  locale: string
  revision: number
  setLocale: (locale: string) => void
  t: (key: string, fallback?: string) => string
}
export function createI18nManager(registry: LocaleRegistry, storage: StorageAdapter, prefix: string) {
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
    registry.register({
      id: 'core:zh_CN',
      namespace: 'app',
      locale: 'zh_CN',
      messages: { ...defaults, ...coreMessages.zh_CN },
    }),
  ]
  disposers.push(
    registry.register({
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
    registry.register({
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

  const store = createStore<I18nState>((set, get) => ({
    locale: storage.getItem(`${prefix}language`) || 'zh_CN',
    revision: 0,
    setLocale: locale => {
      if (!locale.trim()) return
      storage.setItem(`${prefix}language`, locale)
      set({ locale })
    },
    t: (key, fallback) => registry.translate(get().locale, 'app', key, fallback),
  }))
  disposers.push(registry.subscribe(() => store.setState(state => ({ revision: state.revision + 1 }))))
  return {
    store,
    dispose: () =>
      disposers
        .splice(0)
        .reverse()
        .forEach(dispose => dispose()),
  }
}
