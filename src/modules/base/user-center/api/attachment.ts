import http from '@/provider/http'
import { createResourceQueries } from '@/provider/query/resource'
import type { AxiosRequestConfig } from 'axios'
import type { ResponseStruct } from '@/types/api'
const queries = createResourceQueries('base', 'attachments')

export type AttachmentVo = {
  id: number
  storage_mode?: number | string | null
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
  created_by?: number | null
  updated_by?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type AttachmentSearchParams = {
  page?: number
  page_size?: number
  origin_name?: string
  suffix?: string
  storage_mode?: number
  created_at?: [string, string]
  order_by?: 'id' | 'origin_name' | 'size_byte'
  order_by_direction?: 'asc' | 'desc'
}

export function upload(file: File, options?: Pick<AxiosRequestConfig, 'signal' | 'onUploadProgress' | 'timeout'>) {
  const formData = new FormData()
  formData.append('file', file)
  return queries.mutate(() => http.post<ResponseStruct<AttachmentVo>>('/admin/attachment/upload', formData, options))
}

export function pageList(params: AttachmentSearchParams = {}, options?: { signal?: AbortSignal }) {
  return queries.fetch(
    params,
    signal =>
      http.get<ResponseStruct<{ list: AttachmentVo[]; total: number }>>('/admin/attachment/list', {
        signal,
        params,
      }),
    options?.signal,
  )
}

export function deleteById(id: number) {
  return queries.mutate(() => http.delete<ResponseStruct<null>>(`/admin/attachment/${id}`))
}
