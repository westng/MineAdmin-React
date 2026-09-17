import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { createElement, useEffect, useRef } from 'react'
import { useUserStore } from '@/store/modules/useUserStore'
import { useMenuStore } from '@/store/modules/useMenuStore'
import type { AppRoute } from './types'
import rootRoutes from './static-routes/rootRoute'
import { hasMatchedRouteAccess } from './access'
import AccessDeniedPage from '@/layouts/access-denied'
import { flattenMenuRoutes, getMenuPath } from './dynamic-menu'
import DynamicMenuPage from '@/modules/base/dynamic-menu/views'
import { usePluginStore } from '@/provider/plugins'

function ProtectedRoute({ routes }: { routes: AppRoute[] }) {
  const token = useUserStore(state => state.token)
  const userInitialized = useUserStore(state => state.initialized)
  const userLoading = useUserStore(state => state.loading)
  const userError = useUserStore(state => state.error)
  const userInfo = useUserStore(state => state.userInfo)
  const roles = useUserStore(state => state.roles)
  const permissions = useUserStore(state => state.permissions)
  const location = useLocation()
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
    if ((!userInitialized || !initialized) && !userLoading && !loading && !userError) {
      void hydrate()
    }
  }, [clearMenus, hydrate, initialized, loading, logout, token, unauthorized, userInitialized, userLoading, userError])

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (userLoading || loading || !userInitialized || !initialized) {
    if (userError) {
      return <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm"><p className="text-destructive">{userError}</p><button type="button" className="rounded-md border px-3 py-1.5 hover:bg-muted" onClick={() => void hydrate()}>重试</button></div>
    }
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">正在初始化用户权限…</div>
  }
  if (userError) {
    return <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm"><p className="text-destructive">{userError}</p><button type="button" className="rounded-md border px-3 py-1.5 hover:bg-muted" onClick={() => void hydrate()}>重试</button></div>
  }
  return hasMatchedRouteAccess(routes, location.pathname, { roles, permissions, userInfo }) ? <Outlet /> : <AccessDeniedPage />
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
  const feishuCallbackRoute = rootRoutes.find(route => route.name === 'feishu-callback')
  const menus = useMenuStore(state => state.menus)
  const plugins = usePluginStore(state => state.plugins)
  const Router = import.meta.env.VITE_APP_ROUTE_MODE === 'history' ? BrowserRouter : HashRouter
  const enabledPluginViews = plugins.filter(plugin => plugin.enabled !== false).flatMap(plugin => plugin.views || [])
  const dynamicRoutes: AppRoute[] = flattenMenuRoutes(menus)
    .flatMap(({ menu, accessMeta }) => {
      const path = getMenuPath(menu)
      if (!path) return []
      return [{
        name: `dynamic:${menu.name || path}`,
        path: path.replace(/^\//, ''),
        element: <DynamicMenuPage />,
        meta: menu.meta,
        accessMeta: [...accessMeta, ...enabledPluginViews.filter(view => view.path.replace(/^\//, '') === path.replace(/^\//, '')).flatMap(view => view.meta ? [view.meta] : [])],
      }]
    })
  const dynamicPaths = new Set(dynamicRoutes.map(route => route.path))
  const pluginRoutes: AppRoute[] = enabledPluginViews
    .filter(view => view.path && !dynamicPaths.has(view.path.replace(/^\//, '')))
    .map(view => ({
      name: `plugin:${view.name || view.path}`,
      path: view.path.replace(/^\//, ''),
      element: view.component ? createElement(view.component) : <DynamicMenuPage />,
      meta: view.meta,
    }))
  // Apply menu restrictions even when a static route owns the same URL.
  const restrictStaticRoutes = (routes: AppRoute[], parent = ''): AppRoute[] => routes.map(route => {
    const path = `${parent}/${route.path}`.replace(/\/+/g, '/').replace(/^\//, '')
    const menuRoute = dynamicRoutes.find(item => item.path === path)
    return { ...route, accessMeta: [...(route.accessMeta || []), ...(menuRoute?.accessMeta || [])],
      children: route.children ? restrictStaticRoutes(route.children, path) : undefined }
  })
  const layoutChildren = [...restrictStaticRoutes(layoutRoute.children || []), ...dynamicRoutes, ...pluginRoutes]

  return (
    <Router basename={import.meta.env.VITE_APP_ROOT_BASE}>
      <PluginNavigationLifecycle />
      <Routes>
        <Route element={<ProtectedRoute routes={[{ ...layoutRoute, children: layoutChildren }]} />}>
          <Route path={layoutRoute.path} element={layoutRoute.element}>
            {layoutChildren.length ? renderRoutes(layoutChildren) : null}
          </Route>
        </Route>
        <Route element={<GuestRoute />}>
          <Route path={loginRoute.path} element={loginRoute.element} />
        </Route>
        {feishuCallbackRoute && <Route path={feishuCallbackRoute.path} element={feishuCallbackRoute.element} />}
        <Route path="*" element={rootRoutes[2].element} />
      </Routes>
    </Router>
  )
}
