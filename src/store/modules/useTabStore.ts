import { create } from 'zustand'
import cache from '@/hooks/useCache'

export interface TabItem {
  name: string
  path: string
  fullPath: string
  title: string
  i18n?: string
  icon?: string
  affix?: boolean
}

interface TabState {
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

const storedTabs = cache.get<TabItem[]>('tabs', [])
const removedRoutePaths = new Set(['/welcome', '/dashboard/workbench', '/dashboard/analysis', '/dashboard/report', '/marketing/calendar'])

function persist(tabs: TabItem[]) {
  cache.set('tabs', tabs)
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: Array.isArray(storedTabs) ? storedTabs : [],
  initialized: false,
  init: defaultTab => {
    const validTabs = get().tabs.filter(tab => !removedRoutePaths.has(tab.path.replace(/\/+$/, '')))
    const tabs = validTabs.length ? validTabs : [defaultTab]
    set({ tabs, initialized: true })
    persist(tabs)
  },
  add: tab => {
    if (!tab.fullPath || tab.name === 'MineSystemError' || removedRoutePaths.has(tab.path.replace(/\/+$/, ''))) return
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

export default useTabStore
