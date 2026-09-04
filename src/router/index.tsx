import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, matchRoutes, useLocation } from 'react-router-dom'
import { createElement, useEffect, useRef } from 'react'
import { useUserStore } from '@/store/modules/useUserStore'
import { useMenuStore } from '@/store/modules/useMenuStore'
import type { AppRoute } from './types'
import rootRoutes from './static-routes/rootRoute'
import { hasRouteAccess } from './access'
import AccessDeniedPage from '@/layouts/access-denied'
import { flattenVisibleMenus, getMenuPath, isVisibleMenu } from './dynamic-menu'
import DynamicMenuPage from '@/modules/base/dynamic-menu/views'
import { useRouteStore } from '@/store/modules/useRouteStore'
import { usePluginStore } from '@/provider/plugins'

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
  const plugins = usePluginStore(state => state.plugins)
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
  const pluginMeta = plugins
    .filter(plugin => plugin.enabled !== false)
    .flatMap(plugin => plugin.views || [])
    .find(view => view.path === location.pathname)?.meta
  const meta = matches?.map(match => match.route.meta).filter(Boolean).at(-1) || dynamicMeta || pluginMeta
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

function PluginNavigationLifecycle() {
  const location = useLocation()
  const previousLocation = useRef<typeof location | null>(null)

  useEffect(() => {
    if (previousLocation.current) {
      void usePluginStore.getState().callHooks('routerRedirect', {
        oldRoute: previousLocation.current,
        newRoute: location,
      }, { location })
    }
    previousLocation.current = location
  }, [location])

  return null
}

export function AppRouter() {
  const layoutRoute = rootRoutes[0]
  const loginRoute = rootRoutes[1]
  const menus = useMenuStore(state => state.menus)
  const plugins = usePluginStore(state => state.plugins)
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
  const dynamicPaths = new Set(dynamicRoutes.map(route => route.path))
  const pluginRoutes: AppRoute[] = plugins
    .filter(plugin => plugin.enabled !== false)
    .flatMap(plugin => plugin.views || [])
    .filter(view => view.path && !dynamicPaths.has(view.path.replace(/^\//, '')))
    .map(view => ({
      name: `plugin:${view.name || view.path}`,
      path: view.path.replace(/^\//, ''),
      element: view.component ? createElement(view.component) : <DynamicMenuPage />,
      meta: view.meta,
    }))
  const layoutChildren = [...(layoutRoute.children || []), ...dynamicRoutes, ...pluginRoutes]

  return (
    <Router basename={import.meta.env.VITE_APP_ROOT_BASE}>
      <PluginNavigationLifecycle />
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
