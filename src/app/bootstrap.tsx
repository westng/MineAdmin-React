import { useTabStore } from '@/store/modules/useTabStore'
import { useKeepAliveStore } from '@/store/modules/useKeepAliveStore'
import { configureIframePolicy } from '@/layouts/components/iframe/policy'
import { registerLocaleBundles, type LocaleBundle } from '@/provider/i18n/discovery'
import { createElement } from 'react'
import { reportError } from '@/services/telemetry'
import { setupApplication } from '@application'
import { useSettingStore } from '@/provider/settings'
import { initializePlugins, usePluginStore, disposeLegacyPlugins } from '@/provider/plugins'
import { useI18nStore } from '@/provider/i18n'
import rootRoutes from '@/router/static-routes/rootRoute'
import DynamicMenuPage from '@/modules/base/dynamic-menu/views'
import { runtime } from './runtime'
import type { Disposer } from '@/services/registry'
import type { RouteDescriptor } from '@/router/registry'
import '@/router/component-registry'

let pending: Promise<Disposer> | undefined
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
      disposeLegacyPlugins()
    }
    try {
      disposers.push(
        configureIframePolicy({
          allowedOrigins: (import.meta.env.VITE_IFRAME_ORIGINS || '')
            .split(',')
            .map((value: string) => value.trim())
            .filter(Boolean),
          sandbox: 'allow-scripts allow-forms',
        }),
      )
      disposers.push(
        runtime.session.subscribe((next, previous) => {
          if (next.sessionVersion !== previous.sessionVersion) {
            useKeepAliveStore.getState().clean()
            useTabStore
              .getState()
              .clear({ name: 'dashboard', path: '/dashboard', fullPath: '/dashboard', title: 'Dashboard', affix: true })
          }
        }),
      )
      const localeModules = {
        ...import.meta.glob('../modules/base/**/locales/*.ts', { eager: true }),
        ...import.meta.glob('../layouts/locales/*.ts', { eager: true }),
      } as Record<string, { default: LocaleBundle }>
      disposers.push(registerLocaleBundles(runtime.locales, localeModules))
      const { settings, setColorMode } = useSettingStore.getState()
      setColorMode(settings.app.colorMode)
      if (settings.app.primaryColor) document.documentElement.style.setProperty('--primary', settings.app.primaryColor)
      useI18nStore
        .getState()
        .setLocale(localStorage.getItem(`${import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'}language`) || 'zh_CN')
      runtime.routes.configure({
        layout: rootRoutes[0],
        guests: [rootRoutes[1]],
        publics: rootRoutes.slice(2),
        renderMenu: () => <DynamicMenuPage />,
      })
      let legacyRoutes: Disposer | undefined
      const syncLegacyRoutes = () => {
        legacyRoutes?.()
        const views: RouteDescriptor[] = usePluginStore
          .getState()
          .getViews()
          .map(view => ({
            name: `plugin:${view.name || view.path}`,
            path: view.path,
            source: 'plugin',
            meta: view.meta,
            element: view.component ? createElement(view.component) : <DynamicMenuPage />,
          }))
        legacyRoutes = runtime.routes.register('legacy-plugins', views)
      }
      disposers.push(
        usePluginStore.subscribe((next, previous) => {
          if (next.plugins !== previous.plugins) syncLegacyRoutes()
        }),
      )
      disposers.push(() => legacyRoutes?.())
      disposers.push(await setupApplication(runtime))
      await initializePlugins()
      syncLegacyRoutes()
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
