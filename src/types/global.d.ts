declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean
    readonly VITE_APP_TITLE: string
    readonly VITE_APP_PORT: string
    readonly VITE_APP_ROOT_BASE: string
    readonly VITE_APP_API_BASEURL: string
    readonly VITE_APP_API_THIRDURL?: string
    readonly VITE_APP_ROUTE_MODE: 'history' | 'hash'
    readonly VITE_APP_STORAGE_PREFIX: string
    readonly VITE_OPEN_PROXY: string
    readonly VITE_PROXY_PREFIX: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
    readonly glob: import('vite').ImportGlobFunction
  }

  const __MINE_SYSTEM_INFO__: {
    pkg: { version: string }
    lastBuildTime: string
  }
}

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
}

export interface RouteMeta {
  title?: string
  i18n?: string
  icon?: string
  hidden?: boolean
  type?: string
  cache?: boolean
  copyright?: boolean
  breadcrumbEnable?: boolean
  useDefaultLayout?: boolean
  /** Legacy menu permission codes; booleans are retained as non-authorizing metadata. */
  auth?: boolean | string | string[]
  role?: string | string[]
  roles?: string | string[]
  permission?: string | string[]
  permissions?: string | string[]
  user?: string | string[]
  affix?: boolean
}
