import { createBuiltinLayouts } from '@/layouts/builtins'
import { createAppRuntime } from './create-runtime'
import { createBrowserStorage } from '@/services/storage'
import { staticRoutes } from '@/router/static-routes'
import type { ViewLoader } from '@/router/types'
const viewFiles = import.meta.glob<Awaited<ReturnType<ViewLoader>>>([
  '../../modules/**/views/**/*.{tsx,jsx}',
  '../../plugins/**/views/**/*.{tsx,jsx}',
  '!**/views/**/{components,data,hooks,__tests__}/**',
  '!**/*.{test,spec}.{tsx,jsx}',
])
export const runtime = createAppRuntime({
  layouts: createBuiltinLayouts(),
  viewFiles,
  staticRoutes,
  storage: createBrowserStorage(localStorage, window),
  title: import.meta.env.VITE_APP_TITLE || 'MineAdmin',
  prefix: import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_',
  baseURL:
    import.meta.env.VITE_OPEN_PROXY === 'true'
      ? import.meta.env.VITE_PROXY_PREFIX
      : import.meta.env.VITE_APP_API_BASEURL,
  origin: window.location.origin,
})
if (import.meta.hot) import.meta.hot.dispose(() => runtime.dispose())
