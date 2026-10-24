import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, StrictMode } from 'react'

const dom = new Window({
  url: 'http://localhost',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
for (const key of [
  'window',
  'document',
  'localStorage',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'Element',
  'Node',
  'NodeFilter',
  'DocumentFragment',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
  'FocusEvent',
  'CustomEvent',
  'DOMRect',
  'ShadowRoot',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.__feishuRouterEnv = { VITE_APP_ROUTE_MODE: 'history', VITE_APP_ROOT_BASE: '/' }
const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const output = await build({
  stdin: {
    contents: `export { AppRouter } from '@/router';
export { FeishuAccountBindings } from '../src/modules/feishu/binding/views/components/feishu-account-bindings';
export { ConnectionFormDialog } from '../src/modules/feishu/connection/views/components/connection-form-dialog';
export { setFixture, runtime } from 'feishu-test-fixture';
export { RuntimeContext } from '@/provider/runtime/context';
import { createAppRuntime } from '../src/app/runtime/create-runtime';
import { createElement } from 'react';
import FeishuCallbackPage from '../src/modules/feishu/login/views/components/FeishuCallbackPage';
import { runtime } from 'feishu-test-fixture';
Object.assign(runtime, createAppRuntime({ storage: window.localStorage, staticRoutes: [
 { name: 'dashboard', path: '/dashboard', element: createElement('p', null, '仪表盘') },
 { name: 'account', path: '/uc/account', element: createElement('p', null, '账号设置页') },
] }));
runtime.publicRoutes.register({ id: 'feishu:callback', name: 'feishu-callback', path: '/login/feishu/callback', element: createElement(FeishuCallbackPage) });
runtime.settings.getState().setSettings({ dashboardPage: { name: 'dashboard', path: '/dashboard', title: '仪表盘', enable: true } });
`,
    resolveDir: fileURLToPath(new URL('.', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.env': 'globalThis.__feishuRouterEnv' },
  plugins: [
    {
      name: 'feishu-ui-fixture',
      setup(builder) {
        builder.onResolve({ filter: /^(react|react\/jsx-runtime|react-router-dom)$/ }, args => ({
          path: args.path,
          external: true,
        }))
        builder.onResolve(
          {
            filter:
              /^(feishu-test-fixture|@\/(provider\/(session|navigation|plugins|http)|components\/reui\/use-toast))$/,
          },
          () => ({ path: 'fixture', namespace: 'feishu-fixture' }),
        )
        builder.onLoad({ filter: /.*/, namespace: 'feishu-fixture' }, () => ({
          contents: `
      let fixture;
      export function setFixture(value) { fixture = value; runtime.session.setState(value.user); Object.assign(runtime.http, { get: (...args) => fixture.http("get", ...args), post: (...args) => fixture.http("post", ...args), delete: (...args) => fixture.http("delete", ...args) }) }
      export const useSessionStore = selector => selector(fixture.user);
      const menus = { menus: [], initialized: true, loading: false, unauthorized: false, clearMenus() {} };
      export const useNavigationStore = selector => selector(menus);
      export const runtime = {};
      export function setRoutes(routes) { runtime.routes = routes }
      const plugins = { plugins: [], callHooks: async () => {} };
      export const usePluginStore = Object.assign(selector => selector(plugins), { getState: () => plugins });
      export const toast = Object.assign(message => fixture.messages.push(message), { success: message => fixture.messages.push(message), error: message => fixture.messages.push(message) });
      export const useToast = () => ({ toast });
      export default { get: (...args) => fixture.http('get', ...args), post: (...args) => fixture.http('post', ...args), delete: (...args) => fixture.http('delete', ...args) };
    `,
        }))
        builder.onResolve({ filter: /^@\/(layouts|modules)(\/|$)/ }, args =>
          args.path.startsWith('@/modules/feishu/') || args.path.startsWith('@/layouts/')
            ? undefined
            : { path: args.path, namespace: 'feishu-pages' },
        )
        builder.onLoad({ filter: /.*/, namespace: 'feishu-pages' }, args => ({
          contents:
            args.path === '@/layouts'
              ? "export { Outlet as default } from 'react-router-dom'"
              : `import { createElement } from 'react'; export default () => createElement('p', null, ${JSON.stringify(args.path.includes('account-settings') ? '账号设置页' : args.path.includes('/auth/') ? '登录页' : '测试页面')})`,
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', output.outputFiles[0].text)(compiled, compiled.exports, require)
const { AppRouter, FeishuAccountBindings, ConnectionFormDialog, setFixture, RuntimeContext, runtime } = compiled.exports
const response = data => ({ data: { code: 200, data } })
const ticket = 'a'.repeat(64)

function fixture({ token = '', http = async () => response({ result_code: 'FEISHU_LOGIN_STATE_INVALID' }) } = {}) {
  const calls = []
  const messages = []
  const tokens = []
  const user = {
    token,
    sessionVersion: 1,
    initialized: true,
    loading: false,
    error: null,
    userInfo: { id: 7 },
    roles: [],
    permissions: [],
    hydrate: async () => {},
    logout: async () => {},
  }
  user.loginWithTokens = async value => {
    tokens.push(value)
    user.token = value.access_token
    runtime.session.setState({ token: value.access_token })
  }
  setFixture({
    user,
    messages,
    http: async (...args) => {
      calls.push(args)
      return http(...args)
    },
  })
  return { calls, messages, tokens }
}

async function mount(t, element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
    Object.defineProperty(dom, 'opener', { configurable: true, value: null })
    await dom.happyDOM.abort()
  })
  await act(async () =>
    root.render(createElement(StrictMode, null, createElement(RuntimeContext.Provider, { value: runtime }, element))),
  )
  return container
}

function button(container, text) {
  return [...container.querySelectorAll('button')].find(item => item.textContent.trim() === text)
}

async function click(element) {
  assert.ok(element, '应找到按钮')
  await act(async () => element.click())
}

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

for (const mode of ['history', 'hash']) {
  test(`${mode} 路由中已登录用户仍能访问公开回调，严格模式下绑定票据只交换一次`, async t => {
    globalThis.__feishuRouterEnv.VITE_APP_ROUTE_MODE = mode
    dom.history.replaceState(null, '', `${mode === 'hash' ? '/#' : ''}/login/feishu/callback?feishu_ticket=${ticket}`)
    const f = fixture({
      token: 'existing-token',
      http: async (method, url) => {
        assert.equal(method, 'post')
        assert.equal(url, '/admin/feishu/binding/exchange')
        return response({ result_code: 'FEISHU_BIND_SUCCESS' })
      },
    })
    const container = await mount(t, createElement(AppRouter))
    assert.match(container.textContent, /账号设置页/)
    assert.equal(f.calls.length, 1)
    assert.deepEqual(f.tokens, [])
    assert.doesNotMatch(dom.location.href, /feishu_ticket/)
  })
}

test('登录回调使用统一票据交换并跳转，绑定票据不会被当成 JWT', async t => {
  globalThis.__feishuRouterEnv.VITE_APP_ROUTE_MODE = 'history'
  dom.history.replaceState(null, '', `/login/feishu/callback?feishu_ticket=${ticket}`)
  const tokenResult = { access_token: 'new-access', refresh_token: 'new-refresh', expire_at: 3600 }
  const f = fixture({
    http: async (method, url) => {
      assert.equal(url, '/admin/passport/feishu/exchange')
      return response({ result_code: 'FEISHU_LOGIN_SUCCESS', tokens: tokenResult })
    },
  })
  const container = await mount(t, createElement(AppRouter))
  assert.match(container.textContent, /仪表盘/)
  assert.deepEqual(f.tokens, [tokenResult])
  assert.equal(f.calls.length, 1)
})

test('弹窗回调只交回一次短期票据并清除地址，不在弹窗中交换', async t => {
  dom.history.replaceState(null, '', `/login/feishu/callback?feishu_ticket=${ticket}`)
  const messages = []
  Object.defineProperty(dom, 'opener', { configurable: true, value: { postMessage: (...args) => messages.push(args) } })
  const f = fixture()
  const container = await mount(t, createElement(AppRouter))
  assert.match(container.textContent, /已返回原窗口/)
  assert.deepEqual(messages, [[{ type: 'biotech-feishu-login-ticket', ticket }, 'http://localhost']])
  assert.equal(f.calls.length, 0)
  assert.doesNotMatch(dom.location.href, /feishu_ticket/)
})

test('绑定页显示真实主体状态，取消不解绑，确认后防重复请求并刷新', async t => {
  let bound = true
  let finish
  const f = fixture({
    token: 'token',
    http: async (method, url) => {
      if (method === 'delete') {
        assert.equal(url, '/admin/feishu/binding/7')
        await new Promise(resolve => {
          finish = resolve
        })
        bound = false
        return response({ updated: true })
      }
      assert.equal(url, '/admin/feishu/binding/list')
      return response([
        {
          id: 7,
          name: '总部主体',
          status: 1,
          is_bound: bound,
          binding_status: bound ? 1 : 3,
          external_name: '飞书用户',
          bound_at: null,
        },
        { id: 8, name: '停用主体', status: 1, is_bound: false, binding_status: 2, external_name: '', bound_at: null },
      ])
    },
  })
  const container = await mount(t, createElement(FeishuAccountBindings, { userId: 7 }))
  assert.match(container.textContent, /总部主体.*已绑定.*飞书用户/s)
  assert.equal(button([...container.querySelectorAll('li')][1], '绑定').disabled, true)
  await click(button(container, '解绑'))
  await click(button(document.querySelector('[role="dialog"]'), '取消'))
  assert.equal(f.calls.filter(call => call[0] === 'delete').length, 0)
  await click(button(container, '解绑'))
  const confirmation = button(document.querySelector('[role="dialog"]'), '确认解绑')
  await act(async () => {
    confirmation.click()
    confirmation.click()
  })
  assert.equal(f.calls.filter(call => call[0] === 'delete').length, 1)
  await act(async () => finish())
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match([...container.querySelectorAll('li')][0].textContent, /未绑定/)
  assert.deepEqual(f.messages, ['飞书账号已解绑'])
})

test('绑定状态加载失败可重试，解绑失败保留确认窗口', async t => {
  let attempts = 0
  const f = fixture({
    token: 'token',
    http: async method => {
      if (method === 'delete') throw new Error('网络错误')
      if (++attempts <= 2) throw new Error('网络错误')
      return response([
        { id: 7, name: '总部', status: 1, is_bound: true, binding_status: 1, external_name: '', bound_at: null },
      ])
    },
  })
  const container = await mount(t, createElement(FeishuAccountBindings, { userId: 7 }))
  assert.match(container.textContent, /绑定状态读取失败/)
  await click(button(container, '重试'))
  await click(button(container, '解绑'))
  await click(button(document.querySelector('[role="dialog"]'), '确认解绑'))
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.match(f.messages[0], /解绑失败/)
})

test('账号绑定弹窗只使用当前账号绑定接口，成功后刷新真实状态', async t => {
  const previousOpen = dom.open
  const popup = {
    closed: false,
    location: { href: '' },
    focus() {},
    close() {
      this.closed = true
    },
  }
  dom.open = () => popup
  t.after(() => {
    dom.open = previousOpen
  })
  let bound = false
  const f = fixture({
    token: 'existing-token',
    http: async (method, url) => {
      if (method === 'get')
        return response([
          {
            id: 7,
            name: '总部',
            status: 1,
            is_bound: bound,
            binding_status: bound ? 1 : null,
            external_name: '',
            bound_at: null,
          },
        ])
      if (url === '/admin/feishu/binding/7/authorize')
        return response({ url: 'https://accounts.feishu.cn/authorize', state: 'state' })
      assert.equal(url, '/admin/feishu/binding/exchange')
      bound = true
      return response({ result_code: 'FEISHU_BIND_SUCCESS' })
    },
  })
  const container = await mount(t, createElement(FeishuAccountBindings, { userId: 7 }))
  await click(button(container, '绑定'))
  assert.equal(popup.location.href, 'https://accounts.feishu.cn/authorize')
  await act(async () =>
    dom.dispatchEvent(
      new dom.MessageEvent('message', {
        origin: 'http://localhost',
        source: popup,
        data: { type: 'biotech-feishu-login-ticket', ticket },
      }),
    ),
  )
  assert.match(container.textContent, /已绑定/)
  assert.deepEqual(
    f.calls.filter(call => call[0] === 'post').map(call => call[1]),
    ['/admin/feishu/binding/7/authorize', '/admin/feishu/binding/exchange'],
  )
  assert.deepEqual(f.tokens, [])
  assert.equal(popup.closed, true)
})

test('连接表单真实开关提交布尔能力配置，编辑时空凭据保持不变', async t => {
  fixture()
  const values = []
  const connection = {
    id: 7,
    name: '总部',
    tenant_key: '',
    app_id: 'cli_one',
    app_secret_configured: true,
    base_url: 'https://open.feishu.cn',
    redirect_uri: 'https://api.example.com/admin/passport/feishu/callback',
    status: 2,
    notification_enabled: false,
    notification_chat_id: 'oc_group',
    is_default_notification: false,
    event_enabled: false,
    event_verification_token_configured: true,
    event_encrypt_key_configured: true,
  }
  await mount(
    t,
    createElement(ConnectionFormDialog, {
      open: true,
      connection,
      onClose() {},
      onSave: async (current, input) => {
        values.push(input)
        return true
      },
    }),
  )
  const dialog = document.querySelector('[role="dialog"]')
  const switches = [...dialog.querySelectorAll('[role="switch"]')]
  assert.equal(switches.length, 3)
  for (const control of switches) await click(control)
  await click(button(dialog, '保存'))
  assert.equal(values.length, 1)
  assert.equal(values[0].notification_enabled, true)
  assert.equal(values[0].event_enabled, true)
  assert.equal(values[0].is_default_notification, true)
  assert.equal('app_secret' in values[0], false)
  assert.equal('event_encrypt_key' in values[0], false)
  assert.equal('event_verification_token' in values[0], false)
})
