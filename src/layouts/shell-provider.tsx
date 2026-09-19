import { useSession } from '@/hooks/framework/use-session'
import { hasRouteAccess } from '@/router/access'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import { useMemo, useState, useCallback, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { useRoute } from '@/hooks/framework/use-route'
import { getMenuPath, flattenVisibleMenus } from '@/router/dynamic-menu'
import { ShellContext } from './shell-context'
export function ShellProvider({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const { menus: sourceMenus } = useRoute()
  const roles = useSession(state => state.roles)
  const permissions = useSession(state => state.permissions)
  const userInfo = useSession(state => state.userInfo)
  const menus = useMemo(() => {
    const visit = (items: MenuVo[]): MenuVo[] =>
      items
        .filter(menu => hasRouteAccess(menu.meta, { roles, permissions, userInfo }))
        .map(menu => ({ ...menu, children: menu.children ? visit(menu.children) : undefined }))
    return visit(sourceMenus)
  }, [sourceMenus, roles, permissions, userInfo])
  const [selection, setSelection] = useState({ path: '', pathname: '' })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const setSection = useCallback((path: string) => setSelection({ path, pathname }), [pathname])
  const activeSection =
    menus.find(menu => selection.pathname === pathname && getMenuPath(menu) === selection.path) ??
    menus.find(menu =>
      flattenVisibleMenus([menu]).some(item => {
        const path = getMenuPath(item)
        return path && (pathname === path || pathname.startsWith(`${path}/`))
      }),
    ) ??
    menus[0]
  const value = useMemo(
    () => ({ menus, activeSection, setSection, pathname, notificationsOpen, setNotificationsOpen }),
    [menus, activeSection, pathname, setSection, notificationsOpen],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
