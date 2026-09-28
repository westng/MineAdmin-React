import type { AppRuntime } from '@/provider/runtime/types'
import type { AppRoute } from '@/router/types'
import type { MenuVo } from '@/services/navigation/types'
import type { Disposer } from '@/services/registry'
import type { Telemetry } from '@/services/telemetry'
import { reportError, silentTelemetry } from '@/services/telemetry'

export interface PluginInfo {
  name: string
  version: string
  author?: string
  description?: string
  /** 数字小的先安装。 */
  order?: number
}

/** 插件页面，和 Vue 版插件的 `views` 一样：登录后挂在布局下面。 */
export type PluginView = Pick<AppRoute, 'name' | 'path' | 'meta'> & Required<Pick<AppRoute, 'component'>>

/** 钩子名称与 MineAdmin Vue 一致。 */
export interface PluginHooks {
  start?(config: PluginConfig['config']): unknown
  setup?(): unknown
  registerRoute?(routes: AppRoute[], menus: MenuVo[]): unknown
  loginBefore?(data: unknown): unknown
  login?(result: unknown): unknown
  logout?(): unknown
  getUserInfo?(userInfo: unknown): unknown
  routerRedirect?(route: { oldRoute: string; newRoute: string }, navigate: (to: string) => void): unknown
  networkRequest?(config: unknown): unknown
  networkResponse?(response: unknown): unknown
}
export type PluginHookName = keyof PluginHooks

export interface PluginConfig {
  config: { enable: boolean; info: PluginInfo }
  /** 插件启用时调用一次；返回的函数在卸载时调用。 */
  install?(runtime: AppRuntime): void | Disposer | Promise<void | Disposer>
  views?: PluginView[]
  hooks?: PluginHooks
}

export function createPluginHost(telemetry: Telemetry = silentTelemetry) {
  const plugins = new Map<string, PluginConfig>()
  const directories = new Map<string, PluginConfig>()
  const disposers: Disposer[] = []
  const errors = new Map<string, string>()
  const listeners = new Set<() => void>()
  let generation = 0
  const isEnabled = (plugin: PluginConfig) => plugin.config.enable && !errors.has(plugin.config.info.name)
  const enabled = () => [...plugins.values()].filter(isEnabled)

  return {
    /** 依次执行 `hooks.start(config)` 和 `install(runtime)`。 */
    async register(definition: PluginConfig, runtime: AppRuntime, directory?: string) {
      const plugin = { ...definition, config: { ...definition.config, info: { ...definition.config.info } } }
      const name = plugin.config.info.name
      if (plugins.has(name)) throw new Error(`插件重复：${name}`)
      plugins.set(name, plugin)
      if (directory) directories.set(directory, plugin)
      const started = generation
      const current = () => generation === started && plugins.get(name) === plugin
      let cleanup: Disposer | void = undefined
      try {
        await plugin.hooks?.start?.(plugin.config)
        if (!current() || !plugin.config.enable) return
        cleanup = await plugin.install?.(runtime)
        if (!current()) {
          cleanup?.()
          return
        }
        for (const listener of listeners) listener()
        if (cleanup) disposers.push(cleanup)
      } catch (error) {
        cleanup?.()
        if (!current()) return
        errors.set(name, '插件初始化失败')
        reportError(telemetry, error, `plugin:${name}`)
        for (const listener of listeners) listener()
      }
    },
    /** 调用所有已启用插件的同名钩子。 */
    async callHooks(name: PluginHookName | (string & {}), ...args: unknown[]) {
      type Hook = ((...values: unknown[]) => unknown) | undefined
      await Promise.all(enabled().map(plugin => (plugin.hooks?.[name as PluginHookName] as Hook)?.(...args)))
    },
    getViews: () => enabled().flatMap(plugin => plugin.views ?? []),
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    list: () => [...plugins.values()],
    isEnabled: (name: string) => {
      const plugin = directories.get(name) ?? plugins.get(name)
      return plugin ? isEnabled(plugin) : false
    },
    getErrors: () => Object.fromEntries(errors),
    dispose() {
      generation++
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch (error) {
          reportError(telemetry, error, 'plugin:dispose')
        }
      }
      plugins.clear()
      directories.clear()
      errors.clear()
      for (const listener of listeners) listener()
    },
  }
}
export type PluginHost = ReturnType<typeof createPluginHost>
