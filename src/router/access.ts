import { matchRoutes } from 'react-router-dom'
import type { AppRoute } from './types'
import type { RouteMeta } from '@/types/global'

type AccessState = {
  roles: string[]
  permissions: string[]
  userInfo: { username?: string; id?: number } | null
}

function matches(values: string[], expected?: string | string[]) {
  if (expected === undefined) return true
  if (values.includes('*')) return true
  const list = Array.isArray(expected) ? expected : [expected]
  return list.some(value => values.includes(value))
}

export function hasRouteAccess(meta: RouteMeta | undefined, state: AccessState) {
  if (!meta || meta.auth === false) return true
  if (!matches(state.roles, meta.role ?? meta.roles)) return false
  if (!matches(state.permissions, meta.permission ?? meta.permissions)) return false
  if (meta.user !== undefined) {
    const users = Array.isArray(meta.user) ? meta.user : [meta.user]
    if (!state.userInfo?.username || !users.includes(state.userInfo.username)) return false
  }
  return true
}

export function hasMatchedRouteAccess(routes: AppRoute[], pathname: string, state: AccessState) {
  const branch = matchRoutes(routes, pathname)
  return Boolean(branch?.every(({ route }) => [route.meta, ...(route.accessMeta || [])].every(meta => hasRouteAccess(meta, state))))
}
