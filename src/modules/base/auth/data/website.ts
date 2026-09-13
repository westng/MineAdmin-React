export interface WebsiteLoginConfig {
  site_name: string
  logo_url: string
  video_url: string
  headline: string
  subheadline: string
  description: string
  language_labels: string[]
  icp_number: string
  copyright_text: string
  company_text: string
}

export const defaultWebsiteLoginConfig: WebsiteLoginConfig = {
  site_name: 'BioTech博策云',
  logo_url: '/logo-hor-white.svg',
  video_url: '/b1eb435b89a05e8b.mp4',
  headline: '直击问题 · 科学定制',
  subheadline: '提供科学定制的解决方案',
  description: '每日博士旗下，“ BioTech博策云营销管理平台 ”',
  language_labels: ['English', '简体中文', '繁體中文'],
  icp_number: '浙ICP备2026026026号-1',
  copyright_text: '2024 - 2026 杭州建煜电子商务有限公司 - BioTech博策云营销管理平台',
  company_text: '杭州建煜电子商务有限公司，All Rights Reserved.',
}

function isMediaUrl(value: string) {
  if (!value || [...value].some(character => character.charCodeAt(0) <= 0x20 || character.charCodeAt(0) === 0x7f || character === '\\')) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
  }
  catch {
    return false
  }
}

export function normalizeWebsiteLoginConfig(value: unknown): WebsiteLoginConfig {
  const config = { ...defaultWebsiteLoginConfig, language_labels: [...defaultWebsiteLoginConfig.language_labels] }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return config

  const data = value as Record<string, unknown>
  for (const key of Object.keys(config) as Array<keyof WebsiteLoginConfig>) {
    if (key === 'language_labels') {
      if (Array.isArray(data[key])) {
        config[key] = data[key].filter((label): label is string => typeof label === 'string').map(label => label.trim()).filter(Boolean)
      }
    }
    else if (typeof data[key] === 'string') {
      config[key] = data[key].trim()
    }
  }
  for (const key of ['logo_url', 'video_url'] as const) {
    if (!isMediaUrl(config[key])) config[key] = defaultWebsiteLoginConfig[key]
  }
  if (!config.site_name) config.site_name = defaultWebsiteLoginConfig.site_name
  return config
}
