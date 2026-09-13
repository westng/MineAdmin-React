import type { DouyinUser } from '../types'

export function extractSecUserId(value: string): string {
  const text = value.trim()
  if (!text) throw new Error('请输入抖音用户主页链接')

  const link = text.match(/https?:\/\/[^\s<>"'，。；！？()（）【】]+/i)?.[0] ?? text
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`)
  } catch {
    throw new Error('请输入正确的抖音用户主页链接')
  }

  if (url.hostname === 'v.douyin.com') {
    throw new Error('请粘贴完整的抖音用户主页链接，暂不支持短链接')
  }
  const match = url.pathname.match(/^\/user\/([A-Za-z0-9_-]+)\/?$/)
  if (!['http:', 'https:'].includes(url.protocol)
    || (url.hostname !== 'douyin.com' && !url.hostname.endsWith('.douyin.com'))
    || url.username || url.password || !match) {
    throw new Error('请输入正确的抖音用户主页链接')
  }
  return match[1]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeDouyinUser(value: unknown): DouyinUser {
  if (!isRecord(value) || value.uid === undefined || value.uid === null || value.uid === '') {
    throw new Error('接口返回异常：未获取到用户 UID')
  }
  // 不把超出安全整数范围的数字转换成已丢失精度的 UID。
  const uid = typeof value.uid === 'string'
    ? value.uid.trim()
    : typeof value.uid === 'number' && Number.isSafeInteger(value.uid) ? String(value.uid) : ''
  if (!/^[1-9][0-9]*$/.test(uid)) throw new Error('接口返回异常：用户 UID 格式无效')

  const avatar = isRecord(value.avatar_thumb) ? value.avatar_thumb : undefined
  return {
    ...value,
    uid,
    nickname: typeof value.nickname === 'string' ? value.nickname : '',
    avatar_thumb: avatar ? {
      ...avatar,
      url_list: Array.isArray(avatar.url_list) ? avatar.url_list.filter((url): url is string => typeof url === 'string') : [],
    } : undefined,
  }
}

export function getParseErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) return error.message
  return '请求达人信息接口异常，请稍后重试'
}
