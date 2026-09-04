import http from '@/utils/http'

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

export function getMenus() {
  return http.get<{ data: MenuVo[] }>('/admin/permission/menus')
}

export function getRoles() {
  return http.get<{ data: RoleVo[] }>('/admin/permission/roles')
}
