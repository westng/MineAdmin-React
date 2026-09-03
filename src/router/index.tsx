import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, matchRoutes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useUserStore } from '@/store/modules/useUserStore'
import { useMenuStore } from '@/store/modules/useMenuStore'
import type { AppRoute } from './types'
import rootRoutes from './static-routes/rootRoute'
import { hasRouteAccess } from './access'
import AccessDeniedPage from '@/layouts/access-denied'
import { flattenVisibleMenus, getMenuPath, isVisibleMenu } from './dynamic-menu'
import DynamicMenuPage from '@/modules/base/views/dynamic-menu'
import { useRouteStore } from '@/store/modules/useRouteStore'

function ProtectedRoute() {
  const token = useUserStore(state => state.token)
  const userInitialized = useUserStore(state => state.initialized)
  const userLoading = useUserStore(state => state.loading)
  const userError = useUserStore(state => state.error)
  const userInfo = useUserStore(state => state.userInfo)
  const roles = useUserStore(state => state.roles)
  const permissions = useUserStore(state => state.permissions)
  const location = useLocation()
  const dynamicMeta = useRouteStore(state => state.find(location.pathname)?.meta)
  const hydrate = useUserStore(state => state.hydrate)
  const initialized = useMenuStore(state => state.initialized)
  const loading = useMenuStore(state => state.loading)
  const unauthorized = useMenuStore(state => state.unauthorized)
  const clearMenus = useMenuStore(state => state.clearMenus)
  const logout = useUserStore(state => state.logout)
  useEffect(() => {
    if (!token) {
      clearMenus()
      return
    }
    if (unauthorized) {
      void logout()
      return
    }
    if ((!userInitialized || !initialized) && !userLoading && !loading) {
      void hydrate()
    }
  }, [clearMenus, hydrate, initialized, loading, logout, token, unauthorized, userInitialized, userLoading])

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (userLoading || loading || !userInitialized || !initialized) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">正在初始化用户权限…</div>
  }
  if (userError && !userInfo) {
    return <Navigate to="/login" replace />
  }
  const matches = matchRoutes(rootRoutes, location)
  const meta = matches?.map(match => match.route.meta).filter(Boolean).at(-1) || dynamicMeta
  return hasRouteAccess(meta, { roles, permissions, userInfo }) ? <Outlet /> : <AccessDeniedPage />
}

function GuestRoute() {
  const token = useUserStore(state => state.token)
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function renderRoutes(routes: AppRoute[]) {
  return routes.map(route => (
    <Route key={route.name} path={route.path} element={route.element ?? <Outlet />}>
      {route.children ? renderRoutes(route.children) : null}
    </Route>
  ))
}

export function AppRouter() {
  const layoutRoute = rootRoutes[0]
  const loginRoute = rootRoutes[1]
  const menus = useMenuStore(state => state.menus)
  const Router = import.meta.env.VITE_APP_ROUTE_MODE === 'history' ? BrowserRouter : HashRouter
  const dynamicRoutes: AppRoute[] = flattenVisibleMenus(menus)
    .filter(isVisibleMenu)
    .flatMap(menu => {
      const path = getMenuPath(menu)
      if (!path) return []
      return [{
        name: `dynamic:${menu.name || path}`,
        path: path.replace(/^\//, ''),
        element: <DynamicMenuPage />,
        meta: menu.meta,
      }]
    })
  const layoutChildren = [...(layoutRoute.children || []), ...dynamicRoutes]

  return (
    <Router basename={import.meta.env.VITE_APP_ROOT_BASE}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path={layoutRoute.path} element={layoutRoute.element}>
            {layoutChildren.length ? renderRoutes(layoutChildren) : null}
          </Route>
        </Route>
        <Route element={<GuestRoute />}>
          <Route path={loginRoute.path} element={loginRoute.element} />
        </Route>
        <Route path="*" element={rootRoutes[2].element} />
      </Routes>
    </Router>
  )
}
