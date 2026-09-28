import { createNavigationApi } from '@/services/navigation/api'
import type { AppRuntime } from '@/provider/runtime/types'
export type { MenuVo, MenuMeta, RoleVo } from '@/services/navigation/types'
export function createApi(runtime: Pick<AppRuntime, 'http'>) {
  const http = runtime.http
  const { getMenus, getRoles } = createNavigationApi(http)
  return { getMenus, getRoles }
}
