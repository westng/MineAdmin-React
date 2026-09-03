import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'

export interface AttachmentVo {
  id?: number
  storage_mode?: string
  origin_name?: string
  object_name?: string
  hash?: string
  mime_type?: string
  storage_path?: string
  suffix?: string
  size_byte?: number
  size_info?: string
  url?: string
  remark?: string
}

export function upload(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<ResponseStruct<AttachmentVo>>('/admin/attachment/upload', formData)
}

export function pageList(params: Partial<AttachmentVo> = {}) {
  return http.get<ResponseStruct<AttachmentVo[]>>('/admin/attachment/list', { params })
}

export function deleteById(id: number) {
  return http.delete<ResponseStruct<null>>(`/admin/attachment/${id}`)
}
