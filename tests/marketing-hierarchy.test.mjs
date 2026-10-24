import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
const originalAdapter = axios.defaults.adapter
let requests = 0
axios.defaults.adapter = async () => {
  requests++
  throw new Error('Marketing view registry tests block network requests')
}
const cacheDir = mkdtempSync(path.join(tmpdir(), 'marketing-view-registry-'))
let server
let runtime

after(async () => {
  runtime?.dispose()
  await server?.close()
  axios.defaults.adapter = originalAdapter
  await window.happyDOM.abort()
  window.close()
  rmSync(cacheDir, { recursive: true, force: true })
})
server = await createServer({
  mode: 'test',
  cacheDir,
  server: { middlewareMode: true, hmr: false, open: false },
  appType: 'custom',
  logLevel: 'error',
})
;({ runtime } = await server.ssrLoadModule('/src/app/runtime/instance.ts'))

const qianchuanPages = [
  'aweme/campaigns',
  'aweme/campaigns-log',
  'aweme/create',
  'aweme/list',
  'aweme/promotion',
  'aweme/reinvest',
  'aweme/template',
  'global-delivery',
  'material',
  'material-image',
  'promotion',
]
const canonicalPages = qianchuanPages.map(page => `marketing/oceanengine/qianchuan/${page}/views/index`)
canonicalPages.push('marketing/oceanengine/douplus/order/views/index')

test('实际 Runtime 直接解析产品目录中的营销页面', () => {
  for (const component of canonicalPages) {
    assert.ok(existsSync(new URL(`../src/modules/${component}.tsx`, import.meta.url)), component)
    assert.ok(runtime.views.has(component, 'modules/'), component)
    assert.equal(runtime.views.has(component, 'plugins/'), false)
  }
  assert.equal(requests, 0)
})

test('实际 Runtime 不注册旧营销路径别名', () => {
  for (const page of qianchuanPages) assert.equal(runtime.views.has(`marketing/${page}/views/index`, 'modules/'), false)
  assert.equal(runtime.views.has('marketing/douplus-order/views/index', 'modules/'), false)
  const keys = runtime.views.keys().filter(key => key.startsWith('modules/marketing/'))
  assert.equal(keys.length, canonicalPages.length)
  assert.ok(keys.every(key => key.startsWith('modules/marketing/oceanengine/')))
})
