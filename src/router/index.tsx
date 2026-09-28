import { useTranslate } from '@/hooks/i18n/use-translator'
import { useSettingStore } from '@/store/settings/use-settings'
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSession } from '@/hooks/auth/use-session'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useRoute } from '@/hooks/use-route'
import { reportError } from '@/services/telemetry'
import { AsyncView } from './async-view'
import { PageViewport, RoutePage } from './page-viewport'
import { safeInternalTarget } from '@/router/navigation/menu'

const AppLayout = lazy(() => import('@/layouts'))
const LoginPage = lazy(() => import('@/modules/base/login/views'))

/** 登录检查：没有 token 去登录页；有 token 但还没加载用户信息时，先加载用户信息、菜单和角色。 */
function AuthGuard() {
  const t = useTranslate()
  const token = useSession(state => state.token)
  const initialized = useSession(state => state.initialized)
  const sessionVersion = useSession(state => state.sessionVersion)
  const hydrate = useSession(state => state.hydrate)
  const error = useSession(state => state.error)
  const location = useLocation()
  useEffect(() => {
    if (token && !initialized && !error) void hydrate()
  }, [error, hydrate, initialized, sessionVersion, token])

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  if (!initialized) {
    if (error)
      return (
        <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm">
          <p>{error}</p>
          <button type="button" className="rounded border px-3 py-1.5" onClick={() => void hydrate()}>
            重试
          </button>
        </div>
      )
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t('router.initializing')}
      </div>
    )
  }
  return <Outlet />
}

/** 已登录时访问登录页，跳回 `redirect` 或首页。 */
function GuestRoute() {
  const token = useSession(state => state.token)
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  const { search } = useLocation()
  if (!token) return <Outlet />
  const redirect = new URLSearchParams(search).get('redirect')
  const target = redirect && safeInternalTarget(redirect)
  return <Navigate to={target && !/^\/login(?:[/?#]|$)/i.test(target) ? target : dashboardPath} replace />
}

/** 默认布局；布局挂载时调用插件的 `setup` 钩子。 */
function Layout() {
  const { plugins, telemetry } = useRuntime()
  useEffect(() => {
    plugins.callHooks('setup').catch(error => reportError(telemetry, error, 'plugin:setup'))
  }, [plugins, telemetry])
  return <AppLayout />
}

/** 路由切换时调用插件的 `routerRedirect` 钩子。 */
function NavigationLifecycle() {
  const { plugins, telemetry } = useRuntime()
  const location = useLocation()
  const navigate = useNavigate()
  const previous = useRef<string | null>(null)
  useEffect(() => {
    const newRoute = `${location.pathname}${location.search}${location.hash}`
    const oldRoute = previous.current
    previous.current = newRoute
    if (oldRoute === null || oldRoute === newRoute) return
    plugins
      .callHooks('routerRedirect', { oldRoute, newRoute }, navigate)
      .catch(error => reportError(telemetry, error, 'plugin:routerRedirect'))
  }, [location, navigate, plugins, telemetry])
  return null
}

function AppRoutes() {
  const { routes } = useRoute()
  const { publicRoutes: registry } = useRuntime()
  const publicRoutes = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
  const standalone = routes.filter(route => route.meta?.useDefaultLayout === false)
  const inLayout = routes.filter(route => route.meta?.useDefaultLayout !== false)
  return (
    <>
      <NavigationLifecycle />
      <Routes>
        {publicRoutes.map(route => (
          <Route
            key={route.id}
            path={route.path}
            element={route.element ?? (route.component ? <AsyncView loader={route.component} /> : null)}
          />
        ))}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<AuthGuard />}>
          {standalone.map(route => (
            <Route key={route.path} path={route.path} element={<RoutePage route={route} routes={routes} />} />
          ))}
          <Route path="/" element={<Layout />}>
            <Route path="*" element={<PageViewport routes={inLayout} />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}

export function AppRouter() {
  const [router, setRouter] = useState<ReturnType<typeof createBrowserRouter> | null>(null)
  useEffect(() => {
    // Preserve the data-router context required by useBlocker. Menu updates only change AppRoutes.
    const createRouter = import.meta.env.VITE_APP_ROUTE_MODE === 'history' ? createBrowserRouter : createHashRouter
    const instance = createRouter([{ path: '*', element: <AppRoutes /> }], {
      basename: import.meta.env.VITE_APP_ROOT_BASE,
    })
    // Pair history subscriptions with disposal, including React StrictMode remounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRouter(instance)
    return () => instance.dispose()
  }, [])
  return (
    router && (
      <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">正在加载页面…</p>}>
        <RouterProvider router={router} />
      </Suspense>
    )
  )
}
