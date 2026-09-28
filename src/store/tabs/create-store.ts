import { createStore } from 'zustand/vanilla'
import type { CacheStore } from '@/services/storage/cache'

export interface TabItem {
  name: string
  path: string
  fullPath: string
  title: string
  i18n?: string
  icon?: string
  affix?: boolean
}

export interface TabState {
  tabs: TabItem[]
  initialized: boolean
  init: (defaultTab: TabItem) => void
  add: (tab: TabItem) => void
  close: (fullPath: string) => void
  closeOthers: (fullPath: string) => void
  closeLeft: (fullPath: string) => void
  closeRight: (fullPath: string) => void
  clear: (defaultTab: TabItem) => void
}

export function createTabStore(cache: CacheStore) {
  const storedTabs = cache.get<TabItem[]>('tabs', [])

  function persist(tabs: TabItem[]) {
    cache.set('tabs', tabs)
  }

  return createStore<TabState>((set, get) => ({
    tabs: Array.isArray(storedTabs) ? storedTabs : [],
    initialized: false,
    init: defaultTab => {
      const tabs = [
        defaultTab,
        ...get().tabs.filter(item => item.path !== '/welcome' && item.fullPath !== defaultTab.fullPath),
      ]
      set({ tabs, initialized: true })
      persist(tabs)
    },
    add: tab => {
      if (!tab.fullPath || tab.name === 'MineSystemError') return
      const current = get().tabs
      if (current.some(item => item.fullPath === tab.fullPath)) return
      const tabs = [...current, tab]
      set({ tabs })
      persist(tabs)
    },
    close: fullPath => {
      const current = get().tabs
      const target = current.find(item => item.fullPath === fullPath)
      if (!target || target.affix) return
      const tabs = current.filter(item => item.fullPath !== fullPath)
      set({ tabs })
      persist(tabs)
    },
    closeOthers: fullPath => {
      const tabs = get().tabs.filter(item => item.fullPath === fullPath || item.affix)
      set({ tabs })
      persist(tabs)
    },
    closeLeft: fullPath => {
      const current = get().tabs
      const index = current.findIndex(item => item.fullPath === fullPath)
      if (index < 0) return
      const tabs = current.filter((item, itemIndex) => itemIndex >= index || item.affix)
      set({ tabs })
      persist(tabs)
    },
    closeRight: fullPath => {
      const current = get().tabs
      const index = current.findIndex(item => item.fullPath === fullPath)
      if (index < 0) return
      const tabs = current.filter((item, itemIndex) => itemIndex <= index || item.affix)
      set({ tabs })
      persist(tabs)
    },
    clear: defaultTab => {
      set({ tabs: [defaultTab], initialized: true })
      persist([defaultTab])
    },
  }))
}
