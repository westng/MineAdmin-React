export interface AppSettings {
  colorMode: 'light' | 'dark' | 'autoMode'
  useLocale: string
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  whiteRoute: string[]
  layout: 'columns' | 'classic' | 'mixed' | (string & {})
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  pageAnimate: string
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  enableWatermark: boolean
  primaryColor: string
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  asideDark: boolean
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  showBreadcrumb: boolean
  loadUserSetting: boolean
  /** @deprecated Compatibility field; not implemented by the default Shell. */
  watermarkText: string | string[]
}

export interface SystemSettings {
  app: AppSettings
  /** @deprecated Legacy display preferences; default Shell uses the current navigation contract. */
  mainAside: { showIcon: boolean; showTitle: boolean; enableOpenFirstRoute: boolean }
  /** @deprecated Legacy display preferences. */
  subAside: { showIcon: boolean; showTitle: boolean; fixedAsideState: boolean; showCollapseButton: boolean }
  tabbar: { enable: boolean; mode: 'rectangle' | 'card' | 'chrome' }
  toolBars: Array<{ name: string; show: boolean }>
  copyright: { enable: boolean; dates: string; company: string; website: string; putOnRecord: string }
  /** 工作台 dashboard 首页；`/` 跳转到 `/dashboard`，标签栏固定显示它。 */
  dashboardPage: { name: string; path: string; title: string; icon?: string }
}
