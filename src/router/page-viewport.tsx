import { Activity, Component, Suspense, type ReactNode } from 'react'
import {
  Routes,
  Route,
  Navigate,
  createPath,
  generatePath,
  matchRoutes,
  parsePath,
  resolvePath,
  useLocation,
  useParams,
  type Location,
} from 'react-router-dom'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { useSession } from '@/hooks/auth/use-session'
import { useSettingStore } from '@/store/settings/use-settings'
import { useTabStore } from '@/store/tabs/use-tabs'
import { useKeepAliveStore } from '@/store/keep-alive/use-keep-alive'
import { hasRouteAccess, type AccessSubject } from '@/services/auth/access'
import { safeInternalTarget } from '@/router/navigation/menu'
import AccessDeniedPage from './pages/access-denied'
import NotFoundPage from './pages/not-found'
import type { AppRoute } from './types'

export const MAX_CACHED_PAGES = 8
const allowed = (route: AppRoute, state: AccessSubject) =>
  [route.meta, ...(route.accessMeta ?? [])].every(meta => hasRouteAccess(meta, state))
function useRouteAccess() {
  const roles = useSession(state => state.roles)
  const permissions = useSession(state => state.permissions)
  const userInfo = useSession(state => state.userInfo)
  return (route: AppRoute) => allowed(route, { roles, permissions, userInfo })
}
function Unavailable() {
  return (
    <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm">
      <p>页面暂时无法加载，请刷新重试。</p>
      <button type="button" className="rounded border px-3 py-1.5" onClick={() => window.location.reload()}>
        刷新页面
      </button>
    </div>
  )
}
function RedirectPage({ route, routes }: { route: AppRoute; routes: AppRoute[] }) {
  const location = useLocation(),
    params = useParams(),
    canAccess = useRouteAccess()
  const redirect =
    typeof route.redirect === 'string'
      ? route.redirect
      : route.redirect?.find(path => !/[:*?]/.test(path) && routes.some(item => item.path === path && canAccess(item)))
  if (!redirect || /^[a-z][\w+.-]*:|^\/\/|\\/i.test(redirect)) return <Unavailable />
  const parsed = parsePath(redirect)
  if (parsed.pathname?.split('/').includes('..')) return <Unavailable />
  let pathname: string
  try {
    pathname = generatePath(
      parsed.pathname || location.pathname,
      Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
          key,
          value === undefined ? undefined : encodeURIComponent(value),
        ]),
      ),
    )
  } catch {
    return <Unavailable />
  }
  const target = resolvePath(
    { pathname, search: parsed.search ?? location.search, hash: parsed.hash ?? location.hash },
    location.pathname,
  )
  const next = createPath(target),
    current = createPath(location)
  const trail: string[] = Array.isArray(location.state?.menuRedirects) ? location.state.menuRedirects : []
  if (!safeInternalTarget(next) || next === current || trail.includes(next) || trail.length >= 16)
    return <Unavailable />
  return <Navigate to={target} replace state={{ menuRedirects: [...trail, current] }} />
}
export function RoutePage({ route, routes = [] }: { route: AppRoute; routes?: AppRoute[] }) {
  const canAccess = useRouteAccess()
  if (!canAccess(route)) return <AccessDeniedPage />
  return (
    <ErrorBoundary label="页面" fallback={() => <Unavailable />}>
      <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">正在加载页面…</p>}>
        {route.redirect !== undefined ? (
          <RedirectPage route={route} routes={routes} />
        ) : (
          (route.element ?? <Unavailable />)
        )}
      </Suspense>
    </ErrorBoundary>
  )
}

type CacheProps = {
  location: Location
  retained: (location: Location) => boolean
  children: (location: Location) => ReactNode
}
const locationKey = (location: Location) => createPath(location)
class PageCache extends Component<CacheProps, { entries: Location[] }> {
  state = { entries: [] as Location[] }
  static getDerivedStateFromProps(props: CacheProps, state: { entries: Location[] }) {
    return {
      entries: [
        ...state.entries.filter(entry => locationKey(entry) !== locationKey(props.location) && props.retained(entry)),
        props.location,
      ].slice(-MAX_CACHED_PAGES),
    }
  }
  render() {
    return this.state.entries.map(entry => (
      <Activity
        key={locationKey(entry)}
        mode={locationKey(entry) === locationKey(this.props.location) ? 'visible' : 'hidden'}
      >
        {this.props.children(entry)}
      </Activity>
    ))
  }
}

/** 缓存只保留仍打开、仍有权限的页面，账号切换时整体释放。 */
export function PageViewport({ routes }: { routes: AppRoute[] }) {
  const location = useLocation(),
    canAccess = useRouteAccess()
  const sessionVersion = useSession(state => state.sessionVersion)
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  const tabs = useTabStore(state => state.tabs)
  const names = useKeepAliveStore(state => state.names)
  const retained = (location: Location) => {
    const route = matchRoutes(routes, location.pathname)?.at(-1)?.route
    return Boolean(
      route &&
      (route.meta?.cache === true || names.includes(route.name)) &&
      canAccess(route) &&
      tabs.some(tab => tab.fullPath === locationKey(location)),
    )
  }
  return (
    <PageCache key={sessionVersion} location={location} retained={retained}>
      {location => (
        <Routes location={location}>
          <Route path="/" element={<Navigate to={dashboardPath === '/' ? '/dashboard' : dashboardPath} replace />} />
          {routes.map(route => (
            <Route key={route.path} path={route.path} element={<RoutePage route={route} routes={routes} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </PageCache>
  )
}
