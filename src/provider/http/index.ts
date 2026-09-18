import { createHttpClient } from '@/services/http/client'
import { useSessionStore } from '@/provider/session'
import { usePluginStore } from '@/provider/plugins'

const http = createHttpClient({
  baseURL:
    import.meta.env.VITE_OPEN_PROXY === 'true'
      ? import.meta.env.VITE_PROXY_PREFIX
      : import.meta.env.VITE_APP_API_BASEURL,
  session: () => useSessionStore.getState(),
  callHooks: (hook, ...args) => usePluginStore.getState().callHooks(hook, ...args),
})
export default http
