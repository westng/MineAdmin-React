import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'
import type { MenuVo } from './permission'

export type { MenuVo } from './permission'

export function page() {
  return http.get<ResponseStruct<MenuVo[]>>('/admin/menu/list')
}

export function create(data: MenuVo) {
  return http.post<ResponseStruct<null>>('/admin/menu', data)
}

export function save(id: number, data: MenuVo) {
  return http.put<ResponseStruct<null>>(`/admin/menu/${id}`, data)
}

export function deleteByIds(ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/menu', { data: ids })
}
