import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = await import(require.resolve('esbuild'))
const { Window } = await import(require.resolve('happy-dom'))
const window = new Window({ url: 'http://localhost/' })
for (const key of [
  'window',
  'document',
  'navigator',
  'localStorage',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'ShadowRoot',
  'DocumentFragment',
  'HTMLInputElement',
  'HTMLButtonElement',
]) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')
const { MemoryRouter, HashRouter, BrowserRouter, Routes, Route } = require('react-router-dom')
const result = await build({
  stdin: {
    contents: `
      export { createAppRuntime } from './src/app/runtime/create-runtime'
      export { createBuiltinLayouts } from './src/layouts/builtins'
      export { AppProviders } from './src/provider/app-provider'
      export { AppRouter } from './src/router'
      export { default as AppLayout } from './src/layouts'
      export { default as shellLocale } from './src/layouts/locales/ui'
      export { registerLocaleBundles } from './src/services/i18n/discovery'
      export { menuToRoutes } from './src/router/dynamic-routes'
    `,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: {
    'import.meta.env': '{"VITE_APP_STORAGE_PREFIX":"dom_","VITE_APP_TITLE":"MineAdmin"}',
    'import.meta.hot': 'undefined',
    'import.meta.url': '""',
  },
  plugins: [
    {
      name: 'icons-assets',
      setup(builder) {
        builder.onResolve({ filter: /^@\/utils\/icons$/ }, () => ({ path: 'icons', namespace: 'icons' }))
        builder.onLoad({ filter: /.*/, namespace: 'icons' }, () => ({
          contents: 'export const customIconUrls = {}; export const normalizeIconName = value => value || "";',
        }))
      },
    },
  ],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
const roots = []
let currentRuntime
const disposers = []
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  disposers
    .splice(0)
    .reverse()
    .forEach(dispose => dispose())
  currentRuntime?.dispose()
  currentRuntime = undefined
  document.body.replaceChildren()
  window.happyDOM.setWindowSize({ width: 1024, height: 768 })
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})
async function mount(element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(React.createElement(core.AppProviders, { runtime: currentRuntime }, element)))
  return container
}

function makeRuntime({ layout = 'classic', locale = 'zh_CN' } = {}) {
  const memory = new Map()
  const storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  }
  const runtime = core.createAppRuntime({ storage, prefix: 'shell-review_', layouts: core.createBuiltinLayouts() })
  currentRuntime = runtime
  runtime.settings.getState().setSettings({ app: { ...runtime.settings.getState().settings.app, layout } })
  runtime.session.setState({
    token: 'synthetic-token',
    initialized: true,
    userInfo: { id: 1, username: 'synthetic' },
    roles: ['SuperAdmin'],
    permissions: ['*'],
  })
  disposers.push(core.registerLocaleBundles(runtime.locales, { shell: { default: core.shellLocale } }))
  disposers.push(
    runtime.locales.register({
      id: 'review:en',
      locale: 'en_US',
      namespace: 'app',
      messages: { 'review.reports': 'Reports' },
    }),
  )
  disposers.push(
    runtime.locales.register({
      id: 'review:tw',
      locale: 'zh_TW',
      namespace: 'app',
      messages: { 'review.reports': '報表' },
    }),
  )
  runtime.i18n.store.getState().setLocale(locale)
  const descriptor = {
    name: 'review:reports',
    path: '/reports',
    meta: { type: 'M', title: '报表', i18n: 'review.reports' },
  }
  const result = core.menuToRoutes(
    [descriptor],
    [{ name: 'review:reports', path: '/reports', element: React.createElement('p', null, 'Synthetic report content') }],
  )
  runtime.navigation.setState({ ...result, initialized: true })
  return runtime
}

function layoutPage() {
  return React.createElement(
    MemoryRouter,
    { initialEntries: ['/reports'] },
    React.createElement(
      Routes,
      null,
      React.createElement(
        Route,
        { element: React.createElement(core.AppLayout) },
        React.createElement(Route, {
          path: '*',
          element: React.createElement('p', { id: 'synthetic-page' }, 'Synthetic report content'),
        }),
      ),
    ),
  )
}

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 30))
  })
}

for (const layout of ['classic', 'columns'])
  test(`${layout} translates shell controls and menus across three locales without remounting content`, async () => {
    const runtime = makeRuntime({ layout, locale: 'en_US' })
    const container = await mount(layoutPage())
    await settle()
    const page = container.querySelector('#synthetic-page')
    for (const [locale, notify, search, report] of [
      ['en_US', 'Notifications', 'Search menus', 'Reports'],
      ['zh_TW', '通知', '搜尋選單', '報表'],
      ['zh_CN', '通知', '搜索菜单', '报表'],
    ]) {
      await act(async () => runtime.i18n.store.getState().setLocale(locale))
      assert.equal(container.querySelector('[data-slot="notifications-trigger"]').getAttribute('aria-label'), notify)
      assert.ok(container.querySelector(`button[aria-label="${search}"]`), container.textContent)
      assert.match(container.querySelector('header').textContent, new RegExp(report))
      const menu = container.querySelector('a[data-sidebar="menu-button"][href="/reports"]')
      assert.ok(menu)
      assert.equal(layout === 'columns' ? menu.getAttribute('aria-label') : menu.textContent.trim(), report)
      assert.equal(container.querySelector('#synthetic-page'), page)
    }
  })
test('missing menu translation falls back to its readable title', async () => {
  const runtime = makeRuntime({ locale: 'en_US' })
  const result = core.menuToRoutes(
    [
      {
        name: 'fallback',
        path: '/reports',
        meta: { type: 'M', title: 'Readable fallback', i18n: 'missing.synthetic' },
      },
    ],
    [{ name: 'fallback', path: '/reports', element: React.createElement('p', null, 'content') }],
  )
  runtime.navigation.setState({ ...result, initialized: true })
  const container = await mount(layoutPage())
  assert.equal(
    container.querySelector('a[data-sidebar="menu-button"][href="/reports"]').textContent.trim(),
    'Readable fallback',
  )
})
test('classic menu shortcut opens once and cleans up when switching layout', async () => {
  const runtime = makeRuntime()
  const container = await mount(layoutPage())
  await settle()
  const key = async options =>
    act(async () =>
      window.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true, ...options }),
      ),
    )
  await key({ metaKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await key({ metaKey: true, repeat: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await key({ ctrlKey: true })
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await act(async () => container.querySelector('#search').click())
  assert.ok(document.querySelector('[role="dialog"]'))
  await act(async () =>
    runtime.settings
      .getState()
      .setSettings({ app: { ...runtime.settings.getState().settings.app, layout: 'columns' } }),
  )
  await key({ ctrlKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  await act(async () =>
    runtime.settings
      .getState()
      .setSettings({ app: { ...runtime.settings.getState().settings.app, layout: 'classic' } }),
  )
  await key({ metaKey: true })
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
})
for (const target of ['/uc/account', '/reports'])
  test(`classic mobile drawer closes after choosing ${target}`, async () => {
    window.happyDOM.setWindowSize({ width: 390, height: 844 })
    makeRuntime()
    const container = await mount(layoutPage())
    await settle()
    await act(async () => container.querySelector('button[aria-label="打开导航菜单"]').click())
    const dialog = document.querySelector('[role="dialog"]')
    assert.ok(dialog)
    const link = dialog.querySelector(`a[href="${target}"]`)
    assert.ok(link)
    await act(async () =>
      link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 0 })),
    )
    await settle()
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })
for (const [mode, Router] of [
  ['hash', HashRouter],
  ['history', BrowserRouter],
]) {
  for (const layout of ['classic', 'columns'])
    test(`${layout} skip-content focuses main and preserves ${mode} URL`, async () => {
      makeRuntime({ layout })
      window.history.replaceState(null, '', mode === 'hash' ? '/#/reports' : '/reports')
      const container = await mount(
        React.createElement(
          Router,
          null,
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { element: React.createElement(core.AppLayout) },
              React.createElement(Route, {
                path: '*',
                element: React.createElement('p', null, 'Synthetic report content'),
              }),
            ),
          ),
        ),
      )
      await settle()
      const previous = window.location.href
      const link = container.querySelector('a[href="#main-content"]')
      await act(async () => link.click())
      await settle()
      assert.equal(window.location.href, previous)
      assert.equal(document.activeElement, container.querySelector('main#main-content'))
      assert.match(container.textContent, /Synthetic report content/)
    })
}
