import { create } from 'zustand'
import { authLocaleMessages } from '@/modules/base/auth/locales'
import { dashboardLocaleMessages } from '@/modules/base/dashboard/locales'
import { dynamicMenuLocaleMessages } from '@/modules/base/dynamic-menu/locales'

type Messages = Record<string, string>

const messages: Record<string, Messages> = {
  zh_CN: {
    ...authLocaleMessages.zh_CN,
    ...dashboardLocaleMessages.zh_CN,
    ...dynamicMenuLocaleMessages.zh_CN,
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
  },
  en_US: {
    ...authLocaleMessages.en_US,
    ...dashboardLocaleMessages.en_US,
    ...dynamicMenuLocaleMessages.en_US,
  },
}

interface I18nState {
  locale: string
  setLocale: (locale: string) => void
  t: (key: string, fallback?: string) => string
}

const initialLocale = localStorage.getItem(`${import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'}language`) || 'zh_CN'

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: initialLocale,
  setLocale: locale => {
    localStorage.setItem(`${import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'}language`, locale)
    set({ locale })
  },
  t: (key, fallback) => messages[get().locale]?.[key] || messages.zh_CN[key] || fallback || key,
}))

export function useTrans(key: string, fallback?: string) {
  return useI18nStore(state => state.t(key, fallback))
}

export function translate(key: string, fallback?: string) {
  return useI18nStore.getState().t(key, fallback)
}

export function getLocales() {
  return Object.keys(messages)
}

export default useI18nStore
