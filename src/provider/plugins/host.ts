import { z } from 'zod'
import type { Disposer } from '@/services/registry'
import type { RouteDescriptor } from '@/router/registry'
import type { LocaleRegistration } from '@/provider/i18n/registry'
import type { Dictionary } from '@/provider/dictionary'
import type { ShellSlotRegistration } from '@/layouts/slots'
import type { Telemetry } from '@/services/telemetry'
import { reportError, silentTelemetry } from '@/services/telemetry'

const capabilities = ['route', 'locale', 'dictionary', 'slot', 'toolbar'] as const
export type PluginCapability = (typeof capabilities)[number]
export const pluginManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._/-]*$/i),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/),
  coreApi: z.literal(1),
  order: z.number().finite().optional(),
  capabilities: z.array(z.enum(capabilities)).default([]),
})
export type PluginManifest = z.input<typeof pluginManifestSchema>
export interface PluginRegistrars {
  route: (owner: string, route: RouteDescriptor) => Disposer
  locale: (value: LocaleRegistration) => Disposer
  dictionary: (name: string, values: Dictionary[]) => Disposer
  slot: (value: ShellSlotRegistration) => Disposer
  toolbar: (value: ShellSlotRegistration) => Disposer
}
export interface PluginContext {
  signal: AbortSignal
  registerRoute: (route: RouteDescriptor) => Disposer
  registerLocale: (value: LocaleRegistration) => Disposer
  registerDictionary: (name: string, values: Dictionary[]) => Disposer
  registerSlot: (value: ShellSlotRegistration) => Disposer
  registerToolbar: (value: ShellSlotRegistration) => Disposer
  onDispose: (dispose: Disposer) => void
}
export interface PluginDefinition {
  manifest: PluginManifest
  setup: (context: PluginContext) => void | Disposer | Promise<void | Disposer>
}
interface Installation {
  controller: AbortController
  disposers: Disposer[]
  task: Promise<void>
  active: boolean
}
export function createPluginHost(registrars: PluginRegistrars, telemetry: Telemetry = silentTelemetry) {
  const installed = new Map<string, Installation>()
  const errors = new Map<string, string>()
  let generation = 0
  function clean(id: string, installation: Installation) {
    installation.active = false
    installation.controller.abort()
    for (const dispose of installation.disposers.splice(0).reverse()) {
      try {
        dispose()
      } catch (error) {
        reportError(telemetry, error, `plugin:${id}:dispose`)
      }
    }
  }
  function disable(id: string) {
    const installation = installed.get(id)
    if (!installation) return
    installed.delete(id)
    clean(id, installation)
  }
  const host = {
    enable(plugin: PluginDefinition) {
      const manifest = pluginManifestSchema.parse(plugin.manifest)
      const existing = installed.get(manifest.id)
      if (existing) return existing.task
      const installation: Installation = {
        active: true,
        controller: new AbortController(),
        disposers: [],
        task: Promise.resolve(),
      }
      installed.set(manifest.id, installation)
      const own = (dispose: Disposer) => {
        if (!installation.active) {
          dispose()
          throw new Error('Plugin setup cancelled')
        }
        let disposed = false
        const once = () => {
          if (!disposed) {
            disposed = true
            dispose()
          }
        }
        installation.disposers.push(once)
        return once
      }
      const requireCapability = (capability: PluginCapability) => {
        if (!installation.active || !manifest.capabilities.includes(capability))
          throw new Error(`Plugin capability denied: ${capability}`)
      }
      let routeSequence = 0
      const context: PluginContext = {
        signal: installation.controller.signal,
        registerRoute: route => {
          requireCapability('route')
          return own(registrars.route(`${manifest.id}:${++routeSequence}`, route))
        },
        registerLocale: value => {
          requireCapability('locale')
          return own(registrars.locale(value))
        },
        registerDictionary: (name, values) => {
          requireCapability('dictionary')
          return own(registrars.dictionary(name, values))
        },
        registerSlot: value => {
          requireCapability('slot')
          return own(registrars.slot(value))
        },
        registerToolbar: value => {
          requireCapability('toolbar')
          return own(registrars.toolbar(value))
        },
        onDispose: own,
      }
      installation.task = Promise.resolve()
        .then(() => {
          if (!installation.active) return
          return plugin.setup(context)
        })
        .then(dispose => {
          if (dispose) own(dispose)
          if (installation.active) errors.delete(manifest.id)
        })
        .catch(error => {
          if (!installation.active) return
          errors.set(manifest.id, '插件初始化失败')
          clean(manifest.id, installation)
          if (installed.get(manifest.id) === installation) installed.delete(manifest.id)
          reportError(telemetry, error, `plugin:${manifest.id}`)
        })
      return installation.task
    },
    async enableAll(definitions: readonly PluginDefinition[]) {
      const startedGeneration = generation
      const ids = new Set<string>()
      const prepared = definitions
        .map(plugin => {
          const parsed = pluginManifestSchema.safeParse(plugin?.manifest)
          return {
            plugin,
            parsed,
            id: parsed.success ? parsed.data.id : String(plugin?.manifest?.id ?? ''),
            order: parsed.success ? (parsed.data.order ?? 0) : Number.POSITIVE_INFINITY,
          }
        })
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      for (const item of prepared) {
        if (startedGeneration !== generation) return
        const plugin = item.plugin
        try {
          if (!item.parsed.success) throw item.parsed.error
          if (ids.has(item.parsed.data.id)) throw new Error('Duplicate plugin ID')
          ids.add(item.parsed.data.id)
          await host.enable(plugin)
        } catch (error) {
          errors.set(item.id || 'invalid-plugin', '插件协议或配置无效')
          reportError(telemetry, error, 'plugin:manifest')
        }
      }
    },
    disable,
    dispose() {
      generation += 1
      for (const id of [...installed.keys()]) disable(id)
    },
    isEnabled: (id: string) => installed.get(id)?.active ?? false,
    getErrors: () => Object.fromEntries(errors),
  }
  return host
}
export type PluginHost = ReturnType<typeof createPluginHost>
