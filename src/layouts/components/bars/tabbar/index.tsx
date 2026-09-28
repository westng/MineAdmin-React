import { useTextTranslator, useTranslate } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { matchRoutes, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/reui/primitives/button'
import { useTabStore } from '@/store/tabs/use-tabs'
import { useRoute } from '@/hooks/use-route'
import { useSettingStore } from '@/store/settings/use-settings'

export default function Tabbar() {
  const tx = useTextTranslator('shell.ui')
  const t = useTranslate()

  const localeRevision = useLocaleRevision()
  void localeRevision

  const location = useLocation()
  const navigate = useNavigate()
  const { routes } = useRoute()
  const enabled = useSettingStore(state => state.settings.tabbar.enable)
  const dashboardPage = useSettingStore(state => state.settings.dashboardPage)
  const tabs = useTabStore(state => state.tabs)
  const initialized = useTabStore(state => state.initialized)
  const init = useTabStore(state => state.init)
  const add = useTabStore(state => state.add)
  const close = useTabStore(state => state.close)

  useEffect(() => {
    const dashboard = {
      name: dashboardPage.name,
      path: dashboardPage.path,
      fullPath: dashboardPage.path,
      title: dashboardPage.title,
      affix: true,
    }
    if (!initialized) init(dashboard)
    const pathname = location.pathname
    const meta = matchRoutes(routes, pathname)?.at(-1)?.route.meta
    const title = meta?.i18n ? t(meta.i18n, meta.title) : meta?.title
    add({
      name: pathname,
      path: pathname,
      fullPath: `${pathname}${location.search}${location.hash}`,
      title:
        pathname === dashboard.path
          ? dashboard.title
          : title || pathname.split('/').filter(Boolean).pop() || tx('页面'),
      affix: pathname === dashboard.path,
    })
  }, [add, init, initialized, location.hash, location.pathname, location.search, routes, t, tx, dashboardPage])

  if (!enabled) return null

  return (
    <nav
      className="flex min-h-10 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-3"
      aria-label={tx('打开的页面')}
    >
      {tabs.map(tab => {
        const active = tab.fullPath === `${location.pathname}${location.search}${location.hash}`
        return (
          <div key={tab.fullPath} className="flex shrink-0 items-center">
            <Button
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-r-none px-2.5 text-xs"
              onClick={() => navigate(tab.fullPath)}
            >
              {tab.title}
            </Button>
            {!tab.affix && (
              <Button
                variant={active ? 'secondary' : 'ghost'}
                size="icon-xs"
                className="h-7 rounded-l-none px-1"
                aria-label={tx('关闭 {0}', { '0': tab.title })}
                onClick={() => {
                  close(tab.fullPath)
                  if (active)
                    navigate(
                      tabs[Math.max(0, tabs.findIndex(item => item.fullPath === tab.fullPath) - 1)]?.fullPath ||
                        dashboardPage.path,
                    )
                }}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
