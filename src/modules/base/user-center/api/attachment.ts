import http from '@/utils/http'
import type { AxiosRequestConfig } from 'axios'
import type { ResponseStruct } from '@/types/api'

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
  return http.post<ResponseStruct<AttachmentVo>>('/admin/attachment/upload', formData, options)
}

export function pageList(params: AttachmentSearchParams = {}, options?: Pick<AxiosRequestConfig, 'signal'>) {
  return http.get<ResponseStruct<{ list: AttachmentVo[]; total: number }>>('/admin/attachment/list', { ...options, params })
}

export function deleteById(id: number) {
  return http.delete<ResponseStruct<null>>(`/admin/attachment/${id}`)
}
