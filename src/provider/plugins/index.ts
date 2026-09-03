import { create } from 'zustand'

export interface MinePlugin {
  name: string
  order?: number
  enabled?: boolean
  hooks?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>
}

interface PluginState {
  plugins: MinePlugin[]
  register: (plugin: MinePlugin) => void
  remove: (name: string) => void
  get: (name: string) => MinePlugin | undefined
  callHooks: (hook: string, ...args: unknown[]) => Promise<void>
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  register: plugin => set(state => ({ plugins: [...state.plugins.filter(item => item.name !== plugin.name), plugin].sort((a, b) => (a.order || 0) - (b.order || 0)) })),
  remove: name => set(state => ({ plugins: state.plugins.filter(plugin => plugin.name !== name) })),
  get: name => get().plugins.find(plugin => plugin.name === name),
  callHooks: async (hook, ...args) => {
    for (const plugin of get().plugins) {
      if (plugin.enabled === false) continue
      await plugin.hooks?.[hook]?.(...args)
    }
  },
}))

export function initializePlugins() {
  const modules = import.meta.glob('../../plugins/**/index.ts', { eager: true }) as Record<string, { default?: MinePlugin }>
  Object.values(modules).forEach(module => {
    if (module.default) usePluginStore.getState().register(module.default)
  })
}

export default usePluginStore
