import { evaluateAccess } from '@/services/auth/access'
import { matchRoutes } from 'react-router-dom'
import type { AppRoute } from './types'
import type { RouteMeta } from '@/types/global'

type AccessState = {
  roles: string[]
  permissions: string[]
  userInfo: { username?: string; id?: number } | null
}

export function hasRouteAccess(meta: RouteMeta | undefined, state: AccessState) {
  const legacyAuth = typeof meta?.auth === 'boolean' ? undefined : meta?.auth
  return (
    [meta?.permission, meta?.permissions, legacyAuth].every(permission => evaluateAccess({ permission }, state)) &&
    [meta?.role, meta?.roles].every(role => evaluateAccess({ role }, state)) &&
    evaluateAccess({ user: meta?.user }, state)
  )
}

export function hasMatchedRouteAccess(routes: AppRoute[], pathname: string, state: AccessState) {
  const branch = matchRoutes(routes, pathname)
  return Boolean(
    branch?.every(({ route }) => [route.meta, ...(route.accessMeta || [])].every(meta => hasRouteAccess(meta, state))),
  )
}
