import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { after, afterEach, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

const window = new Window({
  url: 'http://localhost/',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver'])
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const require = createRequire(import.meta.url)
const { act } = require('react')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const result = await build({
  entryPoints: ['src/app/main.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  loader: { '.css': 'empty' },
  define: { 'import.meta.hot': 'globalThis.__loadingFixture.hot' },
  plugins: [
    {
      name: 'loading-entry-fixtures',
      setup(build) {
        build.onResolve({ filter: /^\.\/(App|bootstrap)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
          loader: 'tsx',
          resolveDir: process.cwd(),
          contents:
            args.path === './App'
              ? `import React from 'react'; export default function App() { return <main>application-ready</main> }`
              : `export function bootstrap() { return globalThis.__loadingFixture.pending }`,
        }))
      },
    },
  ],
})

let cleanup
afterEach(async () => {
  await act(async () => cleanup?.())
  cleanup = undefined
  delete globalThis.__loadingFixture
  document.body.replaceChildren()
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})

function prepare() {
  document.open()
  document.write(html)
  document.close()
  let resolve, reject
  const pending = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  globalThis.__loadingFixture = {
    pending,
    hot: {
      dispose(callback) {
        cleanup = callback
      },
    },
  }
  return { resolve, reject, mount: document.getElementById('app') }
}
function start() {
  const module = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
}

test('Vite 在脚本执行前注入项目标题，保留可见加载文案并安全处理特殊字符', async () => {
  const previousTitle = process.env.VITE_APP_TITLE
  const cacheDir = mkdtempSync(path.join(os.tmpdir(), 'mineadmin-title-cache-'))
  try {
    for (const title of ['示例管理台', '研发 & <img src=x onerror="alert(1)"> "$&" \'标题\'', '']) {
      process.env.VITE_APP_TITLE = title
      const server = await createServer({
        mode: 'test',
        cacheDir,
        server: { middlewareMode: true, hmr: false, open: false, preTransformRequests: false },
        optimizeDeps: { noDiscovery: true, include: [] },
        appType: 'custom',
        logLevel: 'error',
      })
      try {
        const output = await server.transformIndexHtml('/', html)
        document.open()
        document.write(output)
        document.close()
        const expected = title || 'MineAdmin'
        assert.equal(document.title, expected)
        assert.equal(document.querySelector('.app-boot-title').textContent, expected)
        assert.equal(document.querySelector('.app-boot-message').textContent, '正在加载应用…')
        assert.equal(document.querySelector('#app img'), null)
        assert.doesNotMatch(output, /%APP_TITLE%/)
      } finally {
        await server.close()
      }
    }
  } finally {
    if (previousTitle === undefined) delete process.env.VITE_APP_TITLE
    else process.env.VITE_APP_TITLE = previousTitle
    rmSync(cacheDir, { recursive: true, force: true })
  }
})

test('刷新首屏在脚本和初始化完成前保留，React 挂载后接管且热更新正确释放', async () => {
  const { resolve, mount } = prepare()
  const initial = mount.querySelector('[role="status"]')
  assert.ok(initial, 'HTML must provide loading feedback before any application JavaScript runs')
  assert.match(initial.textContent, /正在加载应用/)
  await act(async () => start())
  assert.equal(mount.querySelector('[role="status"]'), initial)
  let disposals = 0
  await act(async () => resolve(() => disposals++))
  assert.match(mount.textContent, /application-ready/)
  assert.equal(mount.querySelector('[role="status"]'), null)
  await act(async () => cleanup())
  cleanup = undefined
  assert.equal(disposals, 1)
  assert.equal(mount.textContent, '')
})

test('初始化失败结束 loading 并提供可操作的刷新入口', async t => {
  const { reject, mount } = prepare()
  t.mock.method(console, 'error', () => {})
  let reloads = 0
  t.mock.method(window.location, 'reload', () => reloads++)
  await act(async () => start())
  await act(async () => reject(new Error('Synthetic bootstrap failure')))
  assert.equal(mount.querySelector('[role="status"]'), null)
  const alert = mount.querySelector('[role="alert"]')
  assert.match(alert.textContent, /应用初始化失败/)
  const retry = alert.querySelector('button')
  assert.equal(retry.type, 'button')
  retry.click()
  assert.equal(reloads, 1)
})
