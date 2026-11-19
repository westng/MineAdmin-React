import type { UserInfo } from '@/services/auth/session-manager'
import type { AppSettings } from '@/store/settings/types'
import type { AccountSettings } from '../../api/account'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readAccountSettings(userInfo: UserInfo | null | undefined): AccountSettings {
  const backendSetting = userInfo?.backend_setting
  const account = isRecord(backendSetting) && isRecord(backendSetting.account) ? backendSetting.account : {}
  return {
    multiDeviceLogin: typeof account.multiDeviceLogin === 'boolean' ? account.multiDeviceLogin : false,
  }
}

export function readTabbarEnabled(userInfo: UserInfo | null | undefined, fallback: boolean) {
  const backendSetting = userInfo?.backend_setting
  const tabbar = isRecord(backendSetting) && isRecord(backendSetting.tabbar) ? backendSetting.tabbar : {}
  return typeof tabbar.enable === 'boolean' ? tabbar.enable : fallback
}

export function mergeAccountSettings(
  userInfo: UserInfo | null | undefined,
  account: AccountSettings,
  app: AppSettings,
  tabbarEnabled: boolean,
) {
  const backendSetting = isRecord(userInfo?.backend_setting) ? userInfo.backend_setting : {}
  const previousApp = isRecord(backendSetting.app) ? { ...backendSetting.app } : {}
  const previous = isRecord(backendSetting.account) ? { ...backendSetting.account } : {}
  const previousTabbar = isRecord(backendSetting.tabbar) ? { ...backendSetting.tabbar } : {}
  return {
    ...backendSetting,
    app: { ...previousApp, ...app },
    account: { ...previous, ...account },
    tabbar: { ...previousTabbar, enable: tabbarEnabled },
  }
}

export function appearanceSettings(app: AppSettings) {
  return {
    colorMode: app.colorMode,
    primaryColor: app.primaryColor,
    layout: app.layout,
    contentWidth: app.contentWidth,
  }
}

function isColorMode(value: unknown): value is AppSettings['colorMode'] {
  return value === 'light' || value === 'dark' || value === 'autoMode'
}

export function savedAppearanceSettings(userInfo: UserInfo | null | undefined, fallback: AppSettings) {
  const backendSetting = userInfo?.backend_setting
  const app = isRecord(backendSetting) && isRecord(backendSetting.app) ? backendSetting.app : {}
  return {
    colorMode: isColorMode(app.colorMode) ? app.colorMode : fallback.colorMode,
    primaryColor: typeof app.primaryColor === 'string' ? app.primaryColor : fallback.primaryColor,
    layout: typeof app.layout === 'string' ? app.layout : fallback.layout,
    contentWidth:
      app.contentWidth === 'bounded' || app.contentWidth === 'full' ? app.contentWidth : fallback.contentWidth,
  }
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
    return error.message
  return fallback
}
