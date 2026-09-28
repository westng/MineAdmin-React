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

export {}
