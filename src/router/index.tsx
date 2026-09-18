import { useTranslate } from '@/provider/i18n'
import { PageViewport } from './page-viewport'
import {
  BrowserRouter,
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  type Location,
} from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useSession } from '@/hooks/framework/use-session'
import { useRuntime } from '@/hooks/framework/use-runtime'
import type { AppRoute } from './types'
import { useRoute } from '@/hooks/framework/use-route'
import { hasMatchedRouteAccess } from './access'
import AccessDeniedPage from '@/router/pages/access-denied'

function ProtectedRoute({ routes, initialized }: { routes: AppRoute[]; initialized: boolean }) {
  const t = useTranslate()
  const token = useSession(state => state.token)
  const userInitialized = useSession(state => state.initialized)
  const userLoading = useSession(state => state.loading)
  const userError = useSession(state => state.error)
  const userInfo = useSession(state => state.userInfo)
  const roles = useSession(state => state.roles)
  const permissions = useSession(state => state.permissions)
  const location = useLocation()
  const hydrate = useSession(state => state.hydrate)
  const { clearMenus } = useRuntime().routes
  useEffect(() => {
    if (!token) {
      clearMenus()
      return
    }
    if ((!userInitialized || !initialized) && !userLoading && !userError) {
      void hydrate()
    }
  }, [clearMenus, hydrate, initialized, token, userInitialized, userLoading, userError])

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (userLoading || !userInitialized || !initialized) {
    if (userError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm">
          <p className="text-destructive">{userError}</p>
          <button type="button" className="rounded-md border px-3 py-1.5 hover:bg-muted" onClick={() => void hydrate()}>
            {t('common.retry')}
          </button>
        </div>
      )
    }
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t('router.initializing')}
      </div>
    )
  }
  if (userError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm">
        <p className="text-destructive">{userError}</p>
        <button type="button" className="rounded-md border px-3 py-1.5 hover:bg-muted" onClick={() => void hydrate()}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  return hasMatchedRouteAccess(routes, location.pathname, { roles, permissions, userInfo }) ? (
    <Outlet />
  ) : (
    <AccessDeniedPage />
  )
}

function GuestRoute() {
  const token = useSession(state => state.token)
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function renderRoutes(routes: AppRoute[]) {
  return routes.map(route => (
    <Route key={route.name} path={route.path} element={route.element ?? <Outlet />}>
      {route.children ? renderRoutes(route.children) : null}
    </Route>
  ))
}

type NavigationListener = (location: Location, previous: Location) => void

function NavigationLifecycle({ onNavigate }: { onNavigate?: NavigationListener }) {
  const location = useLocation()
  const previousLocation = useRef<typeof location | null>(null)

  useEffect(() => {
    if (previousLocation.current) onNavigate?.(location, previousLocation.current)
    previousLocation.current = location
  }, [location, onNavigate])

  return null
}

export function AppRouter({ onNavigate }: { onNavigate?: NavigationListener } = {}) {
  const snapshot = useRoute()
  const Router = import.meta.env.VITE_APP_ROUTE_MODE === 'history' ? BrowserRouter : HashRouter
  return (
    <Router basename={import.meta.env.VITE_APP_ROOT_BASE}>
      <NavigationLifecycle onNavigate={onNavigate} />
      <Routes>
        <Route element={<ProtectedRoute routes={snapshot.protectedRoutes} initialized={snapshot.initialized} />}>
          {snapshot.protectedRoutes.map(layout => (
            <Route key={layout.name} path={layout.path} element={layout.element}>
              <Route path="*" element={<PageViewport routes={layout.children || []} />} />
            </Route>
          ))}
        </Route>
        <Route element={<GuestRoute />}>{renderRoutes(snapshot.guestRoutes)}</Route>
        {renderRoutes(snapshot.publicRoutes)}
      </Routes>
    </Router>
  )
}
