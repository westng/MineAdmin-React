import { useState, type CSSProperties, type PropsWithChildren } from 'react'
import { useShell } from '@/hooks/shell/use-shell'
import { findMenuTrail, getMenuPath, isVisibleMenu } from '@/router/dynamic-menu'
import { VerveNavigationContext } from './navigation-context'

export function VerveNavigationProvider({ children }: PropsWithChildren) {
  const { menus, pathname } = useShell()
  const [selection, setSelection] = useState<{ path: string | null; pathname: string }>()
  const [width, setWidth] = useState(200)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const visibleMenus = menus.filter(isVisibleMenu)
  const routeSection = findMenuTrail(visibleMenus, pathname)[0]?.menu
  const section =
    selection?.pathname === pathname
      ? selection.path
        ? visibleMenus.find(menu => getMenuPath(menu) === selection.path)
        : undefined
      : routeSection

  return (
    <VerveNavigationContext.Provider
      value={{
        section,
        clearSection: () => setSelection({ path: null, pathname }),
        selectSection: menu => setSelection({ path: getMenuPath(menu), pathname }),
        width,
        setWidth: nextWidth => setWidth(Math.min(360, Math.max(160, nextWidth))),
        notificationsOpen,
        setNotificationsOpen,
      }}
    >
      <div
        className="verve-shell flex min-h-0 w-full flex-1"
        style={{ '--verve-section-width': `${width}px` } as CSSProperties}
      >
        {children}
      </div>
    </VerveNavigationContext.Provider>
  )
}
