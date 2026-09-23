import { createRegistry } from '@/services/registry'

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
  site_name: 'MineAdmin',
  logo_url: '',
  video_url: '',
  headline: '',
  subheadline: '',
  description: '',
  language_labels: ['简体中文', 'English'],
  icp_number: '',
  copyright_text: '',
  company_text: '',
}

export interface LoginPageConfig {
  id: string
  branding: WebsiteLoginConfig
  subtitle?: string
  usernameType?: 'text' | 'email'
  showAccountLinks?: boolean
}

const loginPageConfigurations = createRegistry<LoginPageConfig>()
const defaultLoginPageConfig: LoginPageConfig = { id: 'default', branding: defaultWebsiteLoginConfig }
export const registerLoginPageConfig = loginPageConfigurations.register
export function getLoginPageConfig() {
  return loginPageConfigurations.getSnapshot().at(-1) ?? defaultLoginPageConfig
}

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
