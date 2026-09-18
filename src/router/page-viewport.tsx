import { ErrorBoundary } from '@/components/reui/error-boundary'
import { Activity, Component, type ReactNode } from 'react'
import { Routes, Route, Outlet, matchRoutes, useLocation, type Location } from 'react-router-dom'
import { useSession } from '@/hooks/framework/use-session'
import { useTabStore } from '@/store/modules/useTabStore'
import { useKeepAliveStore } from '@/store/modules/useKeepAliveStore'
import { hasMatchedRouteAccess } from './access'
import type { AppRoute } from './types'

export const MAX_CACHED_PAGES = 8
interface Entry {
  key: string
  location: Location
}
interface CacheProps {
  location: Location
  retained: (location: Location) => boolean
  children: (location: Location) => ReactNode
  limit: number
}
class PageCache extends Component<CacheProps, { entries: Entry[] }> {
  state = { entries: [] as Entry[] }
  static getDerivedStateFromProps(props: CacheProps, state: { entries: Entry[] }) {
    const key = `${props.location.pathname}${props.location.search}${props.location.hash}`
    const entries = state.entries.filter(entry => entry.key !== key && props.retained(entry.location))
    entries.push({ key, location: props.location })
    return { entries: entries.slice(-Math.max(1, props.limit)) }
  }
  render() {
    const activeKey = `${this.props.location.pathname}${this.props.location.search}${this.props.location.hash}`
    return this.state.entries.map(entry => (
      <Activity key={entry.key} mode={entry.key === activeKey ? 'visible' : 'hidden'}>
        <ErrorBoundary label="页面">{this.props.children(entry.location)}</ErrorBoundary>
      </Activity>
    ))
  }
}
function elements(routes: AppRoute[]): ReactNode {
  return routes.map(route => (
    <Route key={route.name} path={route.path} element={route.element ?? <Outlet />}>
      {route.children ? elements(route.children) : null}
    </Route>
  ))
}
/** Each retained page gets an immutable router location. Hidden pages suspend effects via React Activity. */
export function PageViewport({ routes }: { routes: AppRoute[] }) {
  const location = useLocation()
  const session = useSession()
  const tabs = useTabStore(state => state.tabs)
  const names = useKeepAliveStore(state => state.names)
  const retained = (location: Location) => {
    const branch = matchRoutes(routes, location.pathname)
    return (
      Boolean(branch?.some(({ route }) => route.meta?.cache === true || names.includes(route.name))) &&
      tabs.some(tab => tab.fullPath === `${location.pathname}${location.search}${location.hash}`) &&
      hasMatchedRouteAccess(routes, location.pathname, session)
    )
  }
  return (
    <PageCache key={session.sessionVersion} location={location} retained={retained} limit={MAX_CACHED_PAGES}>
      {location => <Routes location={location}>{elements(routes)}</Routes>}
    </PageCache>
  )
}
