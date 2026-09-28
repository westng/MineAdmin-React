import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import { Window } from 'happy-dom'
import axios from 'axios'
const window = new Window({
  url: 'http://localhost/',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
for (const key of ['window', 'document', 'localStorage', 'navigator', 'MutationObserver'])
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
const requests = []
axios.defaults.adapter = async config => {
  requests.push(config.url)
  throw new Error('Bootstrap smoke blocks network requests')
}
// Public smoke links node_modules to the live checkout. Never share its Vite cache.
const cacheDir = mkdtempSync(path.join(os.tmpdir(), 'mineadmin-bootstrap-cache-'))
let server
try {
  server = await createServer({
    mode: 'test',
    cacheDir,
    server: { middlewareMode: true, hmr: false, open: false },
    appType: 'custom',
    logLevel: 'error',
  })
  const { bootstrap } = await server.ssrLoadModule('/src/app/bootstrap.ts')
  const { runtime } = await server.ssrLoadModule('/src/app/runtime/instance.ts')
  const dispose = await bootstrap()
  if (!runtime.views.has('base/user/views/index', 'modules/')) throw new Error('Bootstrap cannot resolve base views')
  const pluginCount = runtime.plugins.list().length
  if (requests.length) throw new Error(`Unexpected bootstrap network activity (${requests.length} requests)`)
  dispose()
  dispose()
  const secondDispose = await bootstrap()
  if (runtime.plugins.list().length !== pluginCount) throw new Error('Second bootstrap changed the discovered plugins')
  secondDispose()
  runtime.query.clear()
  console.log('Application bootstrap and disposal passed with empty synthetic storage and blocked network')
} finally {
  await server?.close()
  rmSync(cacheDir, { recursive: true, force: true })
  await window.happyDOM.abort()
  window.close()
}
