import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { after, afterEach, beforeEach, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'

const require = createRequire(import.meta.url)
const window = new Window({
  url: 'http://localhost/',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
Object.defineProperty(window, 'opener', { value: null, writable: true, configurable: true })
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
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'ShadowRoot',
  'DocumentFragment',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'FormData',
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
const { MemoryRouter, useLocation } = require('react-router-dom')
const { createStore } = require('zustand/vanilla')
const fixtures = {
  website: 'export const getWebsiteLoginConfig = signal => globalThis.__loginTest.website(signal)',
  exchange: 'export const exchangeLoginTicket = ticket => globalThis.__loginTest.exchange(ticket)',
  toast: 'export const useToast = () => ({ toast: globalThis.__loginTest.toast })',
  icon: 'export const Icon = () => null',
  captcha: `import { createElement, useImperativeHandle } from 'react';
    export function VerifyCode({ ref }) {
      useImperativeHandle(ref, () => ({ checkResult: value => value === 'abcd', refresh() {} }), []);
      return createElement('span', { 'data-captcha': true }, 'Synthetic captcha');
    }`,
  dialog: `import { createElement } from 'react';
    export function FeishuLoginDialog({ onResult, onOpenChange }) {
      return createElement('button', { type: 'button', 'data-confirm-feishu': true, onClick: () => {
        onOpenChange(false); void onResult(globalThis.__loginTest.dialogResult);
      } }, 'Confirm synthetic authorization');
    }`,
}
const result = await build({
  stdin: {
    contents: `
      export { default as LoginPage } from './src/modules/base/auth/views/index';
      export { registerLoginPageConfig, getLoginPageConfig, normalizeWebsiteLoginConfig } from './src/modules/base/auth/data/website';
      export { loginPageConfig } from './src/app/branding';
      export { FeishuLoginExtension } from './src/modules/feishu/login/components/FeishuLoginExtension';
      export { RuntimeContext } from './src/provider/runtime/context';
      export { registerShellSlot } from './src/layouts/slots';
      export { localeRegistry } from './src/provider/i18n/registry';
      export { authLocaleMessages } from './src/modules/base/auth/locales';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: { 'import.meta.env': '{"VITE_APP_STORAGE_PREFIX":"login_test_"}', 'import.meta.hot': 'undefined' },
  plugins: [
    {
      name: 'isolated-login-ports',
      setup(builder) {
        builder.onResolve(
          { filter: /website$|api\/login$|use-toast$|verify-code$|FeishuLoginDialog$|^@iconify\/react$/ },
          args => {
            const resolved = path.resolve(args.resolveDir, args.path)
            let key
            if (resolved.endsWith('/base/auth/api/website')) key = 'website'
            else if (resolved.endsWith('/feishu/login/api/login')) key = 'exchange'
            else if (args.path.endsWith('/use-toast')) key = 'toast'
            else if (args.path.endsWith('/verify-code')) key = 'captcha'
            else if (args.path.endsWith('/FeishuLoginDialog')) key = 'dialog'
            else if (args.path === '@iconify/react') key = 'icon'
            return key ? { path: key, namespace: 'login-fixture' } : undefined
          },
        )
        builder.onLoad({ filter: /.*/, namespace: 'login-fixture' }, args => ({
          contents: fixtures[args.path],
          resolveDir: process.cwd(),
        }))
      },
    },
  ],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
core.localeRegistry.register({
  id: 'login-test.ui',
  locale: 'zh_CN',
  namespace: 'app',
  messages: core.authLocaleMessages.zh_CN,
})
const disposers = []
const roots = []
let session
let events

beforeEach(() => {
  events = { passwords: [], tokens: [], tickets: [], notices: [] }
  globalThis.__loginTest = {
    website: async () => ({ data: { data: {} } }),
    exchange: async ticket => {
      events.tickets.push(ticket)
      return {
        data: {
          data: {
            result_code: 'FEISHU_LOGIN_SUCCESS',
            tokens: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' },
          },
        },
      }
    },
    dialogResult: {
      result_code: 'FEISHU_LOGIN_SUCCESS',
      tokens: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' },
    },
    toast: (...notice) => events.notices.push(notice),
  }
  session = createStore(() => ({
    login: async values => {
      events.passwords.push(values)
    },
    loginWithTokens: async tokens => {
      events.tokens.push(tokens)
    },
  }))
})
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
    for (const dispose of disposers.splice(0).reverse()) dispose()
  })
  document.body.replaceChildren()
  window.opener = null
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
  delete globalThis.__loginTest
})

function Location() {
  const location = useLocation()
  return React.createElement('output', { 'data-location': true }, location.pathname + location.search)
}
async function mount(route = '/login', strict = false) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const content = React.createElement(
    core.RuntimeContext.Provider,
    { value: { session } },
    React.createElement(
      MemoryRouter,
      { initialEntries: [route] },
      React.createElement(core.LoginPage),
      React.createElement(Location),
    ),
  )
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content))
  return container
}
function registerFeishu() {
  disposers.push(
    core.registerShellSlot({ id: 'test.feishu', slot: 'auth.methods', component: core.FeishuLoginExtension }),
  )
}
async function input(container, name, value) {
  const element = container.querySelector(`input[name="${name}"]`)
  assert.ok(element, name)
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value)
    element.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}

test('a developer shortcut mounts in the existing form and disposal removes the shortcut area', async () => {
  const container = await mount()
  const form = container.querySelector('form')
  assert.doesNotMatch(container.textContent, /或者继续/)
  let dispose
  await act(async () => {
    dispose = core.registerShellSlot({
      id: 'developer.shortcut',
      slot: 'auth.methods',
      component: ({ disabled }) =>
        React.createElement('button', { type: 'button', disabled, 'data-shortcut': true }, 'Developer login'),
    })
    disposers.push(dispose)
  })
  assert.equal(container.querySelector('form'), form)
  assert.ok(form.querySelector('[data-shortcut]'))
  assert.match(container.textContent, /或者继续/)
  await act(async () => form.querySelector('[data-shortcut]').click())
  assert.equal(events.passwords.length, 0)
  await act(async () => dispose())
  assert.equal(form.querySelector('[data-shortcut]'), null)
  assert.doesNotMatch(container.textContent, /或者继续/)
})

test('application branding uses the shared page, preserves the video, black copy and ICP link, and falls back on API failure', async () => {
  globalThis.__loginTest.website = async () => {
    throw new Error('Synthetic config unavailable')
  }
  const dispose = core.registerLoginPageConfig(core.loginPageConfig)
  disposers.push(dispose)
  const container = await mount()
  const { branding } = core.loginPageConfig
  assert.equal(container.querySelector('video').getAttribute('src'), branding.video_url)
  assert.match(container.querySelector('[aria-label="品牌展示区域"]').textContent, new RegExp(branding.headline))
  const icp = container.querySelector('a[href="https://beian.miit.gov.cn/"]')
  assert.equal(icp.textContent, branding.icp_number)
  assert.equal(icp.target, '_blank')
  assert.ok(icp.closest('.text-black'))
  assert.equal(container.querySelector('input[name="username"]').type, 'email')
  assert.equal(container.querySelectorAll('h1').length, 1)
  const normalized = core.normalizeWebsiteLoginConfig(
    { logo_url: 'javascript:invalid', headline: 'Updated headline' },
    branding,
  )
  assert.equal(normalized.logo_url, branding.logo_url)
  assert.equal(normalized.headline, 'Updated headline')
  dispose()
  assert.equal(core.getLoginPageConfig().branding.site_name, 'MineAdmin')
})

test('password submission retains its contract and disables login shortcuts while pending', async () => {
  registerFeishu()
  let finish
  session.setState({
    login: values => {
      events.passwords.push(values)
      return new Promise(resolve => {
        finish = resolve
      })
    },
  })
  const container = await mount('/login?redirect=%2Fproduct%2Flist')
  await input(container, 'username', 'reader@example.test')
  await input(container, 'password', 'synthetic-password')
  await input(container, 'code', 'abcd')
  await act(async () => container.querySelector('form').requestSubmit())
  assert.deepEqual(events.passwords, [
    { username: 'reader@example.test', password: 'synthetic-password', code: 'abcd' },
  ])
  const shortcut = [...container.querySelectorAll('button')].find(button => button.textContent.includes('使用飞书登录'))
  assert.equal(shortcut.disabled, true)
  await act(async () => finish())
  assert.equal(container.querySelector('[data-location]').textContent, '/product/list')
})

test('the application uses the shortcut slot to complete popup login through the injected session', async () => {
  registerFeishu()
  const container = await mount('/login?redirect=%2Fproduct%2Flist')
  const shortcut = [...container.querySelectorAll('button')].find(button => button.textContent.includes('使用飞书登录'))
  assert.equal(shortcut.type, 'button')
  await act(async () => shortcut.click())
  await act(async () => container.querySelector('[data-confirm-feishu]').click())
  assert.deepEqual(events.tokens, [globalThis.__loginTest.dialogResult.tokens])
  assert.equal(events.passwords.length, 0)
  assert.equal(container.querySelector('[data-location]').textContent, '/product/list')
})

test('a redirected Feishu ticket is consumed once under StrictMode and removed from the address', async () => {
  registerFeishu()
  const ticket = 'a'.repeat(64)
  const container = await mount(`/login?redirect=%2Fproduct%2Flist&feishu_ticket=${ticket}`, true)
  assert.deepEqual(events.tickets, [ticket])
  assert.equal(events.tokens.length, 1)
  assert.equal(container.querySelector('[data-location]').textContent, '/product/list')
})

test('an expired Feishu ticket leaves a retryable shortcut without signing in', async () => {
  registerFeishu()
  globalThis.__loginTest.exchange = async () => {
    throw new Error('Synthetic expired ticket')
  }
  const container = await mount(`/login?feishu_ticket=${'b'.repeat(64)}`)
  assert.equal(events.tokens.length, 0)
  assert.match(events.notices[0][0], /已失效/)
  assert.equal(container.querySelector('[data-location]').textContent, '/login')
  assert.equal(
    [...container.querySelectorAll('button')].find(button => button.textContent.includes('使用飞书登录')).disabled,
    false,
  )
})

test('ticket exchange disables the shortcut until a pending authorization result has been handled', async () => {
  registerFeishu()
  let finish
  globalThis.__loginTest.exchange = () =>
    new Promise(resolve => {
      finish = resolve
    })
  const container = await mount(`/login?feishu_ticket=${'d'.repeat(64)}`)
  const shortcut = [...container.querySelectorAll('button')].find(button => button.textContent.includes('使用飞书登录'))
  assert.equal(shortcut.disabled, true)
  assert.match(container.querySelector('[role="status"]').textContent, /正在确认/)
  await act(async () => finish({ data: { data: { result_code: 'FEISHU_LOGIN_PENDING' } } }))
  assert.equal(shortcut.disabled, false)
  assert.equal(events.tokens.length, 0)
  assert.equal(events.notices[0][1], 'info')
})

test('a popup forwards its ticket to its opener without exchanging it in the popup', async () => {
  registerFeishu()
  const messages = []
  window.opener = { postMessage: (...args) => messages.push(args) }
  const ticket = 'c'.repeat(64)
  await mount(`/login?feishu_ticket=${ticket}`)
  assert.equal(events.tickets.length, 0)
  assert.equal(events.tokens.length, 0)
  assert.equal(messages[0][0].ticket, ticket)
  assert.equal(messages[0][1], 'http://localhost')
})
