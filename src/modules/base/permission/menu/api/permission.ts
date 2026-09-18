import { validateResponse } from '@/services/auth/schemas'
import { menusSchema, rolesSchema } from './schema'
import http from '@/provider/http'

export interface MenuMeta {
  title?: string
  i18n?: string
  badge?: string
  icon?: string
  hidden?: boolean
  type?: 'M' | 'B' | 'L' | 'I' | string
  link?: string
  [key: string]: unknown
}

export interface MenuVo {
  id?: number
  parent_id?: number
  name?: string
  code?: string
  path?: string
  route?: string
  component?: string
  redirect?: string
  icon?: string
  is_hidden?: number | boolean
  type?: 'M' | 'B' | 'L' | 'I' | string
  status?: number
  sort?: number
  meta?: MenuMeta
  children?: MenuVo[]
  [key: string]: unknown
}

export interface RoleVo {
  id?: number
  code?: string
  name?: string
  remark?: string
}

export function getMenus(signal?: AbortSignal) {
  return http.get<{ data: MenuVo[] }>('/admin/permission/menus', { signal }).then(response => ({
    ...response,
    data: { ...response.data, data: validateResponse(menusSchema, response.data.data, 'auth.menus') },
  }))
}

export function getRoles(signal?: AbortSignal) {
  return http.get<{ data: RoleVo[] }>('/admin/permission/roles', { signal }).then(response => ({
    ...response,
    data: { ...response.data, data: validateResponse(rolesSchema, response.data.data, 'auth.roles') },
  }))
}
