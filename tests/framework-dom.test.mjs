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
const {
  MemoryRouter,
  createMemoryRouter,
  RouterProvider,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useLocation,
} = require('react-router-dom')
const result = await build({
  stdin: {
    contents: `
  export { Access } from './src/provider/access'
  export { AppRouter } from './src/router'
  export { PermissionGate } from './src/hooks/framework/use-permission'
  export { useSession } from './src/hooks/framework/use-session'
  export { useShell } from './src/hooks/shell/use-shell'
  export { createRouteRegistry } from './src/router/registry'
  export { createComponentManifest } from './src/router/manifest'
  export { default as DynamicMenuPage } from './src/modules/base/dynamic-menu/views'
  export { useI18nStore, useTranslate } from './src/provider/i18n'
  export { PageViewport } from './src/router/page-viewport'
  export { RuntimeContext } from './src/provider/runtime/context'
  export { useTabStore } from './src/store/modules/useTabStore'
  export { useSettingStore } from './src/provider/settings'
  export { sessionManager } from './src/provider/session'
  export { queryClient } from './src/provider/query/client'
  export { default as http } from './src/provider/http'
  export { default as AccountSettingsPage } from './src/modules/base/account-settings/views'
  export { default as AppLayout } from './src/layouts'
  export { layoutRegistry } from './src/layouts/builtins'
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

function accountPreferencesFixture(t) {
  const originalAdapter = core.http.defaults.adapter
  const originalSession = core.sessionManager.getState()
  const originalSettings = core.useSettingStore.getState().settings
  const profile = {
    id: 71,
    username: 'preferences-test',
    backend_setting: {
      app: { colorMode: 'light', primaryColor: '#2563EB', layout: 'classic', customOption: 'keep' },
      account: { multiDeviceLogin: false, customAccountOption: 'keep' },
      customSection: { enabled: true },
    },
  }
  const requests = []
  const api = { failSave: false, profile, requests, beforeSave: undefined }
  core.http.defaults.adapter = async config => {
    requests.push(config.url)
    let data
    if (config.url === '/admin/permission/update') {
      await api.beforeSave?.()
      if (api.failSave) data = { code: 422, message: '保存失败' }
      else {
        profile.backend_setting = JSON.parse(config.data).backend_setting
        data = { code: 200, data: null }
      }
    } else if (config.url === '/admin/passport/getInfo') {
      data = { code: 200, data: structuredClone(profile) }
    } else if (['/admin/permission/menus', '/admin/permission/roles'].includes(config.url)) {
      data = { code: 200, data: [] }
    } else throw new Error(`Unexpected test request: ${config.url}`)
    return { data, config, status: 200, statusText: 'OK', headers: {} }
  }
  core.sessionManager.setState({
    token: 'synthetic',
    sessionVersion: originalSession.sessionVersion + 1,
    userInfo: structuredClone(profile),
    initialized: true,
    loading: false,
  })
  core.useSettingStore.getState().setSettings({ app: { ...originalSettings.app, ...profile.backend_setting.app } })
  t.after(async () => {
    await act(async () => {
      for (const root of roots.splice(0)) root.unmount()
      core.sessionManager.setState(originalSession, true)
      core.useSettingStore.getState().setSettings(originalSettings)
      core.useSettingStore.getState().setColorMode(originalSettings.app.colorMode)
    })
    core.queryClient.clear()
    core.http.defaults.adapter = originalAdapter
  })
  return api
}

async function mountAccountPreferences(t) {
  const router = createMemoryRouter(
    [
      { path: '/preferences', element: React.createElement(core.AccountSettingsPage) },
      { path: '/other', element: React.createElement('p', null, 'other-page') },
    ],
    { initialEntries: ['/other', '/preferences'], initialIndex: 1 },
  )
  t.after(() => router.dispose())
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: { ...runtime(), session: core.sessionManager } },
      React.createElement(RouterProvider, { router }),
    ),
  )
  return { container, router }
}

function preferencesButton(label) {
  return [...document.querySelectorAll('button')].find(item => item.textContent === label)
}

function unloadIsBlocked() {
  return !window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
}

test('Account preferences save appearance and account fields, then restore them from getInfo', async t => {
  const api = accountPreferencesFixture(t)
  const { container } = await mountAccountPreferences(t)
  const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label)
  await act(async () => button('深色').click())
  await act(async () => container.querySelector('[role="radio"][aria-label="玫瑰粉"]').click())
  await act(async () => container.querySelector('[role="radio"][aria-label="分栏导航"]').click())
  await act(async () => container.querySelector('[role="switch"][aria-label="是否多设备登录"]').click())
  await act(async () => button('保存设置').click())
  assert.ok(api.requests.includes('/admin/permission/update'))
  assert.equal(api.profile.backend_setting.app.colorMode, 'dark')
  assert.equal(api.profile.backend_setting.app.primaryColor, '#DB2777')
  assert.equal(api.profile.backend_setting.app.layout, 'columns')
  assert.equal(api.profile.backend_setting.app.customOption, 'keep')
  assert.deepEqual(api.profile.backend_setting.account, { multiDeviceLogin: true, customAccountOption: 'keep' })
  assert.deepEqual(api.profile.backend_setting.customSection, { enabled: true })
  assert.deepEqual(core.sessionManager.getState().userInfo.backend_setting, api.profile.backend_setting)
  // Simulate stale local settings when a refresh loads the saved server profile.
  await act(async () => {
    const store = core.useSettingStore.getState()
    store.setSettings({
      app: { ...store.settings.app, colorMode: 'light', primaryColor: '#2563EB', layout: 'classic' },
    })
    assert.equal(await core.sessionManager.getState().hydrate(), true)
  })
  assert.ok(api.requests.includes('/admin/passport/getInfo'))
  const restored = core.useSettingStore.getState().settings.app
  assert.equal(restored.colorMode, 'dark')
  assert.equal(restored.primaryColor, '#DB2777')
  assert.equal(restored.layout, 'columns')
  assert.equal(document.documentElement.style.getPropertyValue('--primary'), '#DB2777')
  assert.equal(JSON.parse(localStorage.getItem('dom_settings')).value.app.primaryColor, '#DB2777')
})

test('Failed account preference saves preserve the saved profile and allow retry', async t => {
  const api = accountPreferencesFixture(t)
  const savedProfile = structuredClone(api.profile)
  const { container } = await mountAccountPreferences(t)
  const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label)
  await act(async () => button('深色').click())
  api.failSave = true
  await act(async () => button('保存设置').click())
  assert.deepEqual(core.sessionManager.getState().userInfo, savedProfile)
  assert.deepEqual(api.profile, savedProfile)
  assert.equal(button('保存设置').disabled, false)
  api.failSave = false
  await act(async () => button('保存设置').click())
  assert.equal(api.profile.backend_setting.app.colorMode, 'dark')
})

test('Unsaved preferences warn on unload and allow continuing or discarding before navigation', async t => {
  const api = accountPreferencesFixture(t)
  const savedProfile = structuredClone(api.profile)
  const { container, router } = await mountAccountPreferences(t)
  assert.equal(unloadIsBlocked(), false)
  await act(async () => preferencesButton('深色').click())
  await act(async () => container.querySelector('[role="radio"][aria-label="玫瑰粉"]').click())
  await act(async () => container.querySelector('[role="radio"][aria-label="分栏导航"]').click())
  await act(async () => container.querySelector('[role="switch"][aria-label="是否多设备登录"]').click())
  assert.equal(unloadIsBlocked(), true)
  assert.deepEqual(api.profile, savedProfile)
  assert.equal(core.useSettingStore.getState().settings.app.layout, 'classic')
  await act(async () => router.navigate('/other'))
  assert.equal(router.state.location.pathname, '/preferences')
  assert.ok(preferencesButton('保存并离开'))
  await act(async () => preferencesButton('继续编辑').click())
  assert.equal(router.state.location.pathname, '/preferences')
  assert.equal(core.useSettingStore.getState().settings.app.colorMode, 'dark')
  assert.equal(unloadIsBlocked(), true)
  // Back navigation must be guarded just like a menu or tab navigation.
  await act(async () => router.navigate(-1))
  await act(async () => preferencesButton('放弃修改').click())
  assert.equal(router.state.location.pathname, '/other')
  assert.match(container.textContent, /other-page/)
  const app = core.useSettingStore.getState().settings.app
  assert.equal(app.colorMode, 'light')
  assert.equal(app.primaryColor, '#2563EB')
  assert.equal(app.layout, 'classic')
  assert.equal(document.documentElement.classList.contains('dark'), false)
  assert.equal(JSON.parse(localStorage.getItem('dom_settings')).value.app.primaryColor, '#2563EB')
  assert.deepEqual(api.profile, savedProfile)
  assert.equal(api.requests.length, 0)
  assert.equal(unloadIsBlocked(), false)
})

test('Save and leave waits for success and keeps the draft after failure', async t => {
  const api = accountPreferencesFixture(t)
  const { router } = await mountAccountPreferences(t)
  await act(async () => preferencesButton('深色').click())
  await act(async () => router.navigate('/other'))
  api.failSave = true
  await act(async () => preferencesButton('保存并离开').click())
  assert.equal(router.state.location.pathname, '/preferences')
  assert.equal(unloadIsBlocked(), true)
  assert.equal(api.profile.backend_setting.app.colorMode, 'light')
  assert.equal(core.useSettingStore.getState().settings.app.colorMode, 'dark')
  let finishSave
  api.failSave = false
  api.beforeSave = () =>
    new Promise(resolve => {
      finishSave = resolve
    })
  await act(async () => preferencesButton('保存并离开').click())
  assert.equal(router.state.location.pathname, '/preferences')
  assert.equal(preferencesButton('继续编辑').disabled, true)
  assert.equal(preferencesButton('放弃修改').disabled, true)
  assert.equal(unloadIsBlocked(), true)
  await act(async () => finishSave())
  assert.equal(router.state.location.pathname, '/other')
  assert.equal(api.profile.backend_setting.app.colorMode, 'dark')
  assert.equal(unloadIsBlocked(), false)
})

test('Reverting, cancelling and saving preferences clear navigation and unload warnings', async t => {
  accountPreferencesFixture(t)
  const { container, router } = await mountAccountPreferences(t)
  await act(async () => preferencesButton('深色').click())
  await act(async () => preferencesButton('浅色').click())
  assert.equal(unloadIsBlocked(), false)
  await act(async () => container.querySelector('[role="radio"][aria-label="玫瑰粉"]').click())
  assert.equal(unloadIsBlocked(), true)
  await act(async () => preferencesButton('取消').click())
  assert.equal(unloadIsBlocked(), false)
  assert.equal(core.useSettingStore.getState().settings.app.primaryColor, '#2563EB')
  await act(async () => preferencesButton('深色').click())
  await act(async () => preferencesButton('保存设置').click())
  assert.equal(unloadIsBlocked(), false)
  await act(async () => router.navigate('/other'))
  assert.equal(router.state.location.pathname, '/other')
})

test('Layout drafts survive in the application shell and save before leaving', async t => {
  const api = accountPreferencesFixture(t)
  const app = { ...runtime(), session: core.sessionManager }
  let navigate
  function Preferences() {
    navigate = useNavigate()
    return React.createElement(core.AccountSettingsPage)
  }
  app.routes.configure({
    layout: {
      name: 'root',
      path: '/',
      element: React.createElement(core.AppLayout),
      children: [
        { name: 'preferences', path: 'preferences', element: React.createElement(Preferences) },
        { name: 'other', path: 'other', element: React.createElement('p', null, 'other-page') },
      ],
    },
    guests: [],
    publics: [],
    renderMenu: () => null,
  })
  app.routes.setMenus([])
  window.history.replaceState(null, '', '/#/preferences')
  const container = await mount(
    React.createElement(core.RuntimeContext.Provider, { value: app }, React.createElement(core.AppRouter)),
  )
  const layout = container.querySelector('[role="radio"][aria-label="分栏导航"]')
  await act(async () => layout.click())
  assert.equal(layout.getAttribute('aria-checked'), 'true')
  assert.equal(core.useSettingStore.getState().settings.app.layout, 'classic')
  assert.equal(unloadIsBlocked(), true)
  await act(async () => navigate('/other'))
  assert.equal(window.location.hash, '#/preferences')
  await act(async () => preferencesButton('保存并离开').click())
  assert.equal(window.location.hash, '#/other')
  assert.match(container.textContent, /other-page/)
  assert.equal(api.profile.backend_setting.app.layout, 'columns')
  assert.equal(core.useSettingStore.getState().settings.app.layout, 'columns')
  assert.equal(unloadIsBlocked(), false)
})

test('Legacy profiles without a server primary color retain their cached color', async t => {
  const api = accountPreferencesFixture(t)
  delete api.profile.backend_setting.app.primaryColor
  core.useSettingStore.getState().setPrimaryColor('#7C3AED')
  assert.equal(await core.sessionManager.getState().hydrate(), true)
  assert.equal(core.useSettingStore.getState().settings.app.primaryColor, '#7C3AED')
})

for (const layout of ['classic', 'columns']) {
  test(`${layout} profile menu shares account actions, theme and color controls`, async t => {
    const originalSettings = core.useSettingStore.getState().settings
    const app = runtime()
    let shell
    let logoutCalls = 0
    app.session.setState({
      userInfo: { username: 'alice', nickname: 'Alice', email: 'alice@example.test' },
      logout: async () => {
        logoutCalls += 1
      },
    })
    core.useSettingStore.getState().setSettings({
      app: { ...originalSettings.app, layout, colorMode: 'light', primaryColor: '#2563EB' },
    })
    t.after(async () => {
      await act(async () => {
        for (const root of roots.splice(0)) root.unmount()
        core.useSettingStore.getState().setSettings(originalSettings)
        core.useSettingStore.getState().setColorMode(originalSettings.app.colorMode)
      })
    })
    function Page() {
      shell = core.useShell()
      return React.createElement('p', { 'data-profile-location': true }, useLocation().pathname)
    }
    const container = await mount(
      React.createElement(
        core.RuntimeContext.Provider,
        { value: app },
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/dashboard'] },
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { path: '/', element: React.createElement(core.AppLayout) },
              React.createElement(Route, { path: '*', element: React.createElement(Page) }),
            ),
          ),
        ),
      ),
    )
    const trigger = () => container.querySelector('[aria-label="打开 Alice 的个人菜单"]')
    const popup = () => document.querySelector('[data-slot="dropdown-menu-content"]')
    await act(async () => trigger().click())
    assert.match(popup().textContent, /Alice/)
    assert.match(popup().textContent, /alice@example\.test/)
    assert.match(popup().textContent, /个人资料.*账号设置.*通知.*主题.*配色.*退出登录/)
    assert.equal(popup().querySelectorAll('[role="radio"]').length, 10)
    await act(async () => popup().querySelector('[role="radio"][aria-label="深色"]').click())
    assert.equal(core.useSettingStore.getState().settings.app.colorMode, 'dark')
    assert.equal(trigger().getAttribute('aria-expanded'), 'true')
    await act(async () => popup().querySelector('[role="radio"][aria-label="玫瑰粉"]').click())
    assert.equal(core.useSettingStore.getState().settings.app.primaryColor, '#DB2777')
    assert.equal(trigger().getAttribute('aria-expanded'), 'true')
    await act(async () =>
      popup()
        .querySelector('[role="radio"][aria-label="深色"]')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })),
    )
    assert.equal(core.useSettingStore.getState().settings.app.colorMode, 'autoMode')
    const menuItem = text =>
      [...popup().querySelectorAll('[role="menuitem"]')].find(item => item.textContent.startsWith(text))
    await act(async () => menuItem('通知').click())
    assert.equal(shell.notificationsOpen, true)
    await act(async () => trigger().click())
    await act(async () => popup().querySelector('a[href="/settings/account"]').click())
    assert.equal(container.querySelector('[data-profile-location]').textContent, '/settings/account')
    await act(async () => trigger().click())
    await act(async () => menuItem('退出登录').click())
    assert.equal(logoutCalls, 1)
  })
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

test('Unsupported layouts fall back without remounting the page and slot disposal removes extensions', async () => {
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
  const findPageInput = () =>
    [...container.querySelectorAll('input')].find(input => input.getAttribute('aria-label') === '保留的页面输入')
  const input = findPageInput()
  assert.ok(input)
  for (const layout of ['mixed', 'classic', 'unknown']) {
    await act(async () => {
      const store = core.useSettingStore.getState()
      store.setSettings({ app: { ...store.settings.app, layout } })
    })
    assert.equal(findPageInput(), input)
    assert.equal(container.querySelector('[data-layout]').dataset.layout, 'classic')
  }
  assert.match(container.textContent, /extension-content/)
  await act(async () => remove())
  assert.doesNotMatch(container.textContent, /extension-content/)
})

test('Column navigation supports saved Verve settings, preserves the page and filters inaccessible menus', async () => {
  assert.deepEqual(
    core.layoutRegistry.getSnapshot().map(layout => layout.id),
    ['classic', 'columns', 'mixed'],
  )
  assert.deepEqual(
    core.layoutRegistry
      .getSnapshot()
      .filter(layout => layout.enabled !== false)
      .map(layout => layout.id),
    ['classic', 'columns'],
  )
  const settings = core.useSettingStore.getState().settings
  core.useSettingStore.setState({ settings: { ...settings, app: { ...settings.app, layout: 'verve' } } })
  const app = runtime()
  app.session.setState({ permissions: ['reports:read'] })
  app.routes.setMenus([
    {
      name: 'Reports',
      path: '/reports',
      children: [
        { name: 'Summary', path: '/reports/summary' },
        { name: 'History alias', path: '/operations/history' },
      ],
    },
    {
      name: 'Operations',
      path: '/operations',
      children: [
        { name: 'History', path: '/operations/history' },
        { name: 'Hidden entry', path: '/operations/hidden', is_hidden: 1 },
        { name: 'Button entry', path: '/operations/button', type: 'B' },
        { name: 'Denied entry', path: '/operations/denied', meta: { permission: 'admin:write' } },
      ],
    },
  ])
  setTabs(['/dashboard'])
  const container = await mount(
    React.createElement(
      core.RuntimeContext.Provider,
      { value: app },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { path: '/', element: React.createElement(core.AppLayout) },
            React.createElement(Route, {
              path: 'dashboard',
              element: React.createElement('input', { 'aria-label': 'page-state', defaultValue: 'preserved' }),
            }),
            React.createElement(Route, {
              path: 'settings/account',
              element: React.createElement('div', null, 'account-page'),
            }),
            React.createElement(Route, {
              path: 'operations/history',
              element: React.createElement('div', null, 'history-page'),
            }),
          ),
        ),
      ),
    ),
  )
  assert.equal(container.querySelector('[data-layout]')?.getAttribute('data-layout'), 'columns')
  const inset = container.querySelector('[data-slot="sidebar-inset"]')
  assert.equal(inset.querySelector('[data-verve-section]'), null, 'home must not show the first business section')
  const page = container.querySelector('[aria-label="page-state"]')
  let disposeSectionContent
  await act(async () => {
    disposeSectionContent = core.shellSlots.register({
      id: 'test.section-content',
      slot: 'shell.section.content',
      component: ({ pathname, sectionPath, sectionLabel }) =>
        React.createElement('div', { 'data-section-extension': sectionPath, 'data-pathname': pathname }, sectionLabel),
    })
  })
  assert.equal(container.querySelector('[data-section-extension]'), null)
  await act(async () => {
    const store = core.useSettingStore.getState()
    store.setSettings({ app: { ...store.settings.app, layout: 'columns' } })
  })
  assert.equal(container.querySelector('[aria-label="page-state"]'), page)
  await act(async () => container.querySelector('[data-slot="sidebar-menu-button"][aria-label="Operations"]').click())
  const extension = inset.querySelector('[data-slot="shell-section-content"] [data-section-extension]')
  assert.equal(extension?.getAttribute('data-section-extension'), '/operations')
  assert.equal(extension?.getAttribute('data-pathname'), '/dashboard')
  assert.equal(extension?.textContent, 'Operations')
  assert.equal(container.querySelector('[aria-label="page-state"]'), page)
  assert.ok(
    container.querySelector('[data-slot="sidebar-menu-button"][aria-label="Operations"]').hasAttribute('data-active'),
  )
  assert.equal(
    container.querySelector('[data-slot="sidebar-menu-button"][href="/dashboard"]').hasAttribute('data-active'),
    false,
  )
  await act(async () => container.querySelector('[data-slot="sidebar-header"] a').click())
  assert.equal(inset.querySelector('[data-verve-section]'), null, 'home clears a section even when already on home')
  assert.equal(container.querySelector('[data-section-extension]'), null)
  await act(async () => container.querySelector('[data-slot="sidebar-menu-button"][aria-label="Reports"]').click())
  assert.equal(inset.querySelector('[data-section-extension]').getAttribute('data-section-extension'), '/reports')
  await act(async () => container.querySelector('[data-slot="sidebar-menu-button"][aria-label="Operations"]').click())
  const section = inset.querySelector('[data-verve-section]')
  assert.match(section.textContent, /History/)
  assert.doesNotMatch(section.textContent, /Hidden entry|Button entry|Denied entry|个人资料|账号设置/)
  await act(async () => container.querySelector('[aria-label="折叠二级菜单"]').click())
  assert.equal(section.style.width, '0px')
  assert.equal(section.hasAttribute('inert'), true)
  assert.equal(container.querySelector('[aria-label="page-state"]'), page)
  await act(async () => container.querySelector('[aria-label="展开二级菜单"]').click())
  assert.equal(section.style.width, '200px')
  await act(async () =>
    section
      .querySelector('[role="separator"]')
      .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
  )
  assert.equal(section.style.width, '210px')
  await act(async () => section.querySelector('a[href="/operations/history"]').click())
  assert.match(container.querySelector('#main-content').textContent, /history-page/)
  assert.equal(
    inset.querySelector('[data-verve-section] a[href="/operations/history"]').getAttribute('aria-current'),
    'page',
  )
  assert.equal(inset.querySelector('[data-section-extension]').getAttribute('data-pathname'), '/operations/history')
  await act(async () => disposeSectionContent())
  assert.equal(container.querySelector('[data-section-extension]'), null)
  await act(async () => container.querySelector('[aria-label="打开 alice 的个人菜单"]').click())
  const profile = document.querySelector('[role="menu"]')
  assert.match(profile.textContent, /个人资料/)
  assert.match(profile.textContent, /账号设置/)
  assert.match(profile.textContent, /通知/)
  assert.match(profile.textContent, /退出登录/)
  await act(async () => profile.querySelector('[role="radio"][aria-label="深色"]').click())
  assert.equal(core.useSettingStore.getState().settings.app.colorMode, 'dark')
  assert.equal(profile.querySelector('[role="radio"][aria-label="深色"]').getAttribute('aria-checked'), 'true')
  await act(async () => profile.querySelector('a[href="/settings/account"]').click())
  assert.equal(inset.querySelector('[data-verve-section]'), null)
  assert.match(container.querySelector('#main-content').textContent, /account-page/)
  await act(async () =>
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })),
  )
  const searchItems = [...document.querySelectorAll('[data-slot="command-item"]')]
  assert.equal(searchItems.filter(item => item.getAttribute('data-value')?.endsWith('/operations/history')).length, 1)
  assert.doesNotMatch(
    document.querySelector('[data-slot="command-list"]').textContent,
    /Hidden entry|Button entry|Denied entry/,
  )

  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  core.useSettingStore.setState({ settings: { ...settings, app: { ...settings.app, layout: 'classic' } } })
})

for (const layout of ['classic', 'columns']) {
  test(`${layout} notifications render injected content in the shared drawer and can be closed`, async t => {
    const settings = core.useSettingStore.getState().settings
    core.useSettingStore.setState({ settings: { ...settings, app: { ...settings.app, layout } } })
    const app = runtime()
    app.session.setState({ userInfo: { id: 71, username: 'notifications-test' } })
    setTabs(['/dashboard'])
    let dispose
    t.after(async () => {
      await act(async () => {
        for (const root of roots.splice(0)) root.unmount()
        dispose?.()
      })
      core.useSettingStore.setState({ settings })
    })
    const container = await mount(
      React.createElement(
        core.RuntimeContext.Provider,
        { value: app },
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/dashboard'] },
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { path: '/', element: React.createElement(core.AppLayout) },
              React.createElement(Route, {
                path: 'dashboard',
                element: React.createElement('div', null, 'notification-page'),
              }),
            ),
          ),
        ),
      ),
    )
    const trigger = container.querySelector('[data-slot="notifications-trigger"]')
    assert.ok(trigger)
    await act(async () => trigger.click())
    const drawer = document.querySelector('[role="dialog"]')
    assert.ok(drawer)
    assert.match(drawer.textContent, /暂无通知/)
    assert.equal(drawer.querySelector('[data-slot="sheet-footer"]'), null)
    await act(async () => {
      dispose = core.shellSlots.register({
        id: 'test.notifications',
        slot: 'notifications',
        match: pathname => pathname === '/dashboard',
        component: ({ pathname, userId }) =>
          React.createElement('p', { 'data-notification-extension': '' }, `${userId}:${pathname}`),
      })
    })
    assert.equal(
      drawer.querySelector('[data-slot="notifications-content"] [data-notification-extension]')?.textContent,
      '71:/dashboard',
    )
    assert.doesNotMatch(drawer.textContent, /暂无通知/)
    await act(async () => dispose())
    assert.match(drawer.textContent, /暂无通知/)
    await act(async () => drawer.querySelector('[data-slot="sheet-close"]').click())
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  })
}

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
