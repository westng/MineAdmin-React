import { create } from 'zustand'
import type { ComponentType } from 'react'
import type { Dictionary } from '@/provider/dictionary'
import { useDictStore } from '@/provider/dictionary'
import type { RouteMeta } from '@/types/global'

export interface MinePluginInfo {
  name: string
  version?: string
  author?: string | { name: string }[]
  description?: string
  order?: number
}

export interface MinePluginConfig {
  enable?: boolean
  info: MinePluginInfo
  [key: string]: unknown
}

export interface MinePluginView {
  name?: string
  path: string
  component?: ComponentType
  componentPath?: string
  meta?: RouteMeta
}

export type MinePluginHook = (...args: unknown[]) => unknown | Promise<unknown>

export interface MinePlugin {
  name: string
  order?: number
  enabled?: boolean
  config?: MinePluginConfig
  install?: (context: MinePluginContext) => unknown | Promise<unknown>
  hooks?: Record<string, MinePluginHook>
  views?: MinePluginView[]
  dictionaries?: Record<string, Dictionary[]>
}

export interface MinePluginContext {
  plugin: MinePlugin
  registerView: (view: MinePluginView) => void
  registerDictionary: (name: string, data: Dictionary[], replace?: boolean) => boolean
  getConfig: () => MinePluginConfig | undefined
}

interface PluginState {
  plugins: MinePlugin[]
  initialized: boolean
  errors: Record<string, string>
  register: (plugin: MinePlugin) => void
  remove: (name: string) => void
  get: (name: string) => MinePlugin | undefined
  getPluginConfig: () => Record<string, MinePlugin>
  getViews: () => MinePluginView[]
  enabled: (name: string) => Promise<void>
  disabled: (name: string) => void
  callHooks: (hook: string, ...args: unknown[]) => Promise<void>
}

const installedPlugins = new Set<string>()
let initialization: Promise<void> | null = null

function normalizePlugin(raw: MinePlugin): MinePlugin {
  const config = raw.config
  const name = raw.name || config?.info?.name
  if (!name) {
    throw new Error('插件缺少唯一标识')
  }
  const order = raw.order ?? config?.info?.order ?? 0
  return {
    ...raw,
    name,
    order,
    enabled: raw.enabled ?? config?.enable ?? true,
    config: config ? { ...config, info: { ...config.info, name } } : undefined,
  }
}

function sortPlugins(plugins: MinePlugin[]) {
  return [...plugins].sort((left, right) => (left.order || 0) - (right.order || 0) || left.name.localeCompare(right.name))
}

function pluginViews(plugins: MinePlugin[]) {
  return plugins.filter(plugin => plugin.enabled !== false).flatMap(plugin => plugin.views || [])
}

function pluginConfig(plugins: MinePlugin[]) {
  return Object.fromEntries(plugins.map(plugin => [plugin.name, plugin]))
}

function updatePluginState(set: (updater: (state: PluginState) => Partial<PluginState>) => void, nextPlugins: MinePlugin[]) {
  const plugins = sortPlugins(nextPlugins)
  set(() => ({ plugins }))
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  initialized: false,
  errors: {},
  register: rawPlugin => {
    const plugin = normalizePlugin(rawPlugin)
    updatePluginState(set, [...get().plugins.filter(item => item.name !== plugin.name), plugin])
  },
  remove: name => updatePluginState(set, get().plugins.filter(plugin => plugin.name !== name)),
  get: name => get().plugins.find(plugin => plugin.name === name),
  getPluginConfig: () => pluginConfig(get().plugins),
  getViews: () => pluginViews(get().plugins),
  enabled: async name => {
    const plugin = get().plugins.find(item => item.name === name)
    if (!plugin) return
    const nextPlugin = { ...plugin, enabled: true, config: plugin.config ? { ...plugin.config, enable: true } : plugin.config }
    updatePluginState(set, get().plugins.map(item => item.name === name ? nextPlugin : item))
    await activatePlugin(nextPlugin)
  },
  disabled: name => {
    updatePluginState(set, get().plugins.map(plugin => plugin.name === name
      ? { ...plugin, enabled: false, config: plugin.config ? { ...plugin.config, enable: false } : plugin.config }
      : plugin))
  },
  callHooks: async (hook, ...args) => {
    for (const plugin of get().plugins) {
      if (plugin.enabled === false) continue
      try {
        await plugin.hooks?.[hook]?.(...args)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : '插件钩子执行失败'
        set(state => ({ errors: { ...state.errors, [plugin.name]: message } }))
        console.error(`[MinePlugin] ${plugin.name}.${hook} failed`, error)
      }
    }
  },
}))

function createPluginContext(plugin: MinePlugin): MinePluginContext {
  return {
    plugin,
    registerView: view => {
      usePluginStore.setState(state => {
        const nextPlugins = state.plugins.map(item => item.name === plugin.name
          ? { ...item, views: [...(item.views || []).filter(itemView => itemView.path !== view.path), view] }
          : item)
        return { plugins: sortPlugins(nextPlugins) }
      })
    },
    registerDictionary: (name, data, replace = false) => useDictStore.getState().push(name, data, replace),
    getConfig: () => usePluginStore.getState().get(plugin.name)?.config,
  }
}

async function activatePlugin(plugin: MinePlugin) {
  if (installedPlugins.has(plugin.name) || plugin.enabled === false) return
  try {
    await plugin.hooks?.start?.(plugin.config || { info: { name: plugin.name } })
    await plugin.install?.(createPluginContext(plugin))
    await plugin.hooks?.setup?.()
    Object.entries(plugin.dictionaries || {}).forEach(([name, data]) => {
      useDictStore.getState().push(name, data, true)
    })
    installedPlugins.add(plugin.name)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '插件初始化失败'
    usePluginStore.setState(state => ({ errors: { ...state.errors, [plugin.name]: message } }))
    console.error(`[MinePlugin] ${plugin.name} initialization failed`, error)
  }
}

function loadPluginConfigs() {
  const modules = import.meta.glob('./config/**/*.ts', { eager: true }) as Record<string, { default?: Partial<MinePluginConfig> & { name?: string } }>
  return Object.values(modules).flatMap(module => module.default ? [module.default] : [])
}

function loadPluginDictionaries() {
  const modules = import.meta.glob('../../plugins/*/*/dictionary/**.{ts,js}', { eager: true }) as Record<string, { default?: unknown }>
  Object.entries(modules).forEach(([path, module]) => {
    if (!Array.isArray(module.default)) return
    const name = path.match(/\/dictionary\/(.+)\.(?:ts|js)$/)?.[1]
    if (name) useDictStore.getState().push(name, module.default as Dictionary[], true)
  })
}

export function initializePlugins() {
  if (initialization) return initialization
  initialization = (async () => {
    const modules = import.meta.glob('../../plugins/**/index.ts', { eager: true }) as Record<string, { default?: MinePlugin }>
    const patches = loadPluginConfigs()
    loadPluginDictionaries()
    Object.values(modules).forEach(module => {
      if (!module.default) return
      const plugin = normalizePlugin(module.default)
      const patch = patches.find(item => item.name === plugin.name || item.info?.name === plugin.name)
      usePluginStore.getState().register(patch ? normalizePlugin({ ...plugin, config: { ...plugin.config, ...patch, info: { ...plugin.config?.info, ...patch.info, name: plugin.name } } }) : plugin)
    })
    for (const plugin of usePluginStore.getState().plugins) {
      await activatePlugin(plugin)
    }
    usePluginStore.setState({ initialized: true })
  })()
  return initialization
}

export default usePluginStore
