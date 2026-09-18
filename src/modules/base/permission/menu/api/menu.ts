import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { ResponseStruct } from '@/types/api'
import type { MenuVo } from './permission'

const queries = createResourceQueries('permission', 'menus')

export type { MenuVo } from './permission'

export function page() {
  return queries.fetch({}, querySignal =>
    http.get<ResponseStruct<MenuVo[]>>('/admin/menu/list', { signal: querySignal }),
  )
}

export function create(data: MenuVo) {
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/menu', data))
}

export function save(id: number, data: MenuVo) {
  return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/menu/${id}`, data))
}

export function deleteByIds(ids: number[]) {
  return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/menu', { data: ids }))
}
