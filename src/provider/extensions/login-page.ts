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

export function createLoginPageConfigurations() {
  const loginPageConfigurations = createRegistry<LoginPageConfig>()
  const defaultLoginPageConfig: LoginPageConfig = { id: 'default', branding: defaultWebsiteLoginConfig }
  const registerLoginPageConfig = loginPageConfigurations.register
  function getLoginPageConfig() {
    return loginPageConfigurations.getSnapshot().at(-1) ?? defaultLoginPageConfig
  }

  return { register: registerLoginPageConfig, getSnapshot: getLoginPageConfig }
}
