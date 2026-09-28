import type { HttpClient } from '@/services/http/client'
import { validateResponse } from '@/services/auth/schemas'
import { menusSchema, rolesSchema } from './schemas'
import type { MenuVo, RoleVo } from './types'
export function createNavigationApi(http: HttpClient) {
  function getMenus(signal?: AbortSignal) {
    return http.get<{ data: MenuVo[] }>('/admin/permission/menus', { signal }).then(response => ({
      ...response,
      data: { ...response.data, data: validateResponse(menusSchema, response.data.data, 'auth.menus') },
    }))
  }

  function getRoles(signal?: AbortSignal) {
    return http.get<{ data: RoleVo[] }>('/admin/permission/roles', { signal }).then(response => ({
      ...response,
      data: { ...response.data, data: validateResponse(rolesSchema, response.data.data, 'auth.roles') },
    }))
  }

  return { getMenus, getRoles }
}
