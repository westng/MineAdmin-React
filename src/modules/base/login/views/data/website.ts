import { defaultWebsiteLoginConfig, type WebsiteLoginConfig } from '@/provider/extensions/login-page'
export type { WebsiteLoginConfig, LoginPageConfig } from '@/provider/extensions/login-page'

function isMediaUrl(value: string) {
  if (
    !value ||
    [...value].some(
      character => character.charCodeAt(0) <= 0x20 || character.charCodeAt(0) === 0x7f || character === '\\',
    )
  )
    return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export function normalizeWebsiteLoginConfig(
  value: unknown,
  defaults: WebsiteLoginConfig = defaultWebsiteLoginConfig,
): WebsiteLoginConfig {
  const config = { ...defaults, language_labels: [...defaults.language_labels] }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return config

  const data = value as Record<string, unknown>
  for (const key of Object.keys(config) as Array<keyof WebsiteLoginConfig>) {
    if (key === 'language_labels') {
      if (Array.isArray(data[key])) {
        config[key] = data[key]
          .filter((label): label is string => typeof label === 'string')
          .map(label => label.trim())
          .filter(Boolean)
      }
    } else if (typeof data[key] === 'string') {
      config[key] = data[key].trim()
    }
  }
  for (const key of ['logo_url', 'video_url'] as const) {
    if (!isMediaUrl(config[key])) config[key] = defaults[key]
  }
  if (!config.site_name) config.site_name = defaults.site_name
  return config
}
