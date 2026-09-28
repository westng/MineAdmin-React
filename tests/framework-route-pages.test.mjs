import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
const require = createRequire(import.meta.url)
const window = new Window({
  url: 'http://localhost/admin/',
  settings: { disableIframePageLoading: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
})
for (const key of [
  'window',
  'document',
  'navigator',
  'localStorage',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MutationObserver',
])
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const { useParams, useLocation } = require('react-router-dom')
const result = await build({
  stdin: {
    contents: `export { createAppRuntime } from './src/app/runtime/create-runtime'; export { RuntimeContext } from './src/provider/runtime/context'; export { AppRouter } from './src/router';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: {
    'import.meta.env': '{"VITE_APP_ROOT_BASE":"/admin","VITE_APP_ROUTE_MODE":"history"}',
    'import.meta.hot': 'undefined',
  },
  plugins: [
    {
      name: 'test-shell',
      setup(build) {
        build.onResolve({ filter: /^@\/layouts$/ }, () => ({ path: 'layout', namespace: 'fixture' }))
        build.onResolve({ filter: /^@\/modules\/base\/login\/views$/ }, () => ({ path: 'login', namespace: 'fixture' }))
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
          loader: 'jsx',
          resolveDir: process.cwd(),
          contents:
            args.path === 'layout'
              ? `import React from 'react'; import { Outlet } from 'react-router-dom'; export default function Layout() { return <main data-layout="default"><Outlet /></main> }`
              : `import React from 'react'; export default function LoginPage() { return <div>login-page</div> }`,
        }))
      },
    },
  ],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
const roots = [],
  apps = []
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  for (const app of apps.splice(0)) app.dispose()
  document.body.replaceChildren()
  localStorage.clear()
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})
const page = text => async () => ({ default: () => h('p', null, text) })
async function app({ menus = [], files = {}, plugins = [], staticRoutes = [] } = {}) {
  const runtime = core.createAppRuntime({
    storage: localStorage,
    prefix: 'route_',
    viewFiles: files,
    staticRoutes: [{ name: 'dashboard', path: '/dashboard', component: page('default-page') }, ...staticRoutes],
  })
  apps.push(runtime)
  runtime.http.defaults.adapter = async config => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { code: 200, data: config.url.endsWith('/menus') ? menus : [] },
  })
  for (const plugin of plugins) await runtime.plugins.register(plugin, runtime)
  await runtime.session
    .getState()
    .loginWithTokens(
      { access_token: 'synthetic', refresh_token: 'synthetic-refresh', expire_at: 3600 },
      { username: 'reader' },
    )
  runtime.session.setState({ initialized: true, permissions: ['read'], roles: [] })
  await runtime.navigation.getState().refreshMenus()
  return runtime
}
function plugin(views = [], enable = true) {
  return { config: { enable, info: { name: 'example/report', version: '1' } }, views }
}
async function mount(runtime, path) {
  window.history.replaceState({}, '', `/admin${path}`)
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  roots.push(root)
  await act(async () =>
    root.render(h(React.StrictMode, null, h(core.RuntimeContext.Provider, { value: runtime }, h(core.AppRouter)))),
  )
  return node
}
async function go(path) {
  await act(async () => {
    window.history.pushState({}, '', `/admin${path}`)
    window.dispatchEvent(new window.PopStateEvent('popstate'))
  })
}

test('All four route sources render through the same real router', async () => {
  const runtime = await app({
    files: {
      '../modules/demo/orders/views/index.tsx': page('module-page'),
      '../plugins/example/report/views/index.tsx': page('plugin-dynamic-page'),
    },
    menus: [
      { path: '/orders', component: 'demo/orders/views/index', meta: { componentPath: 'modules/' } },
      { path: '/reports', component: 'example/report/views/index', meta: { componentPath: 'plugins/' } },
    ],
    plugins: [plugin([{ name: 'help', path: '/report/help', component: page('plugin-static-page') }])],
  })
  const node = await mount(runtime, '/dashboard')
  assert.match(node.textContent, /default-page/)
  for (const [path, text] of [
    ['/orders', 'module-page'],
    ['/reports', 'plugin-dynamic-page'],
    ['/report/help', 'plugin-static-page'],
  ]) {
    await go(path)
    assert.match(node.textContent, new RegExp(text))
  }
})

test('A delayed menu view finishes its first navigation and only loads once', async () => {
  let finishLoading
  let loads = 0
  const pending = new Promise(resolve => {
    finishLoading = resolve
  })
  const runtime = await app({
    files: {
      '../modules/demo/views/slow.tsx': () => {
        loads += 1
        return pending
      },
    },
    menus: [{ path: '/slow', component: 'demo/views/slow' }],
  })
  const node = await mount(runtime, '/dashboard')
  await go('/slow')
  assert.match(node.textContent, /正在加载页面/)
  await act(async () => runtime.navigation.getState().refreshRoutes())
  assert.equal(loads, 1)
  await act(async () => finishLoading({ default: () => h('p', null, 'slow-page-ready') }))
  assert.match(node.textContent, /slow-page-ready/)
  assert.doesNotMatch(node.textContent, /正在加载页面/)
  await go('/dashboard')
  await go('/slow')
  assert.match(node.textContent, /slow-page-ready/)
  assert.equal(loads, 1)
})

test('A view that finishes loading while hidden is ready when its cached tab returns', async () => {
  let finishLoading
  let loads = 0
  const pending = new Promise(resolve => {
    finishLoading = resolve
  })
  const runtime = await app({
    staticRoutes: [
      {
        name: 'slow-cache',
        path: '/slow-cache',
        meta: { cache: true },
        component: () => {
          loads += 1
          return pending
        },
      },
    ],
  })
  runtime.tabs.getState().add({ name: 'slow-cache', path: '/slow-cache', fullPath: '/slow-cache', title: 'Slow' })
  const node = await mount(runtime, '/slow-cache')
  assert.match(node.textContent, /正在加载页面/)
  await go('/dashboard')
  await act(async () => finishLoading({ default: () => h('p', null, 'cached-page-ready') }))
  assert.match(node.textContent, /default-page/)
  await go('/slow-cache')
  assert.match(node.textContent, /cached-page-ready/)
  assert.equal(loads, 1)
})

test('A rejected view load can retry instead of remaining in loading', async () => {
  let failLoading
  let attempts = 0
  const pending = new Promise((_resolve, reject) => {
    failLoading = reject
  })
  const runtime = await app({
    files: {
      '../modules/demo/views/broken.tsx': () =>
        ++attempts === 1 ? pending : Promise.resolve({ default: () => h('p', null, 'retry-ready') }),
    },
    menus: [{ path: '/broken', component: 'demo/views/broken' }],
  })
  const node = await mount(runtime, '/broken')
  assert.match(node.textContent, /正在加载页面/)
  await act(async () => failLoading(new Error('Synthetic view loading failure')))
  assert.match(node.textContent, /页面加载失败/)
  assert.doesNotMatch(node.textContent, /正在加载页面/)
  await act(async () => node.querySelector('button').click())
  assert.match(node.textContent, /retry-ready/)
  assert.equal(attempts, 2)
})

test('Hidden details receive parameters and basename is handled once', async () => {
  const runtime = await app({
    files: {
      '../modules/demo/views/detail.tsx': async () => ({
        default: () => h('p', null, `detail:${useParams().id}:${useLocation().pathname}`),
      }),
    },
    menus: [
      {
        path: '/admin',
        meta: { permission: 'read' },
        children: [
          { path: 'orders/:id', component: 'demo/views/detail', meta: { hidden: true, componentPath: 'modules/' } },
        ],
      },
    ],
  })
  const node = await mount(runtime, '/admin/orders/42')
  assert.match(node.textContent, /detail:42:\/admin\/orders\/42/)
  await act(async () => runtime.session.setState({ permissions: [] }))
  assert.doesNotMatch(node.textContent, /detail:42/)
  assert.match(node.textContent, /denied|权限|无权/i)
})

test('Static collisions retain menu restrictions before the code page is rendered', async () => {
  let loaded = 0
  const runtime = await app({
    staticRoutes: [
      {
        name: 'protected',
        path: '/protected',
        component: async () => {
          loaded++
          return { default: () => h('p', null, 'secret-page') }
        },
      },
    ],
    menus: [{ path: '/protected', meta: { permission: 'admin' } }],
  })
  const node = await mount(runtime, '/protected')
  assert.equal(loaded, 0)
  assert.match(node.textContent, /denied|权限|无权/i)
})

test('Directory redirects preserve URL query values and parameters; cycles stop', async () => {
  const runtime = await app({
    files: {
      '../modules/demo/views/detail.tsx': async () => ({ default: () => h('p', null, useParams().id || 'list') }),
    },
    menus: [
      { path: '/orders/:id', redirect: 'detail?returnTo=https://example.test/a#part' },
      { path: '/orders/:id/detail', component: 'demo/views/detail' },
      { path: '/cycle-a', redirect: '/cycle-b' },
      { path: '/cycle-b', redirect: '/cycle-a' },
    ],
  })
  const node = await mount(runtime, '/orders/42')
  assert.match(node.textContent, /42/)
  assert.equal(window.location.pathname, '/admin/orders/42/detail')
  assert.equal(new URLSearchParams(window.location.search).get('returnTo'), 'https://example.test/a')
  assert.equal(window.location.hash, '#part')
  await go('/cycle-a')
  assert.match(node.textContent, /页面暂时无法加载/)
})

test('Standalone plugin routes retain authentication and login return URLs', async () => {
  const runtime = await app({
    plugins: [
      plugin([
        {
          name: 'standalone',
          path: '/standalone',
          component: page('standalone-page'),
          meta: { useDefaultLayout: false },
        },
      ]),
    ],
  })
  runtime.session.setState({ token: null })
  const node = await mount(runtime, '/standalone?tab=one#part')
  assert.match(node.textContent, /login-page/)
  assert.equal(new URLSearchParams(window.location.search).get('redirect'), '/standalone?tab=one#part')
  await act(async () => runtime.session.setState({ token: 'synthetic' }))
  assert.match(node.textContent, /standalone-page/)
  assert.equal(node.querySelector('[data-layout]'), null)
})

test('Transient initialization failure offers retry without a login loop', async () => {
  const runtime = await app()
  let attempts = 0
  runtime.session.setState({
    initialized: false,
    error: '菜单加载失败，请重试',
    hydrate: async () => {
      attempts++
      runtime.session.setState({ initialized: true, error: null })
      return true
    },
  })
  const node = await mount(runtime, '/dashboard')
  assert.equal(attempts, 0)
  assert.match(node.textContent, /加载失败/)
  await act(async () => node.querySelector('button').click())
  assert.equal(attempts, 1)
  assert.match(node.textContent, /default-page/)
})

test('Explicit plugin source does not render a same-named module and disabled plugins remain unavailable', async () => {
  const runtime = await app({
    files: {
      '../modules/example/report/views/index.tsx': page('wrong-module'),
      '../plugins/example/report/views/index.tsx': page('disabled-plugin'),
    },
    plugins: [plugin([], false)],
    menus: [{ path: '/report', component: 'example/report/views/index', meta: { componentPath: 'plugins/' } }],
  })
  const node = await mount(runtime, '/report')
  assert.match(node.textContent, /页面暂时无法加载/)
  assert.doesNotMatch(node.textContent, /wrong-module|disabled-plugin/)
})

test('Cached pages retain state between tabs and reset when the tab or session is removed', async () => {
  const runtime = await app({
    staticRoutes: [
      {
        name: 'counter',
        path: '/counter',
        meta: { cache: true },
        component: async () => ({
          default: function Counter() {
            const [n, setN] = React.useState(0)
            return h('button', { onClick: () => setN(n + 1) }, `count:${n}`)
          },
        }),
      },
    ],
  })
  runtime.tabs.getState().add({ name: 'counter', path: '/counter', fullPath: '/counter', title: 'Counter' })
  const node = await mount(runtime, '/counter')
  await act(async () => [...node.querySelectorAll('button')].find(b => b.textContent === 'count:0').click())
  await go('/dashboard')
  await go('/counter')
  assert.match(node.textContent, /count:1/)
  await go('/dashboard')
  await act(async () => runtime.tabs.getState().close('/counter'))
  await go('/counter')
  assert.match(node.textContent, /count:0/)
  await act(async () => runtime.session.setState(state => ({ sessionVersion: state.sessionVersion + 1 })))
  assert.match(node.textContent, /count:0/)
})

test('Directory defaults use merged route permissions and skip missing views', async () => {
  const runtime = await app({
    files: { '../modules/demo/views/index.tsx': page('directory-target') },
    menus: [
      {
        path: '/directory',
        children: [
          { path: 'missing', component: 'demo/views/missing' },
          { path: 'admin' },
          { path: 'list', component: 'demo/views/index', meta: { componentPath: 'modules/' } },
        ],
      },
    ],
    plugins: [
      plugin([
        { name: 'admin', path: '/directory/admin', component: page('restricted-static'), meta: { role: 'admin' } },
      ]),
    ],
  })
  const node = await mount(runtime, '/directory')
  assert.match(node.textContent, /directory-target/)
  assert.equal(window.location.pathname, '/admin/directory/list')
})

test('Navigation hooks receive transitions from the injected plugin host', async () => {
  const events = []
  const declaration = plugin([{ name: 'help', path: '/help', component: page('help') }])
  declaration.hooks = { routerRedirect: value => events.push(value) }
  const runtime = await app({ plugins: [declaration] })
  await mount(runtime, '/dashboard')
  await go('/help?tab=one#section')
  assert.deepEqual(events, [{ oldRoute: '/dashboard', newRoute: '/help?tab=one#section' }])
})
