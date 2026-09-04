import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'

export interface DepartmentUserVo {
  id?: number
  username?: string
  nickname?: string
  avatar?: string
  phone?: string
  email?: string
  pivot?: { dept_id?: number; user_id?: number }
}

export interface DepartmentVo {
  id?: number
  name?: string
  parent_id?: number | null
  remark?: string | null
  created_at?: string | null
  updated_at?: string | null
  children?: DepartmentVo[]
  department_users?: DepartmentUserVo[]
  leader?: DepartmentUserVo[]
  positions?: Array<{ id?: number; name?: string }>
  [key: string]: unknown
}

export function page(params: { name?: string } = {}) {
  return http.get<ResponseStruct<PageList<DepartmentVo>>>('/admin/department/list?level=1', { params })
}

export function create(data: DepartmentVo) {
  return http.post<ResponseStruct<null>>('/admin/department', data)
}

export function save(id: number, data: DepartmentVo) {
  return http.put<ResponseStruct<null>>(`/admin/department/${id}`, data)
}

export function deleteByIds(ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/department', { data: ids })
}
