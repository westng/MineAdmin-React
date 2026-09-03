import type { AppRoute } from '@/router/types'

export function flattenRoutes(routes: AppRoute[], parentPath = ''): AppRoute[] {
  return routes.flatMap(route => {
    const path = route.path.startsWith('/') ? route.path : `${parentPath}/${route.path}`.replace(/\/+/g, '/')
    const current = { ...route, path }
    return route.children ? [current, ...flattenRoutes(route.children, path)] : [current]
  })
}

export function isRedirectRoute(route: AppRoute) {
  return Boolean(route.meta?.type === 'L' || route.meta?.type === 'I')
}
