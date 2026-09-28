import type { RouteAccessMeta } from '@/services/auth/access'

export interface MenuMeta extends RouteAccessMeta {
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
