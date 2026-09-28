import { useSession } from '@/hooks/auth/use-session'
import { hasRouteAccess } from '@/services/auth/access'
import type { MenuVo } from '@/services/navigation/types'
import { useMemo, useState, useCallback, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { useRoute } from '@/hooks/use-route'
import { getMenuPath } from '@/router/navigation/menu'
import { findMenuTrail } from '@/router/navigation/menu'
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
    findMenuTrail(menus, pathname)[0]?.menu ??
    menus[0]
  const value = useMemo(
    () => ({ menus, activeSection, setSection, pathname, notificationsOpen, setNotificationsOpen }),
    [menus, activeSection, pathname, setSection, notificationsOpen, setNotificationsOpen],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
