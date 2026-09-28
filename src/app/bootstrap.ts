import { registerLocaleBundles, type LocaleBundle } from '@/services/i18n/discovery'
import { reportError } from '@/services/telemetry'
import { setupApplication } from '@application'
import type { PluginConfig } from '@/provider/plugins/host'
import { runtime } from './runtime/instance'
import type { Disposer } from '@/services/registry'

let pending: Promise<Disposer> | undefined

/** 插件入口：`plugins/<作者>/<插件名>/index.ts(x)`，默认导出插件配置。 */
const pluginModules = import.meta.glob('../plugins/*/*/index.{ts,tsx}', { eager: true, import: 'default' }) as Record<
  string,
  PluginConfig
>
const plugins = Object.entries(pluginModules)
  .map(([file, plugin]) => ({
    plugin,
    directory: file.replace('../plugins/', '').replace(/\/index\.(ts|tsx)$/, ''),
  }))
  .sort(
    (left, right) =>
      (left.plugin.config.info.order ?? 0) - (right.plugin.config.info.order ?? 0) ||
      left.directory.localeCompare(right.directory),
  )

export function bootstrap() {
  if (pending) return pending
  const task = (async () => {
    const disposers: Disposer[] = []
    const cleanup = () => {
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch (error) {
          reportError(runtime.telemetry, error, 'bootstrap.dispose')
        }
      }
      runtime.plugins.dispose()
    }
    try {
      disposers.push(
        runtime.iframe.configure({
          allowedOrigins: (import.meta.env.VITE_IFRAME_ORIGINS || '')
            .split(',')
            .map((value: string) => value.trim())
            .filter(Boolean),
          sandbox: 'allow-scripts allow-forms',
        }),
      )
      const localeModules = {
        ...import.meta.glob('../modules/base/**/locales/*.ts', { eager: true }),
        ...import.meta.glob('../layouts/locales/*.ts', { eager: true }),
      } as Record<string, { default: LocaleBundle }>
      disposers.push(registerLocaleBundles(runtime.locales, localeModules))
      for (const { plugin, directory } of plugins) await runtime.plugins.register(plugin, runtime, directory)
      disposers.push(await setupApplication(runtime))
    } catch (error) {
      cleanup()
      pending = undefined
      throw error
    }
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      cleanup()
      pending = undefined
    }
  })()
  pending = task
  void task.catch(() => {
    if (pending === task) pending = undefined
  })
  return task
}
