import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/reui/primitives/button'
import { useTabStore, type TabItem } from '@/store/modules/useTabStore'
import { findMenuByPath, getMenuLabel } from '@/router/dynamic-menu'
import { useRoute } from '@/hooks/framework/use-route'
import { useSettingStore } from '@/provider/settings'

const tx = createTextTranslator('shell.ui')

const defaultTab: TabItem = {
  name: 'dashboard',
  path: '/dashboard',
  fullPath: '/dashboard',
  title: 'Overview',
  i18n: 'menu.dashboard',
  affix: true,
}

export default function Tabbar() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const location = useLocation()
  const navigate = useNavigate()
  const { menus } = useRoute()
  const enabled = useSettingStore(state => state.settings.tabbar.enable)
  const tabs = useTabStore(state => state.tabs)
  const initialized = useTabStore(state => state.initialized)
  const init = useTabStore(state => state.init)
  const add = useTabStore(state => state.add)
  const close = useTabStore(state => state.close)

  useEffect(() => {
    if (!initialized) init(defaultTab)
    const dynamic = findMenuByPath(menus, location.pathname)
    add({
      name: location.pathname,
      path: location.pathname,
      fullPath: `${location.pathname}${location.search}${location.hash}`,
      title: dynamic
        ? getMenuLabel(dynamic)
        : location.pathname === '/dashboard'
          ? 'Overview'
          : location.pathname.split('/').filter(Boolean).pop() || tx('页面'),
      affix: location.pathname === '/dashboard',
    })
  }, [add, init, initialized, location.hash, location.pathname, location.search, menus])

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
                        '/dashboard',
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
