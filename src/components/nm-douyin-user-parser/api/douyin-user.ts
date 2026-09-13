import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'
import { normalizeDouyinUser } from '../utils/parser'
import type { DouyinUser } from '../types'

export async function getDouyinUserProfile(secUserId: string, signal?: AbortSignal): Promise<DouyinUser> {
  const baseUrl = import.meta.env.VITE_APP_API_THIRDURL?.trim().replace(/\/+$/, '')
  if (!baseUrl) throw new Error('抖音解析服务未配置，请联系管理员')

  const { data: response } = await http.get<ResponseStruct<{ user?: unknown }>>(
    `${baseUrl}/api/douyin/web/handler_user_profile`,
    { params: { sec_user_id: secUserId }, signal, timeout: 10000 },
  )
  if (response?.code !== 200) throw new Error(response?.message || '获取达人信息失败')
  return normalizeDouyinUser(response.data?.user)
}
