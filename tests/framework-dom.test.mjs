import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
const require = createRequire(import.meta.url)
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
const { createStore } = require('zustand/vanilla')
const { MemoryRouter, Routes, Route, Outlet, useNavigate, useLocation } = require('react-router-dom')
const result = await build({
  stdin: {
    contents: `
  export { Access } from './src/provider/access'
  export { AppRouter } from './src/router'
  export { PermissionGate } from './src/hooks/framework/use-permission'
  export { useSession } from './src/hooks/framework/use-session'
  export { createRouteRegistry } from './src/router/registry'
  export { createComponentManifest } from './src/router/manifest'
  export { default as DynamicMenuPage } from './src/modules/base/dynamic-menu/views'
  export { useI18nStore, useTranslate } from './src/provider/i18n'
  export { PageViewport } from './src/router/page-viewport'
  export { RuntimeContext } from './src/provider/runtime/context'
  export { useTabStore } from './src/store/modules/useTabStore'
  export { useSettingStore } from './src/provider/settings'
  export { default as AppLayout } from './src/layouts'
  export { shellSlots } from './src/layouts/slots'
  export * as sidebar from './src/components/reui/primitives/sidebar'
  export * as chart from './src/components/reui/primitives/chart'
  export { ToastContext } from './src/components/reui/toast-context'
  export { ToastProvider } from './src/components/reui/toast'
  export { useToast } from './src/components/reui/use-toast'
  export { toast } from './src/components/reui/toast-api'
`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: {
    'import.meta.env': '{"VITE_APP_STORAGE_PREFIX":"dom_","VITE_APP_TITLE":"MineAdmin"}',
    'import.meta.hot': 'undefined',
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
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
    core.toast.dismiss()
  })
  document.body.replaceChildren()
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
  await act(async () => root.render(element))
  return container
}

test('Public Sidebar and Toast providers share state with consumers', async () => {
  let observed
  function Consumer() {
    observed = core.useToast()
    return React.createElement('span', null, core.sidebar.useSidebar().state)
  }
  const container = await mount(
    React.createElement(
      core.ToastProvider,
      { theme: 'light' },
      React.createElement(core.sidebar.SidebarProvider, null, React.createElement(Consumer)),
    ),
  )
  assert.match(container.textContent, /expanded/)
  assert.equal(observed.toast, core.toast)
})

function runtime() {
  const routes = core.createRouteRegistry()
  routes.setMenus([])
  return {
    routes,
    components: core.createComponentManifest(),
    session: createStore(() => ({
      token: 'synthetic',
      sessionVersion: 1,
      initialized: true,
      loading: false,
      error: null,
      hydrate: async () => true,
      userInfo: { username: 'alice' },
      roles: ['staff'],
      permissions: ['*'],
    })),
  }
}
function setTabs(paths) {
  core.useTabStore.setState({
    initialized: true,
    tabs: paths.map(path => ({ name: path, path, fullPath: path, title: path })),
  })
}

test('Page cache freezes router locations, preserves local state, suspends effects and releases closed tabs', async () => {
  let navigate
  const effects = { starts: 0, stops: 0 }
  function Controls() {
    navigate = useNavigate()
    return null
  }
  function Page() {
    const location = useLocation()
    const [count, setCount] = React.useState(0)
    React.useEffect(() => {
      effects.starts++
      return () => {
        effects.stops++
      }
    }, [])
    return React.createElement(
      'section',
      { 'data-page': location.pathname },
      React.createElement('button', { onClick: () => setCount(value => value + 1) }, String(count)),
    )
  }
  const routes = ['/first', '/second'].map(path => ({
    name: path,
    path: path.slice(1),
    meta: { cache: true },
    element: React.createElement(Page),
  }))
  setTabs(['/first', '/second'])
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: runtime() },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/first'] },
        React.createElement(Controls),
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '*', element: React.createElement(core.PageViewport, { routes }) }),
        ),
      ),
    ),
  )
  const first = container.querySelector('[data-page="/first"] button')
  await act(async () => first.click())
  assert.equal(first.textContent, '1')
  await act(async () => navigate('/second'))
  assert.equal(container.querySelector('[data-page="/first"] button'), first)
  assert.ok(effects.stops >= 1)
  await act(async () => navigate('/first'))
  assert.equal(container.querySelector('[data-page="/first"] button').textContent, '1')
  await act(async () => navigate('/second'))
  await act(async () => core.useTabStore.getState().close('/first'))
  assert.equal(container.querySelector('[data-page="/first"]'), null)
})

test('Layout switching keeps the page mounted and slot disposal removes extensions', async () => {
  setTabs(['/dashboard'])
  function Page() {
    return React.createElement('input', { 'aria-label': '保留的页面输入', defaultValue: 'value' })
  }
  let remove
  await act(async () => {
    remove = core.shellSlots.register({
      id: 'test.overlay',
      slot: 'shell.overlays',
      component: () => React.createElement('span', null, 'extension-content'),
    })
  })
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: runtime() },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { path: '/', element: React.createElement(core.AppLayout) },
            React.createElement(Route, { path: 'dashboard', element: React.createElement(Page) }),
          ),
        ),
      ),
    ),
  )
  const input = container.querySelector('input[aria-label="保留的页面输入"]')
  for (const layout of ['columns', 'mixed', 'classic', 'unknown']) {
    await act(async () => {
      const store = core.useSettingStore.getState()
      store.setSettings({ app: { ...store.settings.app, layout } })
    })
    assert.equal(container.querySelector('input[aria-label="保留的页面输入"]'), input)
    assert.equal(container.querySelector('[data-layout]').dataset.layout, layout === 'unknown' ? 'classic' : layout)
  }
  assert.match(container.textContent, /extension-content/)
  await act(async () => remove())
  assert.doesNotMatch(container.textContent, /extension-content/)
})

test('Router, permissions and Shell consume the same injected session and route registry', async () => {
  const app = runtime()
  app.session.setState({ permissions: ['reports:read'], userInfo: { username: 'injected-account' } })
  window.history.replaceState(null, '', '/#/reports')
  function Page() {
    const username = core.useSession(state => state.userInfo?.username)
    return React.createElement(core.PermissionGate, { permission: 'reports:read' }, `report:${username}`)
  }
  app.routes.configure({
    layout: {
      name: 'root',
      path: '/',
      element: React.createElement(core.AppLayout),
      children: [
        { name: 'reports', path: 'reports', element: React.createElement(Page), meta: { permission: 'reports:read' } },
      ],
    },
    guests: [{ name: 'login', path: '/login', element: React.createElement('p', null, 'injected-login') }],
    publics: [],
    renderMenu: () => null,
  })
  app.routes.setMenus([
    { name: 'reports-menu', path: '/REPORTS', meta: { title: 'Injected Reports', permission: 'reports:read' } },
  ])
  setTabs(['/reports'])
  const container = await mount(
    React.createElement(core.RuntimeContext.Provider, { value: app }, React.createElement(core.AppRouter)),
  )
  assert.match(container.textContent, /report:injected-account/)
  assert.match(container.textContent, /Injected Reports/)
  assert.doesNotMatch(container.textContent, /injected-login/)
  await act(async () => app.session.setState({ permissions: [] }))
  assert.doesNotMatch(container.textContent, /report:injected-account/)
  await act(async () => app.session.setState({ permissions: ['reports:read'] }))
  assert.match(container.textContent, /report:injected-account/)
  await act(async () => app.session.setState({ token: null, userInfo: null, sessionVersion: 2 }))
  assert.match(container.textContent, /injected-login/)
  assert.equal(app.routes.getSnapshot().initialized, false)
})

test('Dynamic pages resolve components and menus from the injected runtime', async () => {
  const app = runtime()
  app.components.register([
    {
      id: 'injected-page',
      load: async () => ({ default: () => React.createElement('p', null, 'custom-manifest-page') }),
    },
  ])
  app.routes.setMenus([{ name: 'custom', path: '/custom', component: 'injected-page' }])
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: app },
      React.createElement(MemoryRouter, { initialEntries: ['/custom'] }, React.createElement(core.DynamicMenuPage)),
    ),
  )
  await act(async () => {
    await Promise.resolve()
  })
  assert.match(container.textContent, /custom-manifest-page/)
})

test('Router invokes the application navigation listener without a global plugin dependency', async () => {
  const app = runtime()
  let navigate
  const events = []
  function Page() {
    navigate = useNavigate()
    return React.createElement(Outlet)
  }
  app.routes.configure({
    layout: {
      name: 'root',
      path: '/',
      element: React.createElement(Page),
      children: [
        { name: 'first', path: 'first', element: React.createElement('p', null, 'first') },
        { name: 'second', path: 'second', element: React.createElement('p', null, 'second') },
      ],
    },
    guests: [],
    publics: [],
    renderMenu: () => null,
  })
  window.history.replaceState(null, '', '/#/first')
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: app },
      React.createElement(core.AppRouter, {
        onNavigate: (location, previous) => events.push([previous.pathname, location.pathname]),
      }),
    ),
  )
  await act(async () => navigate('/second'))
  assert.match(container.textContent, /second/)
  assert.deepEqual(events, [['/first', '/second']])
})

test('Page cache evicts its least recently used page, revoked permissions and previous account instances', async () => {
  let navigate
  function Controls() {
    navigate = useNavigate()
    return null
  }
  function Page() {
    return React.createElement('input', { 'data-cache-page': useLocation().pathname })
  }
  const paths = Array.from({ length: 9 }, (_, i) => `/cache-${i}`)
  const routes = paths.map(path => ({
    name: path,
    path: path.slice(1),
    meta: { cache: true, permission: 'read' },
    element: React.createElement(Page),
  }))
  const app = runtime()
  setTabs(paths)
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: app },
      React.createElement(
        MemoryRouter,
        { initialEntries: [paths[0]] },
        React.createElement(Controls),
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '*', element: React.createElement(core.PageViewport, { routes }) }),
        ),
      ),
    ),
  )
  for (const path of paths.slice(1)) await act(async () => navigate(path))
  assert.equal(container.querySelectorAll('[data-cache-page]').length, 8)
  assert.equal(container.querySelector('[data-cache-page="/cache-0"]'), null)
  await act(async () => app.session.setState({ permissions: [] }))
  assert.equal(container.querySelectorAll('[data-cache-page]').length, 1)
  const previous = container.querySelector('input')
  previous.value = 'previous account data'
  await act(async () => app.session.setState({ sessionVersion: 2, permissions: ['*'] }))
  assert.notEqual(container.querySelector('input'), previous)
  assert.equal(container.querySelector('input').value, '')
})

test('Access reacts to permission changes and translations preserve the mounted form', async () => {
  const app = runtime()
  function Page() {
    const t = core.useTranslate()
    return React.createElement(
      'div',
      null,
      React.createElement('input', { defaultValue: 'unsaved' }),
      React.createElement('span', { 'data-label': true }, t('common.save')),
      React.createElement(
        core.Access,
        { policy: { permission: 'write', role: 'staff', user: 'alice' }, fallback: 'denied' },
        'allowed',
      ),
    )
  }
  const container = await mount(
    React.createElement(core.RuntimeContext.Provider, { value: app }, React.createElement(Page)),
  )
  const input = container.querySelector('input')
  assert.match(container.textContent, /allowed/)
  await act(async () => app.session.setState({ permissions: ['read'] }))
  assert.match(container.textContent, /denied/)
  await act(async () => core.useI18nStore.getState().setLocale('en_US'))
  assert.equal(container.querySelector('[data-label]').textContent, 'Save')
  assert.equal(container.querySelector('input'), input)
  assert.equal(input.value, 'unsaved')
  await act(async () => core.useI18nStore.getState().setLocale('zh_CN'))
})
